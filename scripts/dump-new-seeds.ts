#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read --allow-write --allow-run=cp,docker
/**
 * Dump seed rows into the correct seed files.
 *
 * Modes
 * ─────
 *   (default)  Delta: rows created since last db reset, appended to seed-{N}-team*.sql
 *   --full     Full rebuild: ALL rows overwrite seed-{N}-team*.sql files
 *   --all      No time filter but still appends (not overwrite)
 *
 * File structure
 * ──────────────
 *   seed-meta.sql          — language + tag (always overwritten, no team partition)
 *   seed-1-team1.sql       — layer-1 team1 rows  (phrases, requests, playlists, profiles, decks)
 *   seed-1-team2.sql       — layer-1 team2 rows
 *   seed-1-team-none.sql   — layer-1 rows not assigned to any team
 *   seed-2-team1.sql       — layer-2 team1 rows  (cards, reviews, comments, translations, upvotes)
 *   seed-2-team2.sql       — layer-2 team2 rows
 *   seed-2-team-none.sql   — layer-2 rows not assigned to any team
 *   seed-zzz.sql           — sets seeded_at last (never touched by this script)
 *
 * Usage:
 *   deno run --allow-env --allow-net --allow-read --allow-write \
 *     scripts/dump-new-seeds.ts [options]
 *
 * Options:
 *   --since <interval>   Override baseline; e.g. "2 days"
 *   --all                No time filter — dump every tracked row (still appends)
 *   --full               Full rebuild: no time filter + overwrites all team files
 *   --shift-back <N>     After writing, shift all intervals in seed files back
 *                        N days (integer).  Pass alone to shift without dumping.
 *   --reseed             Truncate all seeded tables then reload all seed files.
 *                        Table list is derived from TABLES config automatically.
 *                        Runs via docker exec into the local postgres container.
 *                        Also truncates search_corpus if seed-corpus.sql exists.
 *   --corpus-only        Dump search_corpus to seed-corpus.sql (overwrite).
 *                        Run after backfill-search-corpus.ts to capture embeddings.
 *                        seed-corpus.sql uses ON CONFLICT DO UPDATE; --reseed will
 *                        include it automatically when present.
 *   --dry-run            Print SQL to stdout instead of writing files; skip shift
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const REPO_ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '')
const SEEDS_DIR = `${REPO_ROOT}/supabase/seeds`

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

const NOW_MS = Date.now()
const TODAY_UTC_NOON = (() => {
	const d = new Date()
	d.setUTCHours(12, 0, 0, 0)
	return d.getTime()
})()

// ---------------------------------------------------------------------------
// Team definitions
// ---------------------------------------------------------------------------

const TEAMS = {
	'1': {
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
	/**
	 * Seed layer: 1 = parent rows (phrases, requests, profiles, decks),
	 * 2 = child rows (cards, reviews, comments, translations, upvotes, links).
	 * Determines which seed-{layer}-team*.sql file a row lands in.
	 * Default: 1.
	 */
	layer?: 1 | 2
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
		// no time filter → always dumps all rows with ON CONFLICT DO NOTHING
		table: 'tag',
		partitionCol: 'lang',
		timestamps: [],
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

	// ---- layer 1: social / identity (FK only to auth.users or each other) ----
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
		table: 'admin_user',
		partitionCol: 'uid',
		timestamps: ['created_at'],
	},
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

	// ---- layer 2: children (FK to phrases, requests, playlists, decks) ----

	// comments (require phrase_request to exist)
	{
		// follow request_id → phrase_request.lang so comments land in the same
		// team file as their parent request rather than the commenter's team
		table: 'request_comment',
		partitionCol: 'lang',
		joinThrough: { alias: 'phrase_request', fk: 'request_id', col: 'lang' },
		timestamps: ['created_at', 'updated_at'],
		layer: 2,
	},

	// link / join tables
	{
		// phrase_tag has no direct lang column; join phrase to get phrase.lang
		table: 'phrase_tag',
		partitionCol: 'lang',
		joinThrough: { alias: 'phrase', fk: 'phrase_id', col: 'lang' },
		timestamps: ['created_at'],
		layer: 2,
	},
	{
		table: 'playlist_phrase_link',
		partitionCol: 'uid',
		timestamps: ['created_at'],
		layer: 2,
	},
	{
		table: 'comment_phrase_link',
		partitionCol: 'uid',
		timestamps: ['created_at'],
		layer: 2,
	},

	// translations and upvotes
	{
		// translation lang = target language, not phrase language — use added_by
		table: 'phrase_translation',
		partitionCol: 'added_by',
		timestamps: ['created_at', 'updated_at'],
		layer: 2,
	},
	{
		table: 'phrase_request_upvote',
		partitionCol: 'uid',
		timestamps: ['created_at'],
		layer: 2,
	},
	{
		table: 'phrase_playlist_upvote',
		partitionCol: 'uid',
		timestamps: ['created_at'],
		layer: 2,
	},
	{
		table: 'comment_upvote',
		partitionCol: 'uid',
		timestamps: ['created_at'],
		layer: 2,
	},

	// notifications (may FK to many layer-1 rows)
	{
		table: 'notification',
		partitionCol: 'uid',
		timestamps: ['created_at', 'read_at'],
		layer: 2,
	},

	// user learning data
	{
		table: 'user_card',
		partitionCol: 'uid',
		timestamps: ['created_at', 'updated_at'],
		layer: 2,
	},
	{
		table: 'user_deck_review_state',
		partitionCol: 'uid',
		timestamps: ['created_at'],
		dates: ['day_session'],
		dateFromTimestamp: { day_session: 'created_at' },
		layer: 2,
	},
	{
		table: 'user_card_review',
		partitionCol: 'uid',
		timestamps: ['created_at', 'updated_at'],
		dates: ['day_session'],
		dateFromTimestamp: { day_session: 'created_at' },
		layer: 2,
	},
	{
		table: 'user_client_event',
		partitionCol: 'uid',
		timestamps: ['created_at'],
		layer: 2,
	},
]

// Tables that exist in the DB but are deliberately excluded from dumping.
// Keep this list up to date so any genuinely new table stands out.
const SKIP_TABLES = new Set([
	// seeding metadata — written by seed.sql itself
	'db_meta',
	// deprecated, no longer used in the app
	'phrase_relation',
	'user_client_event',
	// dumped separately via --corpus-only into seed-corpus.sql
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
	const ageMs = NOW_MS - new Date(isoStr).getTime()
	return `now() - interval '${msToInterval(Math.abs(ageMs))}'`
}

function fmtDate(dateStr: string | null): string {
	if (dateStr === null) return 'null'
	const d = new Date(dateStr + 'T12:00:00Z')
	const n = Math.round((TODAY_UTC_NOON - d.getTime()) / 86_400_000)
	return n === 0 ? '(current_date)::date' : `(current_date - ${n})::date`
}

function fmtDateFromTimestamp(isoStr: string | null): string {
	if (isoStr === null) return 'null'
	const ageMs = NOW_MS - new Date(isoStr).getTime()
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
	return `'${JSON.stringify(val).replace(/'/g, "''")}'`
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

// Returns the team key ('1', '2', 'none') or an explicit filename for file-override tables.
function assignTeam(row: Record<string, unknown>, cfg: TableCfg): string {
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

	// joinThrough always joins on a lang column — check explicitly rather than
	// assuming any joinThrough implies lang partitioning.
	const isLangPartition =
		cfg.partitionCol === 'lang' || cfg.joinThrough?.col === 'lang'
	for (const [teamKey, team] of Object.entries(TEAMS) as [
		TeamKey,
		(typeof TEAMS)[TeamKey],
	][]) {
		const set = isLangPartition ? team.langs : team.uids
		if ((set as Set<string>).has(val)) return teamKey
	}
	return 'none'
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
		...[1, 2].flatMap((layer) =>
			['1', '2', 'none'].map(
				(team) =>
					`${SEEDS_DIR}/seed-${layer}-team${team === 'none' ? '-none' : team}.sql`
			)
		),
		`${SEEDS_DIR}/seed-meta.sql`,
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
// Reseed: truncate all seeded tables then reload seed files
// ---------------------------------------------------------------------------

async function listSeedFiles(): Promise<string[]> {
	const files: string[] = []
	for await (const entry of Deno.readDir(SEEDS_DIR)) {
		if (entry.isFile && entry.name.endsWith('.sql')) files.push(entry.name)
	}
	return files.sort()
}

async function reseedDatabase(dryRun: boolean): Promise<void> {
	// Derive the truncation table list from TABLES config.
	// SKIP_TABLES contains views and non-truncatable objects — exclude them.
	// Include search_corpus in truncation only when seed-corpus.sql exists,
	// so users who haven't run --corpus-only don't lose their local embeddings.
	let hasCorpusSeed = false
	try {
		await Deno.stat(`${SEEDS_DIR}/seed-corpus.sql`)
		hasCorpusSeed = true
	} catch {
		/* file absent */
	}

	const truncateTables = [
		// All tables we actively dump/seed
		...new Set(TABLES.map((t) => t.table)),
		// db_meta is in SKIP_TABLES (excluded from dumping) but seed-zzz.sql
		// writes seeded_at into it, so we must truncate it to allow a clean reseed.
		'db_meta',
		// Only truncate corpus when we have a seed file to reload it from
		...(hasCorpusSeed ? ['search_corpus'] : []),
	].filter(
		(t) => !SKIP_TABLES.has(t) || t === 'db_meta' || t === 'search_corpus'
	)

	// CASCADE handles any deprecated tables that still have FKs to seeded tables
	// (e.g. phrase_relation → phrase) without needing to list them explicitly.
	const truncateSQL = [
		'set\n\tsession_replication_role = replica;',
		'',
		'truncate',
		truncateTables.map((t) => `\tpublic.${t}`).join(',\n') + '\ncascade;',
		'',
		'reset all;',
		'',
	].join('\n')

	const seedFiles = await listSeedFiles()

	if (dryRun) {
		console.log('-- TRUNCATION SQL (derived from TABLES config):')
		console.log(truncateSQL)
		console.log('-- SEED FILES (in load order):')
		for (const f of seedFiles) console.log(`--   seeds/${f}`)
		return
	}

	// Discover the local postgres container (supabase_db_<project>)
	const { stdout: psOut } = await new Deno.Command('docker', {
		args: ['ps', '--format', '{{.Names}}'],
	}).output()
	const containerName = new TextDecoder()
		.decode(psOut)
		.split('\n')
		.find((n) => n.startsWith('supabase_db_'))
		?.trim()

	if (!containerName) {
		console.error(
			'Error: could not find a running supabase_db_* container. Is supabase running?'
		)
		Deno.exit(1)
	}

	// Build full SQL: truncation followed by all seed files
	let fullSQL = truncateSQL + '\n'
	for (const fname of seedFiles) {
		fullSQL += (await Deno.readTextFile(`${SEEDS_DIR}/${fname}`)) + '\n'
	}

	console.error(
		`-- Truncating ${truncateTables.length} tables then loading ${seedFiles.length} seed files via ${containerName}...`
	)

	const proc = new Deno.Command('docker', {
		args: [
			'exec',
			'-i',
			containerName,
			'psql',
			'-U',
			'postgres',
			'-d',
			'postgres',
			'-v',
			'ON_ERROR_STOP=1',
		],
		stdin: 'piped',
		stdout: 'inherit',
		stderr: 'inherit',
	}).spawn()

	const writer = proc.stdin.getWriter()
	await writer.write(new TextEncoder().encode(fullSQL))
	await writer.close()

	const { code } = await proc.status
	if (code !== 0) {
		console.error(`-- psql exited with code ${code}`)
		Deno.exit(code)
	}
	console.error('-- reseed complete')
}

// ---------------------------------------------------------------------------
// Backup seeds directory
// ---------------------------------------------------------------------------

async function backupSeeds(): Promise<void> {
	const bakDir = `${SEEDS_DIR}.bak`
	const bak2Dir = `${SEEDS_DIR}.bak2`

	const answer = prompt('Backup seeds/ to seeds.bak before overwriting? [Y/n]')
	if (answer?.trim().toLowerCase() === 'n') return

	// -rn = no-clobber: succeeds only if .bak exists AND .bak2 doesn't yet.
	const bak2Result = await new Deno.Command('cp', {
		args: ['-rn', bakDir, bak2Dir],
	}).output()
	if (bak2Result.success)
		console.error(`-- → ${bak2Dir} (first-backup preserved)`)

	await Deno.remove(bakDir, { recursive: true }).catch(() => {})
	await new Deno.Command('cp', { args: ['-r', SEEDS_DIR, bakDir] }).output()
	console.error(`-- → ${bakDir} (backup created)`)
}

// ---------------------------------------------------------------------------
// Corpus dump  (--corpus-only)
// ---------------------------------------------------------------------------

// 4 decimal places is plenty for cosine similarity in staging/tests.
// Full float32 precision (8+ decimals) makes the file ~3× larger for no benefit.
const EMBEDDING_PRECISION = 3

function roundEmbedding(vec: string): string {
	// PostgREST returns vectors as "[0.12345678,...]" — parse, round, reserialise
	const inner = vec.slice(1, -1)
	const rounded = inner
		.split(',')
		.map((n) => parseFloat(n).toFixed(EMBEDDING_PRECISION))
		.join(',')
	return `[${rounded}]`
}

async function dumpCorpus(
	supabase: SupabaseClient,
	dryRun: boolean
): Promise<void> {
	const { data, error } = await supabase.from('search_corpus').select('*')
	if (error) {
		console.error(`Error fetching search_corpus: ${error.message}`)
		Deno.exit(1)
	}
	if (!data || data.length === 0) {
		console.error(
			'-- search_corpus is empty — run backfill-search-corpus.ts first'
		)
		return
	}

	const rows = data as Record<string, unknown>[]
	const cols = Object.keys(rows[0])
	const colList = cols.map((c) => `"${c}"`).join(', ')

	const blocks = rows.map((row) => {
		const vals = cols
			.map((col) => {
				const val = row[col]
				if (val === null || val === undefined) return '\t\tnull'
				// created_at: store as now() so the file stays valid across DB resets
				if (col === 'created_at') return '\t\tnow()'
				if (col === 'embedding' && typeof val === 'string')
					return `\t\t'${roundEmbedding(val)}'`
				if (typeof val === 'string') return `\t\t'${val.replace(/'/g, "''")}'`
				if (typeof val === 'number') return `\t\t${val}`
				if (typeof val === 'boolean') return `\t\t${val}`
				return `\t\t'${JSON.stringify(val).replace(/'/g, "''")}'`
			})
			.join(',\n')
		return `\t(\n${vals}\n\t)`
	})

	// Update everything except the natural key on conflict
	const keyCols = new Set(['id', 'source_type', 'source_id'])
	const updateCols = cols.filter((c) => !keyCols.has(c))
	const updateClause = updateCols
		.map((c) => `"${c}" = excluded."${c}"`)
		.join(',\n\t\t')

	const stamp = new Date().toISOString()
	const sql = [
		`set`,
		`\tsession_replication_role = replica;`,
		``,
		`-- generated by dump-new-seeds --corpus-only ${stamp}`,
		`-- ${rows.length} row(s)`,
		``,
		`--`,
		`-- search_corpus (${rows.length} rows)`,
		`--`,
		`insert into`,
		`\t"public"."search_corpus" (${colList})`,
		`values`,
		blocks.join(',\n'),
		`on conflict (source_type, source_id) do update set`,
		`\t${updateClause};`,
		``,
	].join('\n')

	if (dryRun) {
		await Deno.stdout.write(new TextEncoder().encode(sql))
	} else {
		const targetPath = `${SEEDS_DIR}/seed-corpus.sql`
		await Deno.writeTextFile(targetPath, sql)
		console.error(`-- → ${targetPath} (${rows.length} rows)`)
	}
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	const args = [...Deno.args]

	let sinceOverride: string | null = null
	let allRows = false
	let fullMode = false
	let reseedMode = false
	let corpusOnly = false
	let shiftDays = 0
	let dryRun = false

	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--since' && args[i + 1]) sinceOverride = args[++i]
		else if (args[i] === '--all') allRows = true
		else if (args[i] === '--full') {
			fullMode = true
			allRows = true
		} else if (args[i] === '--reseed') reseedMode = true
		else if (args[i] === '--corpus-only') corpusOnly = true
		else if (args[i] === '--shift-back' && args[i + 1])
			shiftDays = parseInt(args[++i])
		else if (args[i] === '--dry-run') dryRun = true
	}

	// --shift-back alone: skip the dump, just shift
	const shiftOnly =
		shiftDays > 0 && !fullMode && !allRows && !reseedMode && !sinceOverride

	if (shiftOnly) {
		if (!dryRun) await shiftSeedFiles(shiftDays)
		else console.error('-- --dry-run: skipping shift')
		return
	}

	if (reseedMode) {
		await reseedDatabase(dryRun)
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

	if (corpusOnly) {
		await dumpCorpus(supabase, dryRun)
		return
	}

	if (fullMode)
		console.error('-- Mode: --full (all rows, overwrite team files)')

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

	// Bucket key: "${layer}-${team}" for team rows (e.g. '1-1', '2-none'),
	// or an explicit filename for file-override tables (e.g. 'seed-meta.sql').
	// File-override buckets are always overwritten; team buckets are appended
	// unless --full is set, in which case they are also overwritten.
	const BUCKET_FILE: Record<string, string> = {}
	for (const layer of [1, 2]) {
		for (const team of ['1', '2', 'none']) {
			BUCKET_FILE[`${layer}-${team}`] =
				`seed-${layer}-team${team === 'none' ? '-none' : team}.sql`
		}
	}

	const buckets: Record<string, string[]> = {}
	let totalRows = 0

	const fetchResults = await Promise.all(
		TABLES.map(async (cfg) => {
			const selectCols = cfg.joinThrough
				? `*, ${cfg.joinThrough.alias}:${cfg.joinThrough.fk}(${cfg.joinThrough.col})`
				: '*'
			let query = supabase.from(cfg.table).select(selectCols)
			// Strict gt on created_at only. Using gte would include rows inserted
			// at the exact moment of seeded_at (same db reset transaction). Including
			// updated_at in an OR caused rows whose updated_at defaulted to now() at
			// seed-time (missing column → DEFAULT now()) to be re-captured as "new".
			if (cutoffIso && cfg.timestamps.includes('created_at'))
				query = query.gt('created_at', cutoffIso)
			const { data, error } = await query
			return { cfg, data, error }
		})
	)

	for (const { cfg, data, error } of fetchResults) {
		if (error) {
			console.error(`Warning: ${cfg.table}: ${error.message}`)
			continue
		}
		if (!data || data.length === 0) continue

		const byBucket: Record<string, Record<string, unknown>[]> = {}
		for (const row of data as Record<string, unknown>[]) {
			const team = assignTeam(row, cfg)
			const bucketKey = team.endsWith('.sql')
				? team
				: `${cfg.layer ?? 1}-${team}`
			if (!byBucket[bucketKey]) byBucket[bucketKey] = []
			byBucket[bucketKey].push(row)
		}

		for (const [bucket, rows] of Object.entries(byBucket)) {
			const sql = generateInsert(cfg.table, rows, cfg)
			if (sql) {
				if (!buckets[bucket]) buckets[bucket] = []
				buckets[bucket].push(sql)
				totalRows += rows.length
			}
		}
	}

	// Output — file-override buckets first (always overwrite), then team buckets
	const allBuckets = Object.keys(buckets)
	const fileBuckets = allBuckets.filter((k) => !(k in BUCKET_FILE))
	const activeBuckets = allBuckets.filter((k) => k in BUCKET_FILE).sort() // ensures seed-1-* before seed-2-*

	const stamp = new Date().toISOString()

	// Backup before overwriting in --full mode
	if (fullMode && !dryRun) await backupSeeds()

	for (const bucket of [...fileBuckets, ...activeBuckets]) {
		const sections = buckets[bucket]
		if (!sections?.length) continue

		const file = BUCKET_FILE[bucket] ?? bucket
		const block = sections.join('')
		const isFileOverride = !(bucket in BUCKET_FILE)
		const isOverwrite = fullMode || isFileOverride

		if (dryRun) {
			console.log(
				`\n-- ============================================================`
			)
			console.log(
				`-- TARGET FILE: seeds/${file}${isOverwrite ? ' (overwrite)' : ' (append)'}`
			)
			console.log(
				`-- ============================================================\n`
			)
			await Deno.stdout.write(new TextEncoder().encode(block))
		} else {
			const targetPath = `${SEEDS_DIR}/${file}`
			if (isOverwrite) {
				const header = `set\n\tsession_replication_role = replica;\n\n-- generated by dump-new-seeds ${stamp}\n\n`
				await Deno.writeTextFile(targetPath, header + block)
				console.error(`-- → ${targetPath} (overwritten)`)
			} else {
				await Deno.writeTextFile(targetPath, `\n-- dump ${stamp}\n${block}`, {
					append: true,
				})
				console.error(`-- → ${targetPath}`)
			}
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
