alter table "public"."user_card_review"
add column "day_session" date;

update "public"."user_card_review"
set
	day_session = (created_at - interval '04:00:00'::interval hour)::date;

alter table "public"."user_card_review"
alter column "day_session"
set not null;

drop function if exists "public"."insert_user_card_review" (user_card_id uuid, score integer, desired_retention numeric);

set
	check_function_bodies = off;

create or replace function public.insert_user_card_review (
	user_card_id uuid,
	score integer,
	day_session text,
	desired_retention numeric default 0.9
) returns user_card_review language plv8 as $function$

const prevReviewQuery = plv8.execute("SELECT card.user_deck_id, card.id AS user_card_id, review.id, review.created_at, review.review_time_retrievability, review.difficulty, review.stability FROM public.user_card_plus AS card LEFT JOIN public.user_card_review AS review ON (review.user_card_id = card.id) WHERE card.id = $1 ORDER BY review.created_at DESC LIMIT 1", [user_card_id])
// throw new Error('prevReviewQuery: ' + JSON.stringify(prevReviewQuery))

const prev = prevReviewQuery[0] ?? null
if (!prev?.user_card_id) throw new Error(`could not find that card, got "${prev.user_card_id}" looking for "${user_card_id}" to record score: ${score}`)

var calc = {
	current: new Date(),
	review_time_retrievability: null,
	difficulty: null,
	stability: null,
	new_interval: null,
	scheduled_for: null
}
// throw new Error(`prev.id ${prev.id}`)

if (prev.id === null) {
	calc.stability = plv8.find_function("fsrs_s_0")(score)
	calc.difficulty = plv8.find_function("fsrs_d_0")(score)
	calc.review_time_retrievability = null
} else {
	const time_between_reviews = plv8.find_function("fsrs_days_between")(prev.created_at, calc.current)
	if (typeof time_between_reviews !== 'number' || time_between_reviews < -1)
		throw new Error(`Time between reviews is not a number or is less than -1 (can''t have a most recent review in the future). value calculated as: ${time_between_reviews}, for ${prev.created_at} and ${calc.current}`)
	try {
		calc.review_time_retrievability = plv8.find_function("fsrs_retrievability")(time_between_reviews, prev.stability)
		if (typeof calc.review_time_retrievability !== 'number' || calc.review_time_retrievability > 1 || calc.review_time_retrievability < 0) throw new Error(`retrievability is not a number or has wrong value: ${calc.review_time_retrievability}`)
		calc.stability = plv8.find_function("fsrs_stability")(prev.difficulty, prev.stability, calc.review_time_retrievability, score)
		calc.difficulty = plv8.find_function("fsrs_difficulty")(prev.difficulty, score)
	} catch(e) {
		throw new Error(`Something went wrong in the main calc part.` + JSON.stringify([prev, calc]))
	}
}

if (typeof calc.stability !== 'number' || typeof calc.difficulty !== 'number' || calc.stability < 0 || calc.difficulty > 10 || calc.difficulty < 1) {
	throw new Error(`Difficulty or stability is out of range: ${calc.difficulty}, ${calc.stability}`)
	return null
}

// assign interval (a float, rounded to an integer) and schedule date
try {
	calc.new_interval = score === 1 ? 1 : Math.max(
		Math.round(
			plv8.find_function("fsrs_interval")(desired_retention, calc.stability)
		),
		1.0
	)
	calc.scheduled_for = new Date(
		calc.current.setDate(
			calc.current.getDate() + calc.new_interval
		)
	)
} catch(e) {
	throw new Error('Something went wrong in the scheduling part' + JSON.stringify(calc))
}

if (!calc.scheduled_for) {
	throw new Error(`New scheduled_for value is not working...`)
	return null
}

// console.log(`Throwing before the thing: ${JSON.stringify(user_card_id, prev, calc)}`)

const insertedResult = plv8.execute(
	`INSERT INTO public.user_card_review (score, user_card_id, user_deck_id, day_session, review_time_retrievability, difficulty, stability) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
	[
		score,
		user_card_id,
		prev.user_deck_id,
		day_session,
		calc.review_time_retrievability,
		calc.difficulty,
		calc.stability
	]
);

const response = insertedResult[0] ?? null;
if (!response) throw new Error(`Got all the way to the end and then no row was inserted for ${user_card_id}, ${score}, prev: ${JSON.stringify(prev)}, calc: ${JSON.stringify(calc)}`)
return response

$function$;
