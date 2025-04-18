do $$
    BEGIN
        alter view public.user_card_scheduled_today rename column "last_user_card_schedule_id" to "prev_id";
    EXCEPTION
        WHEN undefined_column THEN
     END;
$$;

do $$
    BEGIN
        alter view public.user_card_pick_new_active rename column "last_user_card_schedule_id" to "prev_id";
    EXCEPTION
        WHEN undefined_column THEN
     END;
$$;

create or replace view public.user_deck_plus
with
	(security_invoker = true) as
select
	d.id,
	d.uid,
	d.lang,
	d.learning_goal,
	d.archived,
	(
		select
			l.name
		from
			language l
		where
			l.lang = d.lang
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
			p.lang = d.lang
	) as lang_total_phrases,
	(
		select
			max(c.created_at) as max
		from
			user_card_scheduled as r
		where
			r.user_deck_id = d.id
		limit
			1
	) as most_recent_review_at,
	(
		select
			count(*) as count
		from
			user_card_scheduled r
		where
			r.user_deck_id::uuid = d.id::uuid
			and r.created_at > (now() - '7 days'::interval)
		limit
			1
	) as count_reviews_7d,
	(
		select
			count(*) as count
		from
			user_card_scheduled r
		where
			r.user_deck_id = d.id
			and r.created_at > (now() - '7 days'::interval)
			and r.score >= 2
		limit
			1
	) as count_reviews_7d_positive
from
	user_deck d
	left join user_card c on d.id = c.user_deck_id
group by
	d.id,
	d.lang,
	d.created_at
order by
	count_reviews_7d desc nulls last,
	d.created_at desc;

do $$
	BEGIN
		alter view public.user_card_review_today rename column "last_user_card_schedule_id" to "prev_id";
	EXCEPTION
		WHEN undefined_column THEN
	END;
$$;

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
			user_card_scheduled_today.overdue_percent
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
			user_card_pick_new_active.overdue_percent
		from
			user_card_pick_new_active
	)
select
	first.prev_id,
	first.user_card_id,
	first.review_time_difficulty,
	first.review_time_stability,
	first.last_scheduled_for,
	first.last_scheduled_interval,
	first.overdue_days,
	first.overdue_percent,
	card.lang,
	card.phrase_id
from
	first
	join user_card_plus card on first.user_card_id = card.id
where
	card.status = 'active'::card_status
order by
	(random());
