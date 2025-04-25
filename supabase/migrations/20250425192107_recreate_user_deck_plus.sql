drop view if exists "public"."user_deck_plus";

create or replace view
	public.user_deck_plus
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
			l.lang::text = d.lang::text
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
			p.lang::text = d.lang::text
	) as lang_total_phrases,
	(
		select
			max(c.created_at) as max
		from
			user_card_review r
		where
			r.user_deck_id = d.id
		limit
			1
	) as most_recent_review_at,
	(
		select
			count(*) as count
		from
			user_card_review r
		where
			r.user_deck_id = d.id
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
	(
		(
			select
				count(*) as count
			from
				user_card_review r
			where
				r.user_deck_id = d.id
				and r.created_at > (now() - '7 days'::interval)
			limit
				1
		)
	) desc nulls last,
	d.created_at desc;