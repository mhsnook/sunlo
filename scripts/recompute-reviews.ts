/**
 * Recompute FSRS state for every review in the database.
 *
 * Why this script exists
 * ----------------------
 * A scheduling bug let some reviews land with incorrect difficulty/stability/
 * retrievability values. The scores and timestamps in `user_card_review` are
 * the ground truth — this script treats those as authoritative and re-derives
 * every review's FSRS state by replaying the chain from the top using the
 * same `calculateFSRS()` function the app uses at review time.
 *
 * How it works
 * ------------
 * 1. Fetches distinct user IDs from `user_deck` (small table).
 * 2. Processes users in batches (default 50). For each batch, loads all
 *    reviews for those users, groups into per-card chains, replays FSRS,
 *    applies or records corrections, then releases the batch's data.
 * 3. For each chain, sorted by `created_at` ASC:
 *    - Phase-1 reviews (`day_first_review = true`) feed the scheduling chain.
 *      The *recomputed* difficulty/stability from step N is threaded into
 *      step N+1 as `previousReview`.
 *    - Phase-3 reviews (`day_first_review = false`) copy their FSRS values
 *      directly from the same-session phase-1 review's recomputed values.
 *      The phase-3 row itself never feeds scheduling — it's tracking-only
 *      (see readme/review-interface-flow-logic.md:11) — so carrying the
 *      same-session phase-1 values forward is the most meaningful snapshot.
 * 4. Compares each recomputed row to what's stored. Rows that drift beyond
 *    `EPSILON` are recorded for update.
 *
 * Because the card's `last_reviewed_at`, `difficulty`, and `stability` are
 * projected from the latest review by the `user_card_plus` view (see
 * supabase/schemas/base.sql:1677-1754), fixing the reviews is sufficient —
 * the cards collection will reflect corrected values on next refetch.
 *
 * Usage
 * -----
 *   tsx --tsconfig scripts/tsconfig.json scripts/recompute-reviews.ts               # dry-run, prints summary + samples
 *   tsx --tsconfig scripts/tsconfig.json scripts/recompute-reviews.ts --apply       # writes the corrections
 *   tsx --tsconfig scripts/tsconfig.json scripts/recompute-reviews.ts --uid <uuid>  # limit to one user
 *   tsx --tsconfig scripts/tsconfig.json scripts/recompute-reviews.ts --verbose     # print every diff
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env (bypasses RLS for full access).
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { calculateFSRS, type Score } from '@/features/review/fsrs'
import {
	CardReviewSchema,
	type CardReviewType,
} from '@/features/review/schemas'

const EPSILON = 1e-4
const USER_BATCH_SIZE = 50
const WRITE_CONCURRENCY = 50

type Supabase = ReturnType<typeof createClient<Database>>

interface Args {
	apply: boolean
	uid?: string
	verbose: boolean
}

type ReviewUpdate = {
	id: string
	newDifficulty: number
	newStability: number
	newRetrievability: number | null
}

type FsrsSnapshot = {
	difficulty: number
	stability: number
	retrievability: number | null
}

type IntegrityWarning = {
	chainKey: string
	daySession: string
	message: string
	reviewIds: string[]
}

interface BatchResult {
	updates: ReviewUpdate[]
	warnings: IntegrityWarning[]
	reviewCount: number
	chainCount: number
	chainsWithDrift: number
}

function parseArgs(): Args {
	const argv = process.argv.slice(2)
	const uidIdx = argv.indexOf('--uid')
	return {
		apply: argv.includes('--apply'),
		verbose: argv.includes('--verbose'),
		uid: uidIdx >= 0 ? argv[uidIdx + 1] : undefined,
	}
}

const fmtNum = (n: number | null | undefined) =>
	n === null || n === undefined ? 'null' : n.toFixed(4)

function drift(stored: CardReviewType, computed: FsrsSnapshot): number {
	const d = Math.abs((stored.difficulty ?? 0) - computed.difficulty)
	const s = Math.abs((stored.stability ?? 0) - computed.stability)
	const storedR = stored.review_time_retrievability
	const computedR = computed.retrievability
	let r = 0
	if (storedR === null && computedR === null) r = 0
	else if (storedR === null || computedR === null) r = Infinity
	else r = Math.abs(storedR - computedR)
	return Math.max(d, s, r)
}

// --- Data loading (sequential pagination is inherent) ---

async function fetchUserIds(
	supabase: Supabase,
	uidFilter?: string
): Promise<string[]> {
	if (uidFilter) return [uidFilter]
	const uids = new Set<string>()
	const pageSize = 1000
	let from = 0
	// eslint-disable-next-line no-constant-condition
	while (true) {
		// eslint-disable-next-line no-await-in-loop
		const { data, error } = await supabase
			.from('user_deck')
			.select('uid')
			.range(from, from + pageSize - 1)
		if (error) throw error
		if (!data || data.length === 0) break
		for (const r of data) uids.add(r.uid)
		if (data.length < pageSize) break
		from += pageSize
	}
	return [...uids].toSorted()
}

async function loadReviewsForUsers(
	supabase: Supabase,
	uids: string[]
): Promise<CardReviewType[]> {
	const all: CardReviewType[] = []
	const pageSize = 1000
	let from = 0
	// eslint-disable-next-line no-constant-condition
	while (true) {
		// eslint-disable-next-line no-await-in-loop
		const { data, error } = await supabase
			.from('user_card_review')
			.select('*')
			.in('uid', uids)
			.order('created_at', { ascending: true })
			.range(from, from + pageSize - 1)
		if (error) throw error
		if (!data || data.length === 0) break
		all.push(...data.map((row) => CardReviewSchema.parse(row)))
		if (data.length < pageSize) break
		from += pageSize
	}
	return all
}

// --- Chain processing (pure, no I/O) ---

function chainKey(r: CardReviewType): string {
	return `${r.uid}::${r.lang}::${r.phrase_id}::${r.direction}`
}

function checkChainIntegrity(
	key: string,
	chain: CardReviewType[]
): IntegrityWarning[] {
	const warnings: IntegrityWarning[] = []

	const phase1BySession = new Map<string, CardReviewType[]>()
	for (const r of chain) {
		if (!r.day_first_review) continue
		const existing = phase1BySession.get(r.day_session)
		if (existing) existing.push(r)
		else phase1BySession.set(r.day_session, [r])
	}

	for (const [session, reviews] of phase1BySession) {
		if (reviews.length > 1) {
			warnings.push({
				chainKey: key,
				daySession: session,
				message: `${reviews.length} phase-1 reviews in one session (expected 1)`,
				reviewIds: reviews.map((r) => r.id),
			})
		}
	}

	for (const r of chain) {
		if (r.day_first_review) continue
		if (!phase1BySession.has(r.day_session)) {
			warnings.push({
				chainKey: key,
				daySession: r.day_session,
				message: `orphaned phase-3 review (no phase-1 in session)`,
				reviewIds: [r.id],
			})
		}
	}

	for (const r of chain) {
		if (r.score < 1 || r.score > 4) {
			warnings.push({
				chainKey: key,
				daySession: r.day_session,
				message: `invalid score ${r.score} (expected 1-4)`,
				reviewIds: [r.id],
			})
		}
	}

	return warnings
}

function recomputeChain(chain: CardReviewType[]): ReviewUpdate[] {
	const sorted = chain.toSorted((a, b) =>
		a.created_at.localeCompare(b.created_at)
	)

	const phase1BySession = new Map<string, FsrsSnapshot>()
	const updates: ReviewUpdate[] = []
	let lastCorrected: CardReviewType | undefined

	for (const review of sorted) {
		if (!review.day_first_review) continue

		const fsrs = calculateFSRS({
			score: review.score as Score,
			previousReview: lastCorrected,
			currentTime: new Date(review.created_at),
		})

		if (drift(review, fsrs) > EPSILON) {
			updates.push({
				id: review.id,
				newDifficulty: fsrs.difficulty,
				newStability: fsrs.stability,
				newRetrievability: fsrs.retrievability,
			})
		}

		phase1BySession.set(review.day_session, {
			difficulty: fsrs.difficulty,
			stability: fsrs.stability,
			retrievability: fsrs.retrievability,
		})

		lastCorrected = {
			...review,
			difficulty: fsrs.difficulty,
			stability: fsrs.stability,
			review_time_retrievability: fsrs.retrievability,
		}
	}

	for (const review of sorted) {
		if (review.day_first_review) continue
		const target = phase1BySession.get(review.day_session)
		if (!target) continue

		if (drift(review, target) > EPSILON) {
			updates.push({
				id: review.id,
				newDifficulty: target.difficulty,
				newStability: target.stability,
				newRetrievability: target.retrievability,
			})
		}
	}

	return updates
}

function processBatchReviews(reviews: CardReviewType[]): BatchResult {
	const chains = new Map<string, CardReviewType[]>()
	for (const r of reviews) {
		const k = chainKey(r)
		const existing = chains.get(k)
		if (existing) existing.push(r)
		else chains.set(k, [r])
	}

	const updates: ReviewUpdate[] = []
	const warnings: IntegrityWarning[] = []
	let chainsWithDrift = 0

	for (const [key, chain] of chains) {
		warnings.push(...checkChainIntegrity(key, chain))
		const chainUpdates = recomputeChain(chain)
		if (chainUpdates.length > 0) chainsWithDrift++
		updates.push(...chainUpdates)
	}

	return {
		updates,
		warnings,
		reviewCount: reviews.length,
		chainCount: chains.size,
		chainsWithDrift,
	}
}

// --- Writes (parallelized in chunks) ---

async function applyUpdates(
	supabase: Supabase,
	updates: ReviewUpdate[],
	now: string
): Promise<void> {
	for (let i = 0; i < updates.length; i += WRITE_CONCURRENCY) {
		const chunk = updates.slice(i, i + WRITE_CONCURRENCY)
		// eslint-disable-next-line no-await-in-loop
		const results = await Promise.all(
			chunk.map((u) =>
				supabase
					.from('user_card_review')
					.update({
						difficulty: u.newDifficulty,
						stability: u.newStability,
						review_time_retrievability: u.newRetrievability,
						updated_at: now,
					})
					.eq('id', u.id)
			)
		)
		for (const { error } of results) {
			if (error) {
				console.error(`  FAILED:`, error.message)
				throw error
			}
		}
	}
}

// --- Output ---

function formatUpdate(u: ReviewUpdate): string {
	return [
		`  ${u.id.slice(0, 8)}`,
		`D→${fmtNum(u.newDifficulty)}`,
		`S→${fmtNum(u.newStability)}`,
		`R→${fmtNum(u.newRetrievability)}`,
	].join('  ')
}

// --- Main ---

async function main(): Promise<void> {
	const args = parseArgs()

	const url = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
	const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
	if (!serviceKey) {
		throw new Error(
			'SUPABASE_SERVICE_ROLE_KEY is required (in .env or inline env) to bypass RLS.'
		)
	}
	const supabase = createClient<Database>(url, serviceKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	})

	const isLocal =
		url.includes('localhost') ||
		url.includes('127.0.0.1') ||
		url.includes('::1')

	console.log(`Mode: ${args.apply ? 'APPLY (writes to DB)' : 'DRY RUN'}`)
	console.log(`Supabase URL: ${url}`)
	console.log(`Target: ${isLocal ? 'LOCAL' : 'REMOTE (likely production)'}`)
	if (args.uid) console.log(`Limiting to uid: ${args.uid}`)
	console.log()

	if (args.apply && !isLocal) {
		console.log(
			'⚠️  About to WRITE to a non-local database. Sleeping 5s — ^C now to abort.'
		)
		await new Promise((r) => setTimeout(r, 5000))
	}

	console.log('Fetching user IDs...')
	const uids = await fetchUserIds(supabase, args.uid)
	const batchCount = Math.ceil(uids.length / USER_BATCH_SIZE)
	console.log(`  ${uids.length} user(s) in ${batchCount} batch(es)\n`)

	const now = new Date().toISOString()
	let totalReviews = 0
	let totalChains = 0
	let totalChainsWithDrift = 0
	let totalUpdates = 0
	let totalApplied = 0
	const allWarnings: IntegrityWarning[] = []
	const sampleDiffs: ReviewUpdate[] = []

	for (let b = 0; b < batchCount; b++) {
		const batch = uids.slice(b * USER_BATCH_SIZE, (b + 1) * USER_BATCH_SIZE)
		process.stdout.write(
			`  batch ${b + 1}/${batchCount}  (${batch.length} users)  `
		)

		// eslint-disable-next-line no-await-in-loop
		const reviews = await loadReviewsForUsers(supabase, batch)
		if (reviews.length === 0) {
			process.stdout.write('0 reviews\n')
			continue
		}

		const result = processBatchReviews(reviews)
		totalReviews += result.reviewCount
		totalChains += result.chainCount
		totalChainsWithDrift += result.chainsWithDrift
		totalUpdates += result.updates.length
		allWarnings.push(...result.warnings)

		process.stdout.write(
			`${result.reviewCount} reviews, ${result.chainCount} chains, ${result.updates.length} drifted`
		)
		if (result.warnings.length > 0) {
			process.stdout.write(`, ${result.warnings.length} warning(s)`)
		}
		process.stdout.write('\n')

		if (args.verbose && result.updates.length > 0) {
			for (const u of result.updates) console.log(formatUpdate(u))
		} else if (sampleDiffs.length < 20) {
			sampleDiffs.push(...result.updates.slice(0, 20 - sampleDiffs.length))
		}

		if (args.apply && result.updates.length > 0) {
			// eslint-disable-next-line no-await-in-loop
			await applyUpdates(supabase, result.updates, now)
			totalApplied += result.updates.length
		}
	}

	if (allWarnings.length > 0) {
		console.log(`\nIntegrity warnings (${allWarnings.length}):`)
		for (const w of allWarnings) {
			console.log(
				`  ${w.chainKey.slice(0, 50)}  session=${w.daySession}  ${w.message}  ids=[${w.reviewIds.map((id) => id.slice(0, 8)).join(', ')}]`
			)
		}
	}

	console.log(`\nSummary`)
	console.log(`  Users processed:         ${uids.length}`)
	console.log(`  Reviews examined:        ${totalReviews}`)
	console.log(`  Chains examined:         ${totalChains}`)
	console.log(`  Chains with drift:       ${totalChainsWithDrift}`)
	console.log(`  Reviews needing update:  ${totalUpdates}`)
	console.log(`  Integrity warnings:      ${allWarnings.length}`)
	if (args.apply) {
		console.log(`  Reviews applied:         ${totalApplied}`)
	}

	if (totalUpdates === 0 && allWarnings.length === 0) {
		console.log('\nNothing to do — every review is already correct.')
		return
	}

	if (!args.apply) {
		if (!args.verbose && sampleDiffs.length > 0) {
			console.log(`\nFirst ${sampleDiffs.length} diffs:`)
			for (const u of sampleDiffs) console.log(formatUpdate(u))
		}
		console.log(
			`\nDry run complete. Re-run with --apply to write ${totalUpdates} corrections.`
		)
	} else {
		console.log('\nDone.')
	}
}

main().catch((err) => {
	console.error('\nError:', err)
	process.exit(1)
})
