set
	check_function_bodies = off;

create
or replace function "public"."update_user_card_review" ("review_id" "uuid", "score" integer) returns "public"."user_card_review" language "plv8" as $_$

const reviewQuery = plv8.execute("SELECT * FROM public.user_card_review WHERE id = $1", [review_id])
const review = reviewQuery[0] ?? null
if (!review) throw new Error(`Could not update because we couldn't find a review with ID ${review_id}`)

const prevReviewQuery = plv8.execute("SELECT * FROM public.user_card_review WHERE phrase_id = $1 AND uid = auth.uid() AND created_at < $2 ORDER BY created_at DESC LIMIT 1", [review.phrase_id, review.created_at])
const prev = prevReviewQuery[0] ?? null

var calc = {
	current: review.created_at,
	review_time_retrievability: review.review_time_retrievability,
	difficulty: null,
	stability: null
}
// throw new Error(`prev.id ${prev.id}`)

if (!prev) {
	calc.stability = plv8.find_function("fsrs_s_0")(score)
	calc.difficulty = plv8.find_function("fsrs_d_0")(score)
} else {
	const time_between_reviews = plv8.find_function("fsrs_days_between")(prev.created_at, calc.current)
	if (typeof time_between_reviews !== 'number' || time_between_reviews < -1)
		throw new Error(`Time between reviews is not a number or is less than -1 (can''t have a most recent review in the future). value calculated as: ${time_between_reviews}, for ${prev.created_at} and ${calc.current}`)
	try {
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

const updatedResult = plv8.execute(
	`UPDATE public.user_card_review SET score = $1, difficulty = $2, stability = $3 WHERE id = $4 RETURNING *`,
	[
		score,
		calc.difficulty,
		calc.stability,
		review_id
	]
);

const response = updatedResult[0] ?? null;
if (!response) throw new Error(`Got all the way to the end and did not manage to update anything. for review ${review_id}, card ${review.phrase_id}, ${score}, prev: ${JSON.stringify(prev)}, calc: ${JSON.stringify(calc)}`)
return response

$_$;