drop view if exists public.user_card_review_today;

drop view if exists public.user_card_scheduled_today;

drop view if exists public.user_card_pick_new_active;

create or replace view public.user_card_scheduled_today
with
	(security_invoker = true) as
with
	first as (
		select distinct
			on (record.user_card_id) record.user_card_id,
			record.id as prev_id,
			record.created_at as prev_created_at,
			record.new_difficulty as review_time_difficulty,
			record.new_stability as review_time_stability,
			record.scheduled_for as last_scheduled_for,
			record.new_interval_r90 as last_scheduled_interval,
			(
				extract(
					epoch
					from
						current_timestamp
				) - extract(
					epoch
					from
						record.scheduled_for
				)
			) / 60.0 / 60.0 / 24.0 as overdue_days,
			(
				extract(
					epoch
					from
						current_timestamp
				) - extract(
					epoch
					from
						record.scheduled_for
				)
			)::double precision / 60.0::double precision / 60.0::double precision / 24.0::double precision / record.new_interval_r90::double precision as overdue_percent
		from
			user_card_scheduled record
		order by
			user_card_id,
			prev_created_at desc
	)
select
	*
from
	first
where
	last_scheduled_for < now()
order by
	(random());

create or replace view public.user_card_pick_new_active
with
	(security_invoker = true) as
select
	card.id as user_card_id,
	null::uuid as prev_id,
	null::timestamp with time zone as prev_created_at,
	null::numeric as review_time_difficulty,
	null::numeric as review_time_stability,
	null::timestamp with time zone as last_scheduled_for,
	null::numeric as last_scheduled_interval,
	null::numeric as overdue_days,
	null::double precision as overdue_percent
from
	user_card_plus card
	left join user_card_scheduled reviews on reviews.user_card_id = card.id
where
	reviews.id is null
	and card.status = 'active'::card_status
order by
	(random())
limit
	15;

create or replace view public.user_card_review_today
with
	(security_invoker = true) as
with
	first as (
		select
			user_card_scheduled_today.prev_id,
			user_card_scheduled_today.user_card_id,
			user_card_scheduled_today.review_time_difficulty,
			user_card_scheduled_today.review_time_stability,
			user_card_scheduled_today.last_scheduled_for,
			user_card_scheduled_today.last_scheduled_interval,
			user_card_scheduled_today.overdue_days,
			user_card_scheduled_today.overdue_percent,
			user_card_scheduled_today.prev_created_at
		from
			user_card_scheduled_today
		union all
		select
			user_card_pick_new_active.prev_id,
			user_card_pick_new_active.user_card_id,
			user_card_pick_new_active.review_time_difficulty,
			user_card_pick_new_active.review_time_stability,
			user_card_pick_new_active.last_scheduled_for,
			user_card_pick_new_active.last_scheduled_interval,
			user_card_pick_new_active.overdue_days,
			user_card_pick_new_active.overdue_percent,
			user_card_pick_new_active.prev_created_at
		from
			user_card_pick_new_active
	)
select
	first.*,
	card.lang,
	card.phrase_id
from
	first
	join user_card_plus card on first.user_card_id = card.id
where
	card.status = 'active'::card_status
order by
	(random());
