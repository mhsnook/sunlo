create or replace function public.fsrs_days_between (date_before timestamptz, date_after timestamptz) returns numeric language plv8 as $function$
	// returns interval, in days, rounded to the second
	return Math.round((new Date(date_after) - new Date(date_before)) / 60 / 60 / 24) / 1000;
$function$;

alter table "public"."user_card_scheduled"
add column "reviewed_at" timestamp with time zone;

drop function public.record_review_and_schedule;

create or replace function public.record_review_and_schedule (user_card_id uuid, score integer) returns user_card_scheduled language plv8 as $function$

var calc = {
	reviewed_at: new Date(),
	review_time_retrievability: null,
	new_difficulty: null,
	new_stability: null,
	new_interval_r90: null,
	scheduled_for: null
}

const desired_retention = 0.9
const prevResult = plv8.execute("SELECT c.user_deck_id, s.id, s.reviewed_at, s.new_difficulty AS difficulty, s.new_stability AS stability FROM public.user_card_plus AS c LEFT JOIN public.user_card_scheduled AS s ON (s.user_card_id = c.id) WHERE c.id = $1 ORDER BY s.reviewed_at DESC LIMIT 1", [user_card_id])
const prev = prevResult[0] ?? null

if (!prev) throw new Error(`could not find a card "${user_card_id}" to record score: ${score}`)
// throw new Error(`prev.id ${prev.id}`)

if (prev.id === null) {
	calc.new_stability = plv8.find_function("fsrs_s_0")(score)
	calc.new_difficulty = plv8.find_function("fsrs_d_0")(score)
} else {
	const time_between_reviews = plv8.find_function("fsrs_days_between")(prev.reviewed_at, calc.reviewed_at)
	if (typeof time_between_reviews !== 'number' || time_between_reviews < -1)
		throw new Error(`Time between reviews is not a number or is less than -1 (can''t have a most recent review in the future). value calculated as: ${time_between_reviews}, for ${prev.reviewed_at} and ${calc.reviewed_at}`)
	try {
		calc.review_time_retrievability = plv8.find_function("fsrs_retrievability")(time_between_reviews, prev.stability)
		if (typeof calc.review_time_retrievability !== 'number' || calc.review_time_retrievability > 1 || calc.review_time_retrievability < 0) throw new Error(`retrievability is not a number or has wrong value: ${calc.review_time_retrievability}`)
		calc.new_stability = plv8.find_function("fsrs_stability")(prev.difficulty, prev.stability, calc.review_time_retrievability, score)
		calc.new_difficulty = plv8.find_function("fsrs_difficulty")(prev.difficulty, score)
	} catch(e) {
		throw new Error(`Something went wrong in the main calc part.` + JSON.stringify([prev, calc]))
	}
}

if (typeof calc.new_stability !== 'number' || typeof calc.new_difficulty !== 'number' || calc.new_stability < 0 || calc.new_difficulty > 10 || calc.new_difficulty < 1) {
	throw new Error(`Difficulty or stability is out of range: ${calc.new_difficulty}, ${calc.new_stability}`)
	return null
}


// assign interval (a float, rounded to an integer) and schedule date
try {
	calc.new_interval_r90 = score === 1 ? 1 : Math.max(
		Math.round(
			plv8.find_function("fsrs_interval")(desired_retention, calc.new_stability)
		),
		1.0
	)
	var date_obj = new Date(calc.reviewed_at)
	calc.scheduled_for = new Date(
		date_obj.setDate(
			date_obj.getDate() + calc.new_interval_r90
		)
	)
} catch(e) {
	throw new Error('Something went wrong in the scheduling part' + JSON.stringify(calc))
}

if (typeof calc.new_interval_r90 !== 'number') {
	throw new Error(`New interval is not a number: ${calc.new_interval_r90}`)
	return null
}


const insertedResult = plv8.execute(
	`INSERT INTO public.user_card_scheduled (updated_at, reviewed_at, score, user_card_id, user_deck_id, prev_id, review_time_difficulty, review_time_stability, review_time_retrievability, new_difficulty, new_stability, new_interval_r90, scheduled_for) VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
	[
		calc.reviewed_at,
		score,
		user_card_id,
		prev.user_deck_id,
		prev.id,
		prev.difficulty,
		prev.stability,
		calc.review_time_retrievability,
		calc.new_difficulty,
		calc.new_stability,
		calc.new_interval_r90,
		calc.scheduled_for
	]
);

const response = insertedResult[0] ?? null;
if (!response) throw new Error(`Got all the way to the end and then no row was inserted for ${user_card_id}, ${score}, prev: ${JSON.stringify(prev)}, calc: ${JSON.stringify(calc)}`)
return response

$function$;
