import type { Fragment, Sql } from 'postgres'

type Json = Record<string, unknown>

// Both queries build their whole answer as one jsonb value, so the JSON the
// app receives is the same shape the admin_activity_* RPCs used to return.
// Days are UTC calendar days, not the app's 4am review-day cutoff.

// Everything a user does that counts as activity, from `since` on, as
// (kind, uid, created_at) rows. Signups are not activity.
export const activityEvents = (sql: Sql, since: Fragment) => sql`
	select 'review' as kind, r.uid, r.created_at from public.user_card_review r where r.created_at >= ${since}
	-- user_card holds a forward and a reverse card per phrase: count the phrase once
	union all select 'card_added', c.uid, min(c.created_at) from public.user_card c where c.created_at >= ${since} group by c.uid, c.phrase_id
	union all select 'deck_created', d.uid, d.created_at from public.user_deck d where d.created_at >= ${since}
	union all select 'phrase_added', p.added_by, p.created_at from public.phrase p where p.created_at >= ${since}
	union all select 'translation_added', t.added_by, t.created_at from public.phrase_translation t where t.created_at >= ${since}
	union all select 'request_added', q.requester_uid, q.created_at from public.phrase_request q where q.created_at >= ${since}
	union all select 'comment_added', m.uid, m.created_at from public.request_comment m where m.created_at >= ${since}
	union all select 'playlist_added', l.uid, l.created_at from public.phrase_playlist l where l.created_at >= ${since}
	union all select 'chat_message', x.sender_uid, x.created_at from public.chat_message x where x.created_at >= ${since}`

export async function activityOverview(sql: Sql, days: number) {
	const [{ result }] = await sql<[{ result: Json }]>`
		with bounds as (
			select since, since - make_interval(days => ${days}::int) as prev_since
			from (
				select (date_trunc('day', now() at time zone 'utc') - make_interval(days => ${days}::int - 1)) at time zone 'utc' as since
			) s
		),
		events as (
			${activityEvents(sql, sql`(select prev_since from bounds)`)}
			union all select 'signup', u.id, u.created_at from admin.user_account u where u.created_at >= (select prev_since from bounds)
		),
		days as (
			select ((select since from bounds) at time zone 'utc')::date + i as day from generate_series(0, ${days}::int - 1) as i
		),
		per_day as (
			select (e.created_at at time zone 'utc')::date as day, e.kind, count(*) as n
			from events e where e.created_at >= (select since from bounds)
			group by 1, 2
		),
		active_per_day as (
			select (e.created_at at time zone 'utc')::date as day, count(distinct e.uid) as n
			from events e where e.created_at >= (select since from bounds) and e.kind <> 'signup'
			group by 1
		),
		reviewers_per_day as (
			select (e.created_at at time zone 'utc')::date as day, count(distinct e.uid) as n
			from events e where e.created_at >= (select since from bounds) and e.kind = 'review'
			group by 1
		)
		select jsonb_build_object(
			'since', (select since from bounds),
			'days', (
				select jsonb_agg(jsonb_build_object(
					'day', to_char(d.day, 'YYYY-MM-DD'),
					'active_users', coalesce(a.n, 0),
					'new_users', coalesce((select n from per_day p where p.day = d.day and p.kind = 'signup'), 0),
					'reviewers', coalesce(rv.n, 0),
					'reviews', coalesce((select n from per_day p where p.day = d.day and p.kind = 'review'), 0),
					'cards_added', coalesce((select n from per_day p where p.day = d.day and p.kind = 'card_added'), 0),
					'decks_created', coalesce((select n from per_day p where p.day = d.day and p.kind = 'deck_created'), 0),
					'phrases_added', coalesce((select n from per_day p where p.day = d.day and p.kind = 'phrase_added'), 0),
					'translations_added', coalesce((select n from per_day p where p.day = d.day and p.kind = 'translation_added'), 0),
					'requests_added', coalesce((select n from per_day p where p.day = d.day and p.kind = 'request_added'), 0),
					'comments_added', coalesce((select n from per_day p where p.day = d.day and p.kind = 'comment_added'), 0),
					'playlists_added', coalesce((select n from per_day p where p.day = d.day and p.kind = 'playlist_added'), 0),
					'chat_messages', coalesce((select n from per_day p where p.day = d.day and p.kind = 'chat_message'), 0)
				) order by d.day)
				from days d
				left join active_per_day a on a.day = d.day
				left join reviewers_per_day rv on rv.day = d.day
			),
			'totals', jsonb_build_object(
				'total_users', (select count(*) from admin.user_account),
				'onboarded_users', (select count(*) from public.user_profile where username is not null),
				'active_users', (select count(distinct e.uid) from events e where e.created_at >= (select since from bounds) and e.kind <> 'signup'),
				'active_users_prev', (select count(distinct e.uid) from events e where e.created_at < (select since from bounds) and e.kind <> 'signup'),
				'new_users', (select count(*) from events e where e.created_at >= (select since from bounds) and e.kind = 'signup'),
				'new_users_prev', (select count(*) from events e where e.created_at < (select since from bounds) and e.kind = 'signup'),
				'reviews', (select count(*) from events e where e.created_at >= (select since from bounds) and e.kind = 'review'),
				'reviews_prev', (select count(*) from events e where e.created_at < (select since from bounds) and e.kind = 'review')
			)
		) as result`
	return result
}

export async function userActivity(sql: Sql, days: number, limit: number) {
	const [{ result }] = await sql<[{ result: Json }]>`
		with bounds as (
			select (date_trunc('day', now() at time zone 'utc') - make_interval(days => ${days}::int - 1)) at time zone 'utc' as since
		),
		events as (
			${activityEvents(sql, sql`(select since from bounds)`)}
		),
		per_user as (
			select
				e.uid,
				count(*) as actions,
				count(*) filter (where e.kind = 'review') as reviews,
				count(*) filter (where e.kind in ('phrase_added', 'translation_added', 'request_added', 'comment_added', 'playlist_added')) as contributions,
				count(distinct (e.created_at at time zone 'utc')::date) as active_days,
				max(e.created_at) as last_active_at
			from events e
			group by e.uid
		)
		select jsonb_build_object(
			'most_active', coalesce((
				select jsonb_agg(row_to_json(x) order by x.actions desc, x.last_active_at desc)
				from (
					select pu.uid, pr.username, u.email, pu.actions, pu.reviews, pu.contributions, pu.active_days, pu.last_active_at,
						(select array_agg(d.lang order by d.created_at) from public.user_deck d where d.uid = pu.uid and not d.archived) as deck_langs
					from per_user pu
					join admin.user_account u on u.id = pu.uid
					left join public.user_profile pr on pr.uid = pu.uid
					order by pu.actions desc, pu.last_active_at desc
					limit ${limit}::int
				) x
			), '[]'::jsonb),
			'newest', coalesce((
				select jsonb_agg(row_to_json(y) order by y.created_at desc)
				from (
					select u.id as uid, pr.username, u.email, u.created_at, u.last_sign_in_at,
						pr.username is not null as onboarded,
						(select array_agg(d.lang order by d.created_at) from public.user_deck d where d.uid = u.id and not d.archived) as deck_langs,
						(select count(*) from public.user_card_review r where r.uid = u.id) as reviews
					from admin.user_account u
					left join public.user_profile pr on pr.uid = u.id
					order by u.created_at desc
					limit ${limit}::int
				) y
			), '[]'::jsonb)
		) as result`
	return result
}
