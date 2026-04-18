/**
 * Reclassify misclassified phase-1 duplicates as phase-3 re-reviews.
 *
 * Why this script exists
 * ----------------------
 * A historical bug inserted phase-3 re-reviews with `day_first_review = true`
 * instead of updating an existing phase-3 record (or writing `false`). The
 * result is clusters like:
 *
 *   2025-11-06 18:45:47  score=1  day_first_review=true   ← real phase-1
 *   2025-11-06 18:48:29  score=1  day_first_review=true   ← misclassified phase-3
 *   2025-11-06 18:48:36  score=3  day_first_review=true   ← misclassified phase-3
 *
 * The bug is already fixed for new writes (see hooks.ts) but historical rows
 * remain. This script finds every (uid, lang, phrase_id, direction,
 * day_session) group with more than one `day_first_review = true` row, keeps
 * the OLDEST (the genuine phase-1), and flips `day_first_review` to `false`
 * on the rest — reclassifying them as the phase-3 re-reviews they actually
 * were.
 *
 * The flipped rows keep their score and created_at. Their FSRS columns stay
 * as-is until you re-run `recompute-reviews --apply`, which will mirror the
 * oldest phase-1's values onto them (since phase-3 rows now carry the
 * same-session phase-1 snapshot).
 *
 * Recommended flow
 * ----------------
 *   pnpm reclassify-phase1-duplicates          # dry-run
 *   pnpm reclassify-phase1-duplicates --apply  # flip
 *   pnpm recompute-reviews --apply             # re-normalize FSRS chain
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env (bypasses RLS for full access).
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import {
	CardReviewSchema,
	type CardReviewType,
} from '@/features/review/schemas'

const USER_BATCH_SIZE = 50
const WRITE_CONCURRENCY = 50

type Supabase = ReturnType<typeof createClient<Database>>

interface Args {
	apply: boolean
	uid?: string
}

function parseArgs(): Args {
	const argv = process.argv.slice(2)
	const uidIdx = argv.indexOf('--uid')
	return {
		apply: argv.includes('--apply'),
		uid: uidIdx >= 0 ? argv[uidIdx + 1] : undefined,
	}
}

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

async function loadPhase1ReviewsForUsers(
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
			.eq('day_first_review', true)
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

function groupKey(r: CardReviewType): string {
	return `${r.uid}::${r.lang}::${r.phrase_id}::${r.direction}::${r.day_session}`
}

type ReclassifyGroup = {
	key: string
	keep: CardReviewType
	flip: CardReviewType[]
}

function findDuplicateGroups(reviews: CardReviewType[]): ReclassifyGroup[] {
	const groups = new Map<string, CardReviewType[]>()
	for (const r of reviews) {
		const k = groupKey(r)
		const existing = groups.get(k)
		if (existing) existing.push(r)
		else groups.set(k, [r])
	}

	const out: ReclassifyGroup[] = []
	for (const [key, rows] of groups) {
		if (rows.length < 2) continue
		const sorted = rows.toSorted((a, b) => {
			const t = a.created_at.localeCompare(b.created_at)
			return t !== 0 ? t : a.id.localeCompare(b.id)
		})
		out.push({
			key,
			keep: sorted[0],
			flip: sorted.slice(1),
		})
	}
	return out
}

async function flipReviews(supabase: Supabase, ids: string[]): Promise<void> {
	for (let i = 0; i < ids.length; i += WRITE_CONCURRENCY) {
		const chunk = ids.slice(i, i + WRITE_CONCURRENCY)
		// eslint-disable-next-line no-await-in-loop
		const results = await Promise.all(
			chunk.map((id) =>
				supabase
					.from('user_card_review')
					.update({ day_first_review: false })
					.eq('id', id)
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

function formatGroup(g: ReclassifyGroup): string {
	const [uid, lang, pid, dir, session] = g.key.split('::')
	const lines = [
		`\n  ${uid.slice(0, 8)} ${lang}/${pid.slice(0, 8)} ${dir} session=${session}`,
	]
	lines.push(
		`    KEEP   ${g.keep.id.slice(0, 8)}  ${g.keep.created_at}  score=${g.keep.score}`
	)
	for (const r of g.flip) {
		lines.push(
			`    FLIP   ${r.id.slice(0, 8)}  ${r.created_at}  score=${r.score}`
		)
	}
	return lines.join('\n')
}

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

	const allGroups: ReclassifyGroup[] = []
	let totalReviews = 0

	for (let b = 0; b < batchCount; b++) {
		const batch = uids.slice(b * USER_BATCH_SIZE, (b + 1) * USER_BATCH_SIZE)
		process.stdout.write(
			`  batch ${b + 1}/${batchCount}  (${batch.length} users)  `
		)

		// eslint-disable-next-line no-await-in-loop
		const reviews = await loadPhase1ReviewsForUsers(supabase, batch)
		totalReviews += reviews.length

		const groups = findDuplicateGroups(reviews)
		allGroups.push(...groups)

		process.stdout.write(
			`${reviews.length} phase-1 reviews, ${groups.length} duplicate group(s)\n`
		)
	}

	const totalToFlip = allGroups.reduce((sum, g) => sum + g.flip.length, 0)

	if (allGroups.length === 0) {
		console.log('\nNo duplicate groups found — nothing to do.')
		return
	}

	console.log(`\nDuplicate groups (${allGroups.length}):`)
	for (const g of allGroups) console.log(formatGroup(g))

	console.log(`\nSummary`)
	console.log(`  Phase-1 reviews examined: ${totalReviews}`)
	console.log(`  Duplicate groups:         ${allGroups.length}`)
	console.log(`  Reviews to reclassify:    ${totalToFlip}`)

	if (!args.apply) {
		console.log(
			`\nDry run complete. Re-run with --apply to flip ${totalToFlip} reviews to day_first_review=false.`
		)
		console.log(
			`Then run 'pnpm recompute-reviews --apply' to re-normalize the FSRS chain.`
		)
		return
	}

	console.log(`\nFlipping ${totalToFlip} reviews...`)
	const idsToFlip = allGroups.flatMap((g) => g.flip.map((r) => r.id))
	await flipReviews(supabase, idsToFlip)
	console.log('Done.')
	console.log(
		`\nRemember to run 'pnpm recompute-reviews --apply' to re-normalize the FSRS chain.`
	)
}

main().catch((err) => {
	console.error('\nError:', err)
	process.exit(1)
})
