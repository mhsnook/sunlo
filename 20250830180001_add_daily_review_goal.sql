-- Add the daily_review_goal column to the user_deck table
alter table public.user_deck
add column daily_review_goal smallint not null default 15;

-- Add a constraint to ensure the goal is one of the allowed values
alter table public.user_deck
add constraint daily_review_goal_valid_values check (daily_review_goal in (10, 15, 20));

-- Recreate the user_deck_plus view to include the new column
drop view if exists public.user_deck_plus;

create or replace view
	public.user_deck_plus
with
	(security_invoker = 'true') as
select
	d.uid,
	d.lang,
	d.learning_goal,
	d.archived,
	d.daily_review_goal,
	(
		select
			l.name
		from
			language l
		where
			(l.lang)::text = (d.lang)::text
		limit
			1
	) as language,
	d.created_at,
	count(*) filter (
		where
			c.status = 'learned'::card_status
	) as cards_learned,
	count(*) filter (
		where
			c.status = 'active'::card_status
	) as cards_active,
	count(*) filter (
		where
			c.status = 'skipped'::card_status
	) as cards_skipped,
	(
		select
			count(*) as count
		from
			phrase p
		where
			(p.lang)::text = (d.lang)::text
	) as lang_total_phrases,
	(
		select
			max(r.created_at) as max
		from
			user_card_review r
		where
			(r.lang)::text = (d.lang)::text
			and r.uid = d.uid
		limit
			1
	) as most_recent_review_at,
	(
		select
			count(*) as count
		from
			user_card_review r
		where
			(r.lang)::text = (d.lang)::text
			and r.uid = d.uid
			and r.created_at > (now() - '7 days'::interval)
		limit
			1
	) as count_reviews_7d,
	(
		select
			count(*) as count
		from
			user_card_review r
		where
			(r.lang)::text = (d.lang)::text
			and r.uid = d.uid
			and r.created_at > (now() - '7 days'::interval)
			and r.score >= 2
		limit
			1
	) as count_reviews_7d_positive
from
	user_deck d
	left join user_card c on (d.lang)::text = (c.lang)::text
	and d.uid = c.uid
group by
	d.uid,
	d.lang,
	d.learning_goal,
	d.archived,
	d.daily_review_goal,
	d.created_at
order by
	(
		select
			count(*) as count
		from
			user_card_review r
		where
			(r.lang)::text = (d.lang)::text
			and r.uid = d.uid
			and r.created_at > (now() - '7 days'::interval)
		limit
			1
	) desc nulls last,
	d.created_at desc;