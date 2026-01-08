create or replace view public.user_card_plus
with
	("security_invoker" = 'true') as
with
	review as (
		select
			rev.id,
			rev.uid,
			rev.score,
			rev.difficulty,
			rev.stability,
			rev.review_time_retrievability,
			rev.created_at,
			rev.updated_at,
			rev.day_session,
			rev.lang,
			rev.phrase_id
		from
			user_card_review rev
			left join user_card_review rev2 on rev.phrase_id = rev2.phrase_id
			and rev.uid = rev2.uid
			and rev.created_at < rev2.created_at
		where
			rev2.created_at is null
	)
select
	card.lang,
	card.id,
	card.uid,
	card.status,
	card.phrase_id,
	card.created_at,
	card.updated_at,
	review.created_at as last_reviewed_at,
	review.difficulty,
	review.stability,
	current_timestamp as "current_timestamp",
	nullif(
		fsrs_retrievability (
			extract(
				epoch
				from
					current_timestamp - review.created_at
			) / 3600::numeric / 24::numeric,
			review.stability
		),
		'NaN'
	) as retrievability_now
from
	user_card card
	left join review on card.phrase_id = review.phrase_id
	and card.uid = review.uid;
