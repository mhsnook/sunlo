set
	check_function_bodies = off;

drop function public.record_review_and_schedule (uuid, numeric, integer);

create or replace function public.record_review_and_schedule (
	user_card_id uuid,
	review_time_retrievability numeric,
	review_time_score integer
) returns user_card_scheduled language plv8 as $function$

const desired_retention = 0.9;
var comments = '';

const lastReviewResult = plv8.execute("SELECT id, created_at, uid, new_difficulty, new_stability FROM public.user_card_scheduled WHERE user_card_id = $1 ORDER BY created_at DESC LIMIT 1", [user_card_id]);
comments += `lastReviewResult.length: ${lastReviewResult.length}`;

const lastReview = lastReviewResult?.[0];
const uid = lastReview?.uid;
comments += `, lastReview:  { created_at: ${lastReview?.created_at}, id: ${lastReview?.id} }`;

const last_user_card_schedule_id = lastReview?.id;
const review_time_difficulty = lastReview?.new_difficulty;
const review_time_stability = lastReview?.new_stability;
comments += `, last_user_card_schedule_id: ${last_user_card_schedule_id}, review_time_difficulty: ${review_time_difficulty}, review_time_stability: ${review_time_stability}`;


const new_stability = lastReview ?
		plv8.find_function("fsrs_stability")(review_time_difficulty, review_time_stability, review_time_retrievability, review_time_score)
	: plv8.find_function("fsrs_s_0")(review_time_score);
comments += `, new_stability: ${new_stability}`;


const new_difficulty = lastReview ? plv8.find_function("fsrs_difficulty")(review_time_difficulty, review_time_score) : plv8.find_function("fsrs_d_0")(review_time_score);
comments += `, new_difficulty: ${new_difficulty}`;


const new_interval_r90 = plv8.find_function("fsrs_interval")(desired_retention, new_stability);
const scheduled_for = new Date(Date.now() + (new_interval_r90 * 24 * 60 * 60 * 1000));
comments += `, new_interval_r90: ${new_interval_r90}, scheduled_for: ${scheduled_for}`;


const insertedResult = plv8.execute(
	`INSERT INTO public.user_card_scheduled (user_card_id, last_user_card_schedule_id, review_time_difficulty, review_time_stability, review_time_retrievability, review_time_score, new_difficulty, new_stability, new_interval_r90, scheduled_for) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
	[user_card_id, last_user_card_schedule_id, review_time_difficulty, review_time_stability, review_time_retrievability, review_time_score, new_difficulty, new_stability, new_interval_r90, scheduled_for]
);
plv8.elog(LOG, 'Finished record_review_and_schedule: ', comments)


return insertedResult?.[0];
$function$;
