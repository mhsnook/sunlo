#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read --allow-write
/**
 * Dump seed rows — delta since last db reset — directly into the correct seed
 * files.  Optionally shifts every interval in those files backwards so data
 * stays in the past across multiple sessions.
 *
 * Typical workflow
 * ────────────────
 *   supabase db reset          # loads seeds; sets db_meta.seeded_at
 *   # …use the app as various users, creating rows at "now"…
 *   deno run … dump-new-seeds.ts --shift-back 1
 *     → appends new rows to seed-team1/2/public.sql
 *     → shifts every interval in those files back 1 day
 *   # repeat each session: data depth grows naturally
 *
 * Usage:
 *   deno run --allow-env --allow-net --allow-read --allow-write \
 *     scripts/dump-new-seeds.ts [options]
 *
 * Options:
 *   --team <1|2|public>  Only dump rows for that team (default: all)
 *   --tables <t1,t2,…>   Restrict to specific tables
 *   --since <interval>   Override baseline; e.g. "2 days"
 *   --all                No time filter — dump every tracked row
 *   --shift-back <N>     After writing, shift all intervals in seed files back
 *                        N days (integer).  Pass alone to shift without dumping.
 *   --dry-run            Print SQL to stdout instead of writing files; skip shift
 */

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js'

const REPO_ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '')

// Load .env into Deno.env. Using --env-file on the CLI conflicts with the
// Node 22 shim (pnpm's `deno` package), which intercepts --env-file as a
// node flag and tries to open the next token as a filename.
try {
	for (const line of Deno.readTextFileSync(`${REPO_ROOT}/.env`).split('\n')) {
		const s = line.trim()
		if (!s || s.startsWith('#')) continue
		const eq = s.indexOf('=')
		if (eq < 0) continue
		const key = s.slice(0, eq).trim()
		if (Deno.env.has(key)) continue
		let val = s.slice(eq + 1).trim()
		if (/^["'].*["']$/.test(val)) val = val.slice(1, -1)
		Deno.env.set(key, val)
	}
} catch {
	/* .env not present — rely on process environment */
}

// ---------------------------------------------------------------------------
// Team definitions
// ---------------------------------------------------------------------------

const TEAMS = {
	'1': {
		file: 'seed-team1.sql',
		// Actor UIDs — keep in sync with scenetest/actors/default.ts
		uids: new Set([
			'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', // learner (GarlicFace)
			'7ad846a9-d55b-4035-8be2-dbcc70074f74', // friend (Lexigrine)
			'a2dfa256-ef7b-41b0-b05a-d97afab8dd21', // learner2 (Best Frin)
			'a32f65e7-a496-4afc-abd3-798d8e6d9ec5', // learner3 (Work Andy)
			'd4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8', // new-user
		]),
		// Languages this team learns/speaks (phrases/decks/reviews in these langs → team 1)
		langs: new Set(['hin', 'kan', 'ben', 'tam', 'ibo', 'aka']),
	},
	'2': {
		file: 'seed-team2.sql',
		// Actor UIDs — keep in sync with scenetest/actors/team2.ts
		uids: new Set([
			'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18', // learner-t2 (GarlicTongue)
			'27ad846a-d55b-4035-8be2-dbcc70074f74', // friend-t2 (Lexigrande)
			'22dfa256-ef7b-41b0-b05a-d97afab8dd21', // learner2-t2 (Mejor Amigo)
			'2a32f65e-a496-4afc-abd3-798d8e6d9ec5', // learner3-t2 (Office Pierre)
			'2e4e5f6a-7b8c-4d0e-a1f2-b3c4d5e6f7a8', // new-user-t2
		]),
		langs: new Set(['fra', 'spa', 'eus', 'ned', 'deu', 'gsw']),
	},
} as const

type TeamKey = keyof typeof TEAMS

// ---------------------------------------------------------------------------
// Table config
// ---------------------------------------------------------------------------

interface TableCfg {
	table: string
	/** Column used to assign a row to a team.
	 *  - 'lang'  → compare against team.langs
	 *  - anything else → compare against team.uids  */
	partitionCol: string
	/**
	 * When the partition value isn't directly on the row, join through another
	 * table to get it.  e.g. phrase_tag has no lang column; join phrase to get
	 * phrase.lang.
	 */
	joinThrough?: {
		/** PostgREST alias used in select() — becomes row[alias] */
		alias: string
		/** FK column on this table that references the join table */
		fk: string
		/** Column to pull from the joined table */
		col: string
	}
	/** Columns rendered as `now() - interval 'N …'` */
	timestamps: string[]
	/** Columns rendered as `(current_date - N)::date` */
	dates?: string[]
	/**
	 * Map date_col → timestamp_col.  The date value is derived from the
	 * sibling timestamp using the FSRS 4am-cutoff convention:
	 *   day_session = (created_at - 4h)::date
	 */
	dateFromTimestamp?: Record<string, string>
	/**
	 * Route ALL rows to this specific seed file, bypassing team assignment.
	 * Use for shared/meta tables (e.g. 'seed-meta.sql').
	 */
	file?: string
}

const TABLES: TableCfg[] = [
	// ---- shared / meta tables (routed to seed-meta.sql, no team partition) ----
	{
		// no created_at → always dumps all rows; generates ON CONFLICT DO NOTHING
		// so it coexists safely with seed.sql's static language insert
		table: 'language',
		partitionCol: 'lang',
		timestamps: [],
		file: 'seed-meta.sql',
	},
	{
		table: 'tag',
		partitionCol: 'lang',
		timestamps: ['created_at'],
		file: 'seed-meta.sql',
	},

	// ---- parents first: no FK deps on each other ----
	{
		table: 'phrase_request',
		partitionCol: 'lang',
		timestamps: ['created_at', 'updated_at'],
	},
	{
		table: 'phrase',
		partitionCol: 'lang',
		timestamps: ['created_at'],
	},
	{
		table: 'phrase_playlist',
		partitionCol: 'lang',
		timestamps: ['created_at', 'updated_at'],
	},

	// ---- comments (require phrase_request to exist) ----
	{
		table: 'request_comment',
		partitionCol: 'uid',
		timestamps: ['created_at', 'updated_at'],
	},

	// ---- link / join tables (require their parents above) ----
	{
		// phrase_tag has no direct lang column; join phrase to get phrase.lang
		table: 'phrase_tag',
		partitionCol: 'lang',
		joinThrough: { alias: 'phrase', fk: 'phrase_id', col: 'lang' },
		timestamps: ['created_at'],
	},
	{
		table: 'playlist_phrase_link',
		partitionCol: 'uid',
		timestamps: ['created_at'],
	},
	{
		table: 'comment_phrase_link',
		partitionCol: 'uid',
		timestamps: ['created_at'],
	},

	// ---- translations and upvotes ----
	{
		// translation lang = target language, not phrase language — use added_by
		table: 'phrase_translation',
		partitionCol: 'added_by',
		timestamps: ['created_at', 'updated_at'],
	},
	{
		table: 'phrase_request_upvote',
		partitionCol: 'uid',
		timestamps: ['created_at'],
	},
	{
		table: 'phrase_playlist_upvote',
		partitionCol: 'uid',
		timestamps: ['created_at'],
	},
	{
		table: 'comment_upvote',
		partitionCol: 'uid',
		timestamps: ['created_at'],
	},

	// ---- social / activity ----
	{
		table: 'chat_message',
		partitionCol: 'sender_uid',
		timestamps: ['created_at'],
	},
	{
		table: 'friend_request_action',
		partitionCol: 'uid_by',
		timestamps: ['created_at'],
	},
	{
		table: 'notification',
		partitionCol: 'uid',
		timestamps: ['created_at', 'read_at'],
	},
	{
		table: 'admin_user',
		partitionCol: 'uid',
		timestamps: ['created_at'],
	},

	// ---- user data (all uid-partitioned) ----
	{
		table: 'user_profile',
		partitionCol: 'uid',
		timestamps: ['created_at', 'updated_at'],
	},
	{
		table: 'user_deck',
		partitionCol: 'uid',
		timestamps: ['created_at', 'updated_at'],
	},
	{
		table: 'user_card',
		partitionCol: 'uid',
		timestamps: ['created_at', 'updated_at'],
	},
	{
		table: 'user_deck_review_state',
		partitionCol: 'uid',
		timestamps: ['created_at'],
		dates: ['day_session'],
		dateFromTimestamp: { day_session: 'created_at' },
	},
	{
		table: 'user_card_review',
		partitionCol: 'uid',
		timestamps: ['created_at', 'updated_at'],
		dates: ['day_session'],
		dateFromTimestamp: { day_session: 'created_at' },
	},
	{
		table: 'user_client_event',
		partitionCol: 'uid',
		timestamps: ['created_at'],
	},
]

// Tables that exist in the DB but are deliberately excluded from dumping.
// Keep this list up to date so any genuinely new table stands out.
const SKIP_TABLES = new Set([
	// seeding metadata — written by seed.sql itself
	'db_meta',
	// deprecated, no longer used in the app
	'phrase_relation',
	// backfilled by scripts/backfill-search-corpus.ts, not seeded directly
	'search_corpus',
	// views — read-only, PostgREST exposes them but they are never INSERTed
	'feed_activities',
	'friend_summary',
	'meta_language',
	'phrase_meta',
	'phrase_stats',
	'public_profile',
	'user_card_plus',
	'user_deck_plus',
])

// ---------------------------------------------------------------------------
// Timestamp helpers
// ---------------------------------------------------------------------------

function msToInterval(ms: number): string {
	const totalMins = Math.round(ms / 60_000)
	if (totalMins < 60) return `${totalMins} minutes`
	const totalHours = Math.round(ms / 3_600_000)
	if (totalHours < 48) return `${totalHours} hours`
	return `${Math.round(ms / 86_400_000)} days`
}

function fmtTimestamp(isoStr: string | null): string {
	if (isoStr === null) return 'null'
	const ageMs = Date.now() - new Date(isoStr).getTime()
	return `now() - interval '${msToInterval(Math.abs(ageMs))}'`
}

function fmtDate(dateStr: string | null): string {
	if (dateStr === null) return 'null'
	const d = new Date(dateStr + 'T12:00:00Z')
	const now = new Date()
	now.setUTCHours(12, 0, 0, 0)
	const n = Math.round((now.getTime() - d.getTime()) / 86_400_000)
	return n === 0 ? '(current_date)::date' : `(current_date - ${n})::date`
}

function fmtDateFromTimestamp(isoStr: string | null): string {
	if (isoStr === null) return 'null'
	const ageMs = Date.now() - new Date(isoStr).getTime()
	return `(now() - interval '${msToInterval(Math.abs(ageMs))}' - interval '4 hours')::date`
}

// ---------------------------------------------------------------------------
// SQL value formatter
// ---------------------------------------------------------------------------

function fmtValue(
	val: unknown,
	col: string,
	cfg: TableCfg,
	row: Record<string, unknown>
): string {
	if (val === null || val === undefined) return 'null'
	if (cfg.dateFromTimestamp?.[col]) {
		return fmtDateFromTimestamp(
			row[cfg.dateFromTimestamp[col]] as string | null
		)
	}
	if (cfg.dates?.includes(col)) return fmtDate(val as string)
	if (cfg.timestamps.includes(col)) return fmtTimestamp(val as string)
	if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`
	if (typeof val === 'number') return String(val)
	if (typeof val === 'boolean') return val ? 'true' : 'false'
	if (typeof val === 'object')
		return `'${JSON.stringify(val).replace(/'/g, "''")}'`
	return `'${String(val).replace(/'/g, "''")}'`
}

// ---------------------------------------------------------------------------
// INSERT block generator
// ---------------------------------------------------------------------------

function generateInsert(
	table: string,
	rows: Record<string, unknown>[],
	cfg: TableCfg
): string {
	if (rows.length === 0) return ''

	// Strip any joined columns (they're not real columns in the table)
	const clean = rows.map((r) => {
		const row = { ...r }
		if (cfg.joinThrough) delete row[cfg.joinThrough.alias]
		return row
	})

	const cols = Object.keys(clean[0])
	const colList = cols.map((c) => `"${c}"`).join(', ')

	const blocks = clean.map((row) => {
		const vals = cols
			.map((col) => `\t\t${fmtValue(row[col], col, cfg, row)}`)
			.join(',\n')
		return `\t(\n${vals}\n\t)`
	})

	// Tables with no time filter always dump all rows; use ON CONFLICT DO NOTHING
	// so the generated SQL is idempotent and can coexist with static seed inserts.
	const noTimeFilter = cfg.timestamps.length === 0
	const closing = noTimeFilter ? '\non conflict do nothing;' : ';'
	return [
		`--`,
		`-- ${table} (${rows.length} row${rows.length === 1 ? '' : 's'})`,
		`--`,
		`insert into`,
		`\t"public"."${table}" (${colList})`,
		`values`,
		blocks.join(',\n') + closing,
		'',
	].join('\n')
}

// ---------------------------------------------------------------------------
// Partition helper
// ---------------------------------------------------------------------------

function assignBucket(row: Record<string, unknown>, cfg: TableCfg): string {
	if (cfg.file) return cfg.file
	let val: string
	if (cfg.joinThrough) {
		val =
			((row[cfg.joinThrough.alias] as Record<string, unknown>)?.[
				cfg.joinThrough.col
			] as string) ?? ''
	} else {
		val = (row[cfg.partitionCol] as string) ?? ''
	}
	val = val.toLowerCase()

	const isLangPartition =
		cfg.partitionCol === 'lang' || cfg.joinThrough !== undefined
	for (const [teamKey, team] of Object.entries(TEAMS) as [
		TeamKey,
		(typeof TEAMS)[TeamKey],
	][]) {
		const set = isLangPartition ? team.langs : team.uids
		if ((set as Set<string>).has(val)) return teamKey
	}
	return 'public'
}

// ---------------------------------------------------------------------------
// Parse human interval string to ms
// ---------------------------------------------------------------------------

function parseIntervalMs(s: string): number {
	const m = s
		.trim()
		.match(/^(\d+(?:\.\d+)?)\s*(minutes?|hours?|days?|weeks?)$/i)
	if (!m) throw new Error(`Unrecognised interval: "${s}"`)
	const n = parseFloat(m[1])
	const u = m[2].toLowerCase()
	if (u.startsWith('minute')) return n * 60_000
	if (u.startsWith('hour')) return n * 3_600_000
	if (u.startsWith('day')) return n * 86_400_000
	return n * 7 * 86_400_000
}

function unitMs(unit: string): number {
	if (unit.startsWith('minute')) return 60_000
	if (unit.startsWith('hour')) return 3_600_000
	return 86_400_000
}

// ---------------------------------------------------------------------------
// Shift seed files
// ---------------------------------------------------------------------------

async function shiftSeedFiles(shiftDays: number): Promise<void> {
	const shiftMs = shiftDays * 86_400_000
	const targets = [
		...Object.values(TEAMS).map((t) => `${REPO_ROOT}/supabase/${t.file}`),
		`${REPO_ROOT}/supabase/seed-public.sql`,
		`${REPO_ROOT}/supabase/seed-meta.sql`,
	]
	for (const filePath of targets) {
		let text: string
		try {
			text = await Deno.readTextFile(filePath)
		} catch {
			continue // file doesn't exist yet
		}
		// day_session pattern first (more specific — has the trailing - interval '4 hours')
		text = text.replace(
			/\(now\(\) - interval '(\d+) (\w+)' - interval '4 hours'\)::date/g,
			(_, n, unit) =>
				`(now() - interval '${msToInterval(parseInt(n) * unitMs(unit) + shiftMs)}' - interval '4 hours')::date`
		)
		// standalone timestamp
		text = text.replace(
			/now\(\) - interval '(\d+) (\w+)'/g,
			(_, n, unit) =>
				`now() - interval '${msToInterval(parseInt(n) * unitMs(unit) + shiftMs)}'`
		)
		// (current_date - N)::date
		text = text.replace(
			/\(current_date - (\d+)\)::date/g,
			(_, n) => `(current_date - ${parseInt(n) + shiftDays})::date`
		)
		// (current_date)::date — N=0 case produced by fmtDate
		text = text.replace(
			/\(current_date\)::date/g,
			`(current_date - ${shiftDays})::date`
		)
		await Deno.writeTextFile(filePath, text)
		console.error(`-- shifted back ${shiftDays}d: ${filePath}`)
	}
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	const args = [...Deno.args]

	let teamFilter: TeamKey | 'public' | null = null
	let tablesFilter: string[] | null = null
	let sinceOverride: string | null = null
	let allRows = false
	let shiftDays = 0
	let dryRun = false

	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--team' && args[i + 1])
			teamFilter = args[++i] as TeamKey | 'public'
		else if (args[i] === '--tables' && args[i + 1])
			tablesFilter = args[++i].split(',').map((t) => t.trim())
		else if (args[i] === '--since' && args[i + 1]) sinceOverride = args[++i]
		else if (args[i] === '--all') allRows = true
		else if (args[i] === '--shift-back' && args[i + 1])
			shiftDays = parseInt(args[++i])
		else if (args[i] === '--dry-run') dryRun = true
	}

	// --shift-back alone: skip the dump, just shift
	const shiftOnly =
		shiftDays > 0 &&
		args.filter(
			(a) => !['--shift-back', String(shiftDays), '--dry-run'].includes(a)
		).length === 0

	if (shiftOnly) {
		if (!dryRun) await shiftSeedFiles(shiftDays)
		else console.error('-- --dry-run: skipping shift')
		return
	}

	const supabaseUrl =
		Deno.env.get('VITE_SUPABASE_URL') ?? 'http://127.0.0.1:54321'
	const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
	if (!serviceRoleKey) {
		console.error(
			'Error: SUPABASE_SERVICE_ROLE_KEY not set\nRun `supabase status` to get the service role key, or pass it inline:\n  SUPABASE_SERVICE_ROLE_KEY=<key> deno run --env-file --allow-env --allow-net --allow-read --allow-write scripts/dump-new-seeds.ts'
		)
		Deno.exit(1)
	}

	const supabase: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
		auth: { persistSession: false },
	})

	// Determine cutoff timestamp
	let cutoffIso: string | null = null
	if (!allRows) {
		if (!sinceOverride) {
			const { data } = await supabase
				.from('db_meta')
				.select('value')
				.eq('key', 'seeded_at')
				.maybeSingle()
			if (data?.value) {
				cutoffIso = new Date(data.value).toISOString()
				console.error(`-- Baseline: db_meta.seeded_at = ${cutoffIso}`)
			}
		}
		if (!cutoffIso) {
			const fallback = sinceOverride ?? '1 day'
			cutoffIso = new Date(Date.now() - parseIntervalMs(fallback)).toISOString()
			console.error(`-- Baseline: --since ${fallback} → ${cutoffIso}`)
		}
	} else {
		console.error('-- Mode: --all (no time filter)')
	}

	const tables = tablesFilter
		? TABLES.filter((t) => tablesFilter!.includes(t.table))
		: TABLES

	// Bucket keys: team key ('1', '2'), 'public', or an explicit filename ('seed-meta.sql')
	const BUCKET_FILE: Record<string, string> = {
		'1': TEAMS['1'].file,
		'2': TEAMS['2'].file,
		public: 'seed-public.sql',
	}
	const buckets: Record<string, Record<string, string>> = {
		'1': {},
		'2': {},
		public: {},
	}
	let totalRows = 0

	for (const cfg of tables) {
		const selectCols = cfg.joinThrough
			? `*, ${cfg.joinThrough.alias}:${cfg.joinThrough.fk}(${cfg.joinThrough.col})`
			: '*'

		let query = supabase.from(cfg.table).select(selectCols)

		// Only apply time filter when the table has timestamp columns to filter on
		if (cutoffIso && cfg.timestamps.includes('created_at')) {
			// Strict gt on created_at only. Using gte would include rows inserted
			// at the exact moment of seeded_at (same db reset transaction). Including
			// updated_at in an OR caused rows whose updated_at defaulted to now() at
			// seed-time (missing column → DEFAULT now()) to be re-captured as "new".
			query = query.gt('created_at', cutoffIso)
		}

		const { data, error } = await query

		if (error) {
			console.error(`Warning: ${cfg.table}: ${error.message}`)
			continue
		}
		if (!data || data.length === 0) continue

		// Partition rows into buckets
		const byBucket: Record<string, Record<string, unknown>[]> = {
			'1': [],
			'2': [],
			public: [],
		}
		for (const row of data as Record<string, unknown>[]) {
			const bucket = assignBucket(row, cfg)
			if (!byBucket[bucket]) byBucket[bucket] = []
			byBucket[bucket].push(row)
		}

		for (const [bucket, rows] of Object.entries(byBucket)) {
			if (rows.length === 0) continue
			// file-override buckets always included; team buckets respect teamFilter
			if (!(bucket in BUCKET_FILE) || !teamFilter || bucket === teamFilter) {
				if (!buckets[bucket]) buckets[bucket] = {}
				const sql = generateInsert(cfg.table, rows, cfg)
				if (sql) {
					buckets[bucket][cfg.table] = sql
					totalRows += rows.length
				}
			}
		}
	}

	// Output — team buckets filtered by teamFilter; file-override buckets always shown
	const teamBuckets = teamFilter ? [teamFilter] : ['1', '2', 'public']
	const fileBuckets = Object.keys(buckets).filter((k) => !(k in BUCKET_FILE))
	const stamp = new Date().toISOString()

	for (const bucket of [...fileBuckets, ...teamBuckets]) {
		const sections = buckets[bucket]
		if (!sections || Object.keys(sections).length === 0) continue

		const file = BUCKET_FILE[bucket] ?? bucket
		const block = Object.values(sections).join('')

		if (dryRun) {
			console.log(
				`\n-- ============================================================`
			)
			console.log(`-- TARGET FILE: supabase/${file}`)
			console.log(
				`-- ============================================================\n`
			)
			Deno.stdout.write(new TextEncoder().encode(block))
		} else {
			const targetPath = `${REPO_ROOT}/supabase/${file}`
			await Deno.writeTextFile(targetPath, `\n-- dump ${stamp}\n${block}`, {
				append: true,
			})
			console.error(`-- → ${targetPath}`)
		}
	}

	console.error(`-- ${totalRows} row(s) total`)

	if (shiftDays > 0 && !dryRun) {
		await shiftSeedFiles(shiftDays)
	}
}

main().catch((e) => {
	console.error(e)
	Deno.exit(1)
})
