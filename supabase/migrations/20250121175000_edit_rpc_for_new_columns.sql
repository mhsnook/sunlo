alter table "public"."user_card_scheduled"
add column "updated_at" timestamp with time zone not null default now();

drop function if exists "public"."record_review_and_schedule" (
	user_card_id uuid,
	review_time_retrievability numeric,
	review_time_score integer
);

create or replace function public.record_review_and_schedule (
	user_card_id uuid,
	review_time_retrievability numeric,
	score integer
) returns user_card_scheduled language plv8 as $function$

const desired_retention = 0.9;
var comments = '';
const thisCardResult = plv8.execute("SELECT c.user_deck_id, s.id as prev_id, s.created_at as prev_created_at, c.uid, s.new_difficulty, s.new_stability FROM public.user_card_plus AS c LEFT JOIN public.user_card_scheduled AS s ON (s.user_card_id = c.id) WHERE c.id = $1 AND s.user_card_id = $1 ORDER BY s.created_at DESC LIMIT 1", [user_card_id]);

comments += `thisCardResult.length: ${thisCardResult.length}`;

const thisCard = thisCardResult?.[0];
// -- if (!thisCard) raise an exception

const user_deck_id = thisCard.user_deck_id;
const prev_id = thisCard.prev_id || null;
comments += `, previous review created_at: ${thisCard?.prev_created_at}, prev_id: ${thisCard?.prev_id}, user_deck_id: ${thisCard.user_deck_id}`;

const review_time_difficulty = thisCard.new_difficulty || null;
const review_time_stability = thisCard.new_stability || null;
comments += `, prev_id: ${prev_id}, review_time_difficulty: ${review_time_difficulty}, review_time_stability: ${review_time_stability}`;

const new_stability = prev_id ?
		plv8.find_function("fsrs_stability")(review_time_difficulty, review_time_stability, review_time_retrievability, score)
	: plv8.find_function("fsrs_s_0")(score);
comments += `, new_stability: ${new_stability}`;

const new_difficulty = prev_id ? plv8.find_function("fsrs_difficulty")(review_time_difficulty, score) : plv8.find_function("fsrs_d_0")(score);
comments += `, new_difficulty: ${new_difficulty}`;

const new_interval_r90 = plv8.find_function("fsrs_interval")(desired_retention, new_stability);
const scheduled_for = new Date(Date.now() + (new_interval_r90 * 24 * 60 * 60 * 1000));
comments += `, new_interval_r90: ${new_interval_r90}, scheduled_for: ${scheduled_for}`;

const insertedResult = plv8.execute(
	`INSERT INTO public.user_card_scheduled (updated_at, user_card_id, user_deck_id, prev_id, review_time_difficulty, review_time_stability, review_time_retrievability, score, new_difficulty, new_stability, new_interval_r90, scheduled_for) VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
	[user_card_id, user_deck_id, prev_id, review_time_difficulty, review_time_stability, review_time_retrievability, score, new_difficulty, new_stability, new_interval_r90, scheduled_for]
);
plv8.elog(LOG, 'Finished record_review_and_schedule: ', comments);

return insertedResult?.[0];

$function$;
