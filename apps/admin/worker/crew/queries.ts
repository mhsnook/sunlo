import type { Sql } from 'postgres'
import { activityEvents } from '../stats'
import type { PeopleIndex } from './github'

export const MAX_ROWS = 200
const MAX_RESULT_CHARS = 30_000

// Everything an agent needs for "what happened between since and until",
// as one jsonb value: signups, reviews and who did them, new decks, and the
// library and social counts. The window is [since, until).
export async function activityBetween(sql: Sql, since: string, until: string) {
	const [{ result }] = await sql<[{ result: Record<string, unknown> }]>`
		with w as (select ${since}::timestamptz as since, ${until}::timestamptz as until),
		events as (
			${activityEvents(sql, sql`(select since from w)`)}
		)
		select jsonb_build_object(
			'since', (select since from w),
			'until', (select until from w),
			'signups', coalesce((
				select jsonb_agg(jsonb_build_object(
					'uid', u.id, 'email', u.email, 'username', pr.username,
					'created_at', u.created_at, 'onboarded', pr.username is not null
				) order by u.created_at)
				from admin.user_account u
				left join public.user_profile pr on pr.uid = u.id, w
				where u.created_at >= w.since and u.created_at < w.until
			), '[]'::jsonb),
			'active_users', (
				select count(distinct e.uid) from events e, w
				where e.created_at >= w.since and e.created_at < w.until
			),
			'reviews', (
				select count(*) from public.user_card_review r, w
				where r.created_at >= w.since and r.created_at < w.until
			),
			'reviewers', coalesce((
				select jsonb_agg(to_jsonb(x) order by x.reviews desc)
				from (
					select r.uid, pr.username, count(*) as reviews,
						array_agg(distinct r.lang) as langs, max(r.created_at) as last_review_at
					from public.user_card_review r
					left join public.user_profile pr on pr.uid = r.uid, w
					where r.created_at >= w.since and r.created_at < w.until
					group by r.uid, pr.username
				) x
			), '[]'::jsonb),
			'decks_created', coalesce((
				select jsonb_agg(jsonb_build_object(
					'uid', d.uid, 'username', pr.username, 'lang', d.lang, 'created_at', d.created_at
				) order by d.created_at)
				from public.user_deck d
				left join public.user_profile pr on pr.uid = d.uid, w
				where d.created_at >= w.since and d.created_at < w.until
			), '[]'::jsonb),
			-- user_card holds a forward and a reverse card per phrase: count the phrase once
			'phrases_added_to_decks', (
				select count(*) from (
					select 1 from public.user_card c, w
					where c.created_at >= w.since and c.created_at < w.until
					group by c.uid, c.phrase_id
				) s
			),
			'library', jsonb_build_object(
				'phrases', (select count(*) from public.phrase p, w where p.created_at >= w.since and p.created_at < w.until),
				'translations', (select count(*) from public.phrase_translation t, w where t.created_at >= w.since and t.created_at < w.until),
				'requests', (select count(*) from public.phrase_request q, w where q.created_at >= w.since and q.created_at < w.until),
				'comments', (select count(*) from public.request_comment m, w where m.created_at >= w.since and m.created_at < w.until),
				'playlists', (select count(*) from public.phrase_playlist l, w where l.created_at >= w.since and l.created_at < w.until)
			),
			'chat_messages', (
				select count(*) from public.chat_message x, w
				where x.created_at >= w.since and x.created_at < w.until
			)
		) as result`
	return result
}

export class QueryRejectedError extends Error {}

// The agent writes this SQL. admin_reader is read-only at the server
// (default_transaction_read_only) and cannot see hidden columns, so this
// only has to keep one query from running long or returning too much.
export async function runReadOnlyQuery(sql: Sql, query: string) {
	const statement = query.trim().replace(/;\s*$/, '')
	if (statement.includes(';')) {
		throw new QueryRejectedError(
			'Send exactly one SELECT statement, with no semicolons inside it.'
		)
	}
	const rows = await sql.begin(async (tx) => {
		await tx`set local statement_timeout = '8s'`
		return tx.unsafe(
			`select * from (${statement}) as result limit ${MAX_ROWS + 1}`
		)
	})
	const truncated = rows.length > MAX_ROWS
	const text = JSON.stringify({
		rows: rows.slice(0, MAX_ROWS),
		row_count: Math.min(rows.length, MAX_ROWS),
		truncated,
	})
	return text.length > MAX_RESULT_CHARS
		? `${text.slice(0, MAX_RESULT_CHARS)}… (cut at ${MAX_RESULT_CHARS} characters; select fewer columns or aggregate)`
		: text
}

// Every username and user id, for keeping them out of public GitHub text.
export async function peopleIndex(sql: Sql): Promise<PeopleIndex> {
	const rows = await sql<Array<{ uid: string; username: string | null }>>`
		select uid::text, lower(username) as username from public.user_profile`
	return {
		usernames: new Set(rows.flatMap((row) => row.username ?? [])),
		uids: new Set(rows.map((row) => row.uid.toLowerCase())),
	}
}
