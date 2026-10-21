-- Activity stats for the admin app (admin.sunlo.app).
--
-- Both functions read across every user's rows and auth.users, so they run
-- as security definer and refuse anyone who is not in admin_user. Days are
-- UTC calendar days, not the app's 4am review-day cutoff.
create or replace function public.admin_activity_overview (p_days integer default 7) returns jsonb language plpgsql stable security definer
set
	search_path = '' as $$
declare
  v_since timestamptz;
  v_prev_since timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Only admins can read activity stats' using errcode = '42501';
  end if;
  if p_days is null or p_days < 1 or p_days > 90 then
    raise exception 'p_days must be between 1 and 90' using errcode = '22023';
  end if;

  v_since := (date_trunc('day', now() at time zone 'utc') - make_interval(days => p_days - 1)) at time zone 'utc';
  v_prev_since := v_since - make_interval(days => p_days);

  return (
    with events as (
      select 'review' as kind, r.uid, r.created_at from public.user_card_review r where r.created_at >= v_prev_since
      -- user_card holds a forward and a reverse card per phrase: count the phrase once
      union all select 'card_added', c.uid, min(c.created_at) from public.user_card c where c.created_at >= v_prev_since group by c.uid, c.phrase_id
      union all select 'deck_created', d.uid, d.created_at from public.user_deck d where d.created_at >= v_prev_since
      union all select 'phrase_added', p.added_by, p.created_at from public.phrase p where p.created_at >= v_prev_since
      union all select 'translation_added', t.added_by, t.created_at from public.phrase_translation t where t.created_at >= v_prev_since
      union all select 'request_added', q.requester_uid, q.created_at from public.phrase_request q where q.created_at >= v_prev_since
      union all select 'comment_added', m.uid, m.created_at from public.request_comment m where m.created_at >= v_prev_since
      union all select 'playlist_added', l.uid, l.created_at from public.phrase_playlist l where l.created_at >= v_prev_since
      union all select 'chat_message', x.sender_uid, x.created_at from public.chat_message x where x.created_at >= v_prev_since
      union all select 'signup', u.id, u.created_at from auth.users u where u.created_at >= v_prev_since
    ),
    days as (
      select (v_since at time zone 'utc')::date + i as day from generate_series(0, p_days - 1) as i
    ),
    per_day as (
      select (e.created_at at time zone 'utc')::date as day, e.kind, count(*) as n
      from events e where e.created_at >= v_since
      group by 1, 2
    ),
    active_per_day as (
      select (e.created_at at time zone 'utc')::date as day, count(distinct e.uid) as n
      from events e where e.created_at >= v_since and e.kind <> 'signup'
      group by 1
    ),
    reviewers_per_day as (
      select (e.created_at at time zone 'utc')::date as day, count(distinct e.uid) as n
      from events e where e.created_at >= v_since and e.kind = 'review'
      group by 1
    )
    select jsonb_build_object(
      'since', v_since,
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
        'total_users', (select count(*) from auth.users),
        'onboarded_users', (select count(*) from public.user_profile where username is not null),
        'active_users', (select count(distinct e.uid) from events e where e.created_at >= v_since and e.kind <> 'signup'),
        'active_users_prev', (select count(distinct e.uid) from events e where e.created_at < v_since and e.kind <> 'signup'),
        'new_users', (select count(*) from events e where e.created_at >= v_since and e.kind = 'signup'),
        'new_users_prev', (select count(*) from events e where e.created_at < v_since and e.kind = 'signup'),
        'reviews', (select count(*) from events e where e.created_at >= v_since and e.kind = 'review'),
        'reviews_prev', (select count(*) from events e where e.created_at < v_since and e.kind = 'review')
      )
    )
  );
end;
$$;

create or replace function public.admin_user_activity (p_days integer default 7, p_limit integer default 20) returns jsonb language plpgsql stable security definer
set
	search_path = '' as $$
declare
  v_since timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Only admins can read user activity' using errcode = '42501';
  end if;
  if p_days is null or p_days < 1 or p_days > 90 then
    raise exception 'p_days must be between 1 and 90' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 200 then
    raise exception 'p_limit must be between 1 and 200' using errcode = '22023';
  end if;

  v_since := (date_trunc('day', now() at time zone 'utc') - make_interval(days => p_days - 1)) at time zone 'utc';

  return (
    with events as (
      select 'review' as kind, r.uid, r.created_at from public.user_card_review r where r.created_at >= v_since
      union all select 'card_added', c.uid, min(c.created_at) from public.user_card c where c.created_at >= v_since group by c.uid, c.phrase_id
      union all select 'deck_created', d.uid, d.created_at from public.user_deck d where d.created_at >= v_since
      union all select 'phrase_added', p.added_by, p.created_at from public.phrase p where p.created_at >= v_since
      union all select 'translation_added', t.added_by, t.created_at from public.phrase_translation t where t.created_at >= v_since
      union all select 'request_added', q.requester_uid, q.created_at from public.phrase_request q where q.created_at >= v_since
      union all select 'comment_added', m.uid, m.created_at from public.request_comment m where m.created_at >= v_since
      union all select 'playlist_added', l.uid, l.created_at from public.phrase_playlist l where l.created_at >= v_since
      union all select 'chat_message', x.sender_uid, x.created_at from public.chat_message x where x.created_at >= v_since
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
          join auth.users u on u.id = pu.uid
          left join public.user_profile pr on pr.uid = pu.uid
          order by pu.actions desc, pu.last_active_at desc
          limit p_limit
        ) x
      ), '[]'::jsonb),
      'newest', coalesce((
        select jsonb_agg(row_to_json(y) order by y.created_at desc)
        from (
          select u.id as uid, pr.username, u.email, u.created_at, u.last_sign_in_at,
            pr.username is not null as onboarded,
            (select array_agg(d.lang order by d.created_at) from public.user_deck d where d.uid = u.id and not d.archived) as deck_langs,
            (select count(*) from public.user_card_review r where r.uid = u.id) as reviews
          from auth.users u
          left join public.user_profile pr on pr.uid = u.id
          order by u.created_at desc
          limit p_limit
        ) y
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.admin_activity_overview (integer)
from
	public,
	anon;

grant
execute on function public.admin_activity_overview (integer) to authenticated;

revoke all on function public.admin_user_activity (integer, integer)
from
	public,
	anon;

grant
execute on function public.admin_user_activity (integer, integer) to authenticated;
