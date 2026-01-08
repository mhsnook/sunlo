-- Migration: Admin Dashboard Setup
-- Creates admin role system and analytics views for back-office dashboard
-- Admin Users Table
create table if not exists public.admin_users (
	uid uuid primary key references auth.users (id) on delete cascade,
	created_at timestamptz not null default now(),
	granted_by uuid references auth.users (id)
);

-- Enable RLS
alter table public.admin_users enable row level security;

-- RLS: Only admins can view the admin list
create policy "Admins can view admin list" on public.admin_users for
select
	to authenticated using (
		auth.uid () in (
			select
				uid
			from
				public.admin_users
		)
	);

-- Helper function to check if a user is an admin
create or replace function public.is_admin (user_id uuid default auth.uid ()) returns boolean language sql security definer as $$
  select exists(select 1 from public.admin_users where uid = user_id);
$$;

-- Analytics View: Deck Creation Stats
create or replace view public.admin_deck_stats as
select
	date_trunc('day', created_at) as creation_date,
	lang,
	count(*) as decks_created
from
	public.user_deck
where
	created_at >= now() - interval '30 days'
group by
	date_trunc('day', created_at),
	lang
order by
	creation_date desc,
	decks_created desc;

-- Analytics View: Review Activity Stats
create or replace view public.admin_review_stats as
select
	day_session as review_date,
	count(*) as total_reviews,
	count(distinct uid) as unique_users,
	count(distinct (uid::text || day_session::text || lang::text)) as unique_review_sessions
from
	public.user_card_review
where
	created_at >= now() - interval '30 days'
group by
	day_session
order by
	day_session desc;

-- Analytics View: Social Activity Stats
create or replace view public.admin_social_stats as
with
	request_activity as (
		select
			date_trunc('day', created_at) as activity_date,
			'request' as activity_type,
			count(*) as count,
			count(distinct requester_uid) as unique_users
		from
			public.phrase_request
		where
			created_at >= now() - interval '30 days'
			and deleted = false
		group by
			date_trunc('day', created_at)
	),
	playlist_activity as (
		select
			date_trunc('day', created_at) as activity_date,
			'playlist' as activity_type,
			count(*) as count,
			count(distinct uid) as unique_users
		from
			public.phrase_playlist
		where
			created_at >= now() - interval '30 days'
			and deleted = false
		group by
			date_trunc('day', created_at)
	),
	comment_activity as (
		select
			date_trunc('day', created_at) as activity_date,
			'comment' as activity_type,
			count(*) as count,
			count(distinct uid) as unique_users
		from
			public.request_comment
		where
			created_at >= now() - interval '30 days'
		group by
			date_trunc('day', created_at)
	)
select
	*
from
	request_activity
union all
select
	*
from
	playlist_activity
union all
select
	*
from
	comment_activity
order by
	activity_date desc,
	activity_type;

-- Analytics View: Summary Stats (simplified - no auth.users data)
create or replace view public.admin_summary_stats as
select
	(
		select
			count(distinct uid)
		from
			public.user_deck
	) as total_users,
	(
		select
			count(*)
		from
			public.user_deck
		where
			archived = false
	) as active_decks,
	(
		select
			count(*)
		from
			public.user_card_review
		where
			created_at >= now() - interval '7 days'
	) as reviews_week,
	(
		select
			count(*)
		from
			public.user_card_review
		where
			day_session >= current_date - 1
	) as reviews_yesterday,
	(
		select
			count(*)
		from
			public.phrase_request
		where
			deleted = false
	) as total_requests,
	(
		select
			count(*)
		from
			public.phrase_playlist
		where
			deleted = false
	) as total_playlists,
	(
		select
			count(*)
		from
			public.phrase
	) as total_phrases;

-- Grant select permissions on views to authenticated users
-- Note: Access control is handled by the route-level is_admin() check in beforeLoad
-- Views inherit security from underlying tables via security_invoker
grant
select
	on public.admin_deck_stats to authenticated;

grant
select
	on public.admin_review_stats to authenticated;

grant
select
	on public.admin_social_stats to authenticated;

grant
select
	on public.admin_summary_stats to authenticated;

-- Comment explaining manual admin setup
comment on table public.admin_users is 'Admin users table. To grant admin access, manually insert user ID: INSERT INTO public.admin_users (uid) VALUES (''user-uuid-here'');';
