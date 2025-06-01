alter table "public"."user_card"
drop constraint "ensure_phrases_unique_within_deck";

alter table "public"."user_card"
drop constraint "user_card_user_deck_id_fkey";

alter table "public"."user_card_review"
drop constraint "user_card_review_user_card_id_fkey";

alter table "public"."user_card_review"
drop constraint "user_card_review_user_deck_id_fkey";

drop function if exists "public"."insert_user_card_review" (
	user_card_id uuid,
	score integer,
	day_session text,
	desired_retention numeric
);

drop view if exists "public"."phrase_plus";

drop view if exists "public"."meta_phrase_info";

drop view if exists "public"."user_card_plus";

drop view if exists "public"."user_deck_plus";

drop index if exists "public"."ensure_phrases_unique_within_deck";

alter table "public"."user_card"
drop column "user_deck_id";

alter table "public"."user_card_review"
drop column "user_card_id";

alter table "public"."user_card_review"
drop column "user_deck_id";

alter table "public"."user_card_review"
alter column "phrase_id"
set not null;

alter table "public"."user_card"
add constraint "user_card_lang_uid_fkey" foreign key (lang, uid) references user_deck (lang, uid) not valid;

alter table "public"."user_card" validate constraint "user_card_lang_uid_fkey";

alter table "public"."user_card_review"
add constraint "user_card_review_lang_uid_fkey" foreign key (lang, uid) references user_deck (lang, uid) not valid;

alter table "public"."user_card_review" validate constraint "user_card_review_lang_uid_fkey";

alter table "public"."user_card_review"
add constraint "user_card_review_phrase_id_uid_fkey" foreign key (phrase_id, uid) references user_card (phrase_id, uid) not valid;

alter table "public"."user_card_review" validate constraint "user_card_review_phrase_id_uid_fkey";

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

// auth check should be unnecessary because of RLS but it
// should also be redundant for the planner
const prevReviewQuery = plv8.execute("SELECT * FROM public.user_card_review WHERE phrase_id = $1 ORDER BY created_at DESC LIMIT 1", [phrase_id])
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

$function$;

create or replace view
	"public"."meta_phrase_info" as
with
	recent_review as (
		select
			r1.id,
			r1.uid,
			r1.phrase_id,
			r1.lang,
			r1.score,
			r1.difficulty,
			r1.stability,
			r1.review_time_retrievability,
			r1.created_at,
			r1.updated_at
		from
			(
				user_card_review r1
				left join user_card_review r2 on (
					(
						(r1.phrase_id = r2.phrase_id)
						and (r1.created_at < r2.created_at)
					)
				)
			)
		where
			(r2.created_at is null)
	),
	card_with_recentest_review as (
		select distinct
			c.phrase_id,
			c.status,
			r.difficulty,
			r.stability,
			r.created_at as recentest_review_at
		from
			(
				user_card c
				join recent_review r on ((c.phrase_id = r.phrase_id))
			)
	),
	results as (
		select
			p.id,
			p.created_at,
			p.lang,
			p.text,
			avg(c.difficulty) as avg_difficulty,
			avg(c.stability) as avg_stability,
			count(distinct c.phrase_id) as count_cards,
			sum(
				case
					when (c.status = 'active'::card_status) then 1
					else 0
				end
			) as count_active,
			sum(
				case
					when (c.status = 'learned'::card_status) then 1
					else 0
				end
			) as count_learned,
			sum(
				case
					when (c.status = 'skipped'::card_status) then 1
					else 0
				end
			) as count_skipped
		from
			(
				phrase p
				left join card_with_recentest_review c on ((c.phrase_id = p.id))
			)
		group by
			p.id,
			p.lang,
			p.text
	)
select
	results.id,
	results.created_at,
	results.lang,
	results.text,
	results.avg_difficulty,
	results.avg_stability,
	results.count_cards,
	results.count_active,
	results.count_learned,
	results.count_skipped,
	case
		when (results.count_cards = 0) then null::numeric
		else round(((results.count_active / results.count_cards))::numeric, 2)
	end as percent_active,
	case
		when (results.count_cards = 0) then null::numeric
		else round(((results.count_learned / results.count_cards))::numeric, 2)
	end as percent_learned,
	case
		when (results.count_cards = 0) then null::numeric
		else round(((results.count_skipped / results.count_cards))::numeric, 2)
	end as percent_skipped,
	rank() over (
		partition by
			results.lang
		order by
			results.avg_difficulty
	) as rank_least_difficult,
	rank() over (
		partition by
			results.lang
		order by
			results.avg_stability desc nulls last
	) as rank_most_stable,
	rank() over (
		partition by
			results.lang
		order by
			case
				when (results.count_cards > 0) then (
					(results.count_skipped)::numeric / (results.count_cards)::numeric
				)
				else null::numeric
			end
	) as rank_least_skipped,
	rank() over (
		partition by
			results.lang
		order by
			case
				when (results.count_cards > 0) then (
					(results.count_learned)::numeric / (results.count_cards)::numeric
				)
				else null::numeric
			end desc nulls last
	) as rank_most_learned,
	rank() over (
		partition by
			results.lang
		order by
			results.created_at desc
	) as rank_newest
from
	results;

create
or replace function public.update_user_card_review (review_id uuid, score integer) returns user_card_review language plv8 as $function$

const reviewQuery = plv8.execute("SELECT * FROM public.user_card_review WHERE id = $1", [review_id])
const review = reviewQuery[0] ?? null
if (!review) throw new Error(`Could not update because we couldn't find a review with ID ${review_id}`)

const prevReviewQuery = plv8.execute("SELECT * FROM public.user_card_review WHERE phrase_id = $1 AND created_at < $2 ORDER BY created_at DESC LIMIT 1", [review.phrase_id, review.created_at])
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

$function$;

create or replace view
	"public"."user_card_plus" as
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
			(
				user_card_review rev
				left join user_card_review rev2 on (
					(
						(rev.phrase_id = rev2.phrase_id)
						and (rev.created_at < rev2.created_at)
					)
				)
			)
		where
			(rev2.created_at is null)
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
	fsrs_retrievability (
		(
			(
				extract(
					epoch
					from
						(current_timestamp - review.created_at)
				) / (3600)::numeric
			) / (24)::numeric
		),
		review.stability
	) as retrievability_now
from
	(
		user_card card
		left join review on ((card.phrase_id = review.phrase_id))
	);

create or replace view
	"public"."user_deck_plus" as
select
	d.uid,
	d.lang,
	d.learning_goal,
	d.archived,
	(
		select
			l.name
		from
			language l
		where
			((l.lang)::text = (d.lang)::text)
		limit
			1
	) as language,
	d.created_at,
	count(*) filter (
		where
			(c.status = 'learned'::card_status)
	) as cards_learned,
	count(*) filter (
		where
			(c.status = 'active'::card_status)
	) as cards_active,
	count(*) filter (
		where
			(c.status = 'skipped'::card_status)
	) as cards_skipped,
	(
		select
			count(*) as count
		from
			phrase p
		where
			((p.lang)::text = (d.lang)::text)
	) as lang_total_phrases,
	(
		select
			max(c.created_at) as max
		from
			user_card_review r
		where
			((r.lang)::text = (d.lang)::text)
		limit
			1
	) as most_recent_review_at,
	(
		select
			count(*) as count
		from
			user_card_review r
		where
			(
				((r.lang)::text = (d.lang)::text)
				and (r.created_at > (now() - '7 days'::interval))
			)
		limit
			1
	) as count_reviews_7d,
	(
		select
			count(*) as count
		from
			user_card_review r
		where
			(
				((r.lang)::text = (d.lang)::text)
				and (r.created_at > (now() - '7 days'::interval))
				and (r.score >= 2)
			)
		limit
			1
	) as count_reviews_7d_positive
from
	(
		user_deck d
		left join user_card c on (((d.lang)::text = (c.lang)::text))
	)
group by
	d.uid,
	d.lang,
	d.learning_goal,
	d.archived,
	d.created_at
order by
	(
		select
			count(*) as count
		from
			user_card_review r
		where
			(
				((r.lang)::text = (d.lang)::text)
				and (r.created_at > (now() - '7 days'::interval))
			)
		limit
			1
	) desc nulls last,
	d.created_at desc;