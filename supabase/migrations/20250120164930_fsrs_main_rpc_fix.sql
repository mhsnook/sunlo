create or replace function public.record_review_and_schedule (
	user_card_id uuid,
	review_time_retrievability numeric,
	review_time_score integer
) returns timestamp without time zone language plv8 as $function$
const desired_retention = 0.9;

const lastReview = plv8.execute("SELECT id, new_difficulty, new_stability FROM public.user_card_scheduled WHERE user_card_id = $1 ORDER BY created_at DESC LIMIT 1", [user_card_id])?.rows?.[0] ?? null;

const last_user_card_schedule_id = lastReview?.id ?? null;
const review_time_difficulty = lastReview?.new_difficulty ?? null;
const review_time_stability = lastReview?.new_stability ?? null;

const new_stability = lastReview ? 
		plv8.find_function("fsrs_stability")(review_time_difficulty, review_time_stability, review_time_retrievability, review_time_score)
	: plv8.find_function("fsrs_s_0")(review_time_score);

const new_difficulty = lastReview ? plv8.find_function("fsrs_difficulty")(review_time_difficulty, review_time_score) : plv8.find_function("fsrs_d_0")(review_time_score);

const new_interval_r90 = plv8.find_function("fsrs_interval")(desired_retention, new_stability);
const scheduled_for = new Date(Date.now() + (new_interval_r90 * 24 * 60 * 60 * 1000));

plv8.execute("INSERT INTO public.user_card_scheduled (user_card_id, review_time_difficulty, review_time_stability, review_time_retrievability, review_time_score, new_difficulty, new_stability, new_interval_r90, scheduled_for) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)", [user_card_id, review_time_difficulty, review_time_stability, review_time_retrievability, review_time_score, new_difficulty, new_stability, new_interval_r90, scheduled_for]);

return scheduled_for;
$function$;
