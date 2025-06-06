alter table "public"."user_card"
alter column "lang"
set not null;

alter table "public"."user_card_review"
add column "day_first_review" boolean not null default true;

revoke delete on table "public"."user_card_review"
from
	"anon";

revoke insert on table "public"."user_card_review"
from
	"anon";

revoke references on table "public"."user_card_review"
from
	"anon";

revoke
select
	on table "public"."user_card_review"
from
	"anon";

revoke trigger on table "public"."user_card_review"
from
	"anon";

revoke
truncate on table "public"."user_card_review"
from
	"anon";

revoke
update on table "public"."user_card_review"
from
	"anon";

set
	check_function_bodies = off;

create
or replace function public.insert_user_card_review (
	phrase_id uuid,
	lang character varying,
	score integer,
	day_session text,
	desired_retention numeric default 0.9
) returns user_card_review language plv8 as $function$

//-- auth check may be redundant for permissions but it will help the planner
//-- we're fetching the most recent review, whether it was today or another day
const prevReviewQuery = plv8.execute("SELECT id, created_at, difficulty, stability, review_time_retrievability, day_first_review, to_char(day_session, 'YYYY-DD-MM') as day_session FROM public.user_card_review WHERE phrase_id = $1 AND uid = auth.uid() ORDER BY created_at DESC LIMIT 1", [phrase_id])
//-- throw new Error('prevReviewQuery: ' + JSON.stringify(prevReviewQuery))

const prev = prevReviewQuery[0] ?? null

const current_timestamp = new Date()

var calc = {
	created_at: current_timestamp,
	difficulty: null,
	stability: null,
	review_time_retrievability: null,
	day_first_review: true,
}

if (!prev) {
	//-- first review _ever_ gets slightly different calculation
	calc.stability = plv8.find_function("fsrs_s_0")(score)
	calc.difficulty = plv8.find_function("fsrs_d_0")(score)
	calc.review_time_retrievability = null
}
else if (prev.day_session === day_session) {
	// previous review was from today so we do not calculate new values
	calc.difficulty = prev.difficulty
	calc.stability = prev.stability
	calc.review_time_retrievability = prev.review_time_retrievability
	calc.day_first_review = false
} else {
	//-- this is the main calculation block
	const time_between_reviews = plv8.find_function("fsrs_days_between")(prev.created_at, calc.created_at)
	if (typeof time_between_reviews !== 'number' || time_between_reviews < -1)
		throw new Error(`Time between reviews is not a number or is less than -1 (can''t have a most recent review in the future). value calculated as: ${time_between_reviews}, for ${prev.created_at} and ${calc.created_at}`)
	try {
		calc.review_time_retrievability = plv8.find_function("fsrs_retrievability")(time_between_reviews, prev.stability)
			if (typeof calc.review_time_retrievability !== 'number' || calc.review_time_retrievability > 1 || calc.review_time_retrievability < 0)
				throw new Error(`retrievability is not a number or has wrong value: ${calc.review_time_retrievability}`)
		calc.stability = plv8.find_function("fsrs_stability")(prev.difficulty, prev.stability, calc.review_time_retrievability, score)
		calc.difficulty = plv8.find_function("fsrs_difficulty")(prev.difficulty, score)
	} catch(e) {
		throw new Error(`Something went wrong in the main calc part.` + JSON.stringify([prev, calc]))
	}
}

//-- this should all be covered by DB constraints...
if (typeof calc.stability !== 'number' || typeof calc.difficulty !== 'number' || calc.stability < 0 || calc.difficulty > 10 || calc.difficulty < 1) {
	throw new Error(`Difficulty or stability is out of range: ${calc.difficulty}, ${calc.stability}`)
	return null
}

const insertedResult = plv8.execute(
	`INSERT INTO public.user_card_review (score, phrase_id, lang, day_session, review_time_retrievability, difficulty, stability, day_first_review) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
	[
		score,
		phrase_id,
		lang,
		day_session,
		calc.review_time_retrievability,
		calc.difficulty,
		calc.stability,
		calc.day_first_review
	]
);

const response = insertedResult[0] ?? null;
if (!response) throw new Error(`Got all the way to the end and then no row was inserted for ${phrase_id}, ${score}, prev: ${JSON.stringify(prev)}, calc: ${JSON.stringify(calc)}`)
return response

$function$;

create
or replace function public.update_user_card_review (review_id uuid, score integer) returns user_card_review language plv8 as $function$

const reviewQuery = plv8.execute("SELECT * FROM public.user_card_review WHERE id = $1", [review_id])
const review = reviewQuery[0] ?? null
if (!review) throw new Error(`Could not update because we couldn't find a review with ID ${review_id}`)

if (review.day_first_review === false) {
	//-- if this is not the first review of the day, we will not be updating the stability and difficulty
	const updatedSecondReview = plv8.execute(
		`UPDATE public.user_card_review SET score = $1 WHERE id = $2 RETURNING *`,
		[
			score,
			review_id
		]
	)
	return updatedSecondReview[0] ?? null
}
//-- otherwise, it is the first of the day and we have to recalculate
//-- any previous reviews will be from an earlier day, we do not select
//-- on whether the previous review was the first of the day or not
const prevReviewQuery = plv8.execute("SELECT * FROM public.user_card_review WHERE phrase_id = $1 AND uid = auth.uid() AND created_at < $2 ORDER BY created_at DESC LIMIT 1", [review.phrase_id, review.created_at])
const prev = prevReviewQuery[0] ?? null

var calc = {
	current: review.created_at,
	review_time_retrievability: review.review_time_retrievability,
	difficulty: null,
	stability: null
}

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

$function$;