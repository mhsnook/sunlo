insert into
	public.user_card_review
select
	id,
	uid,
	user_card_id,
	score,
	new_difficulty as difficulty,
	new_stability as stability,
	review_time_retrievability,
	created_at,
	updated_at,
	user_deck_id
from
	public.user_card_scheduled;
