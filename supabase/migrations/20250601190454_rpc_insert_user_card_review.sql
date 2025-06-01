set
	check_function_bodies = off;

create
or replace function "public"."insert_user_card_review" (
	"phrase_id" "uuid",
	"lang" character varying,
	"score" integer,
	"day_session" "text",
	"desired_retention" numeric default 0.9
) returns "public"."user_card_review" language "plv8" as $_$

// auth check should be unnecessary because of RLS but it
// should also be redundant for the planner
const prevReviewQuery = plv8.execute("SELECT * FROM public.user_card_review WHERE phrase_id = $1 AND uid = auth.uid() ORDER BY created_at DESC LIMIT 1", [phrase_id])
// throw new Error('prevReviewQuery: ' + JSON.stringify(prevReviewQuery))

const prev = prevReviewQuery[0] ?? null

var calc = {
	current: new Date(),
	review_time_retrievability: null,
	difficulty: null,
	stability: null,
	new_interval: null,
	scheduled_for: null
}
// throw new Error(`prev.id ${prev.id}`)

if (!prev) {
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

const insertedResult = plv8.execute(
	`INSERT INTO public.user_card_review (score, phrase_id, lang, day_session, review_time_retrievability, difficulty, stability) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
	[
		score,
		phrase_id,
		lang,
		day_session,
		calc.review_time_retrievability,
		calc.difficulty,
		calc.stability
	]
);

const response = insertedResult[0] ?? null;
if (!response) throw new Error(`Got all the way to the end and then no row was inserted for ${phrase_id}, ${score}, prev: ${JSON.stringify(prev)}, calc: ${JSON.stringify(calc)}`)
return response

$_$;