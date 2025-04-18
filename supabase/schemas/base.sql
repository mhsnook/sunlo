set
	statement_timeout = 0;

set
	lock_timeout = 0;

set
	idle_in_transaction_session_timeout = 0;

set
	client_encoding = 'UTF8';

set
	standard_conforming_strings = on;

select
	pg_catalog.set_config ('search_path', '', false);

set
	check_function_bodies = false;

set
	xmloption = content;

set
	client_min_messages = warning;

set
	row_security = off;

-- CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";
alter schema "public" OWNER to "postgres";

create extension IF not exists "plv8"
with
	SCHEMA "pg_catalog";

create extension IF not exists "pg_stat_statements"
with
	SCHEMA "extensions";

create extension IF not exists "pgcrypto"
with
	SCHEMA "extensions";

create extension IF not exists "pgjwt"
with
	SCHEMA "extensions";

create extension IF not exists "supabase_vault"
with
	SCHEMA "vault";

create extension IF not exists "uuid-ossp"
with
	SCHEMA "extensions";

create type "public"."card_status" as ENUM('active', 'learned', 'skipped');

alter type "public"."card_status" OWNER to "postgres";

COMMENT on TYPE "public"."card_status" is 'card status is either active, learned or skipped';

create type "public"."friend_request_response" as ENUM('accept', 'decline', 'cancel', 'remove', 'invite');

alter type "public"."friend_request_response" OWNER to "postgres";

create type "public"."learning_goal" as ENUM('moving', 'family', 'visiting');

alter type "public"."learning_goal" OWNER to "postgres";

COMMENT on TYPE "public"."learning_goal" is 'why are you learning this language?';

create or replace function "public"."add_phrase_translation_card" (
	"text" "text",
	"lang" "text",
	"translation_text" "text",
	"translation_lang" "text"
) RETURNS "uuid" LANGUAGE "plpgsql" as $$
DECLARE
    new_phrase_id uuid;
    user_deck_id uuid;
BEGIN
    -- get the deck ID
    SELECT id into user_deck_id FROM user_deck AS d 
    WHERE d.lang = add_phrase_translation_card.lang AND d.uid = auth.uid() 
    LIMIT 1;
    
    -- Insert a new phrase and get the id
    INSERT INTO phrase (text, lang)
    VALUES (text, lang)
    RETURNING id INTO new_phrase_id;

    -- Insert the translation for the new phrase
    INSERT INTO phrase_translation (phrase_id, text, lang)
    VALUES (new_phrase_id, translation_text, translation_lang);

    -- Insert a new user card for the authenticated user
    INSERT INTO user_card (phrase_id, status, user_deck_id)
    VALUES (new_phrase_id, 'active', user_deck_id);

    RETURN new_phrase_id;
END;
$$;

alter function "public"."add_phrase_translation_card" (
	"text" "text",
	"lang" "text",
	"translation_text" "text",
	"translation_lang" "text"
) OWNER to "postgres";

create or replace function "public"."fsrs_clamp_d" ("difficulty" numeric) RETURNS numeric LANGUAGE "plv8" as $$
  return Math.min(Math.max(difficulty, 1.0), 10.0);
$$;

alter function "public"."fsrs_clamp_d" ("difficulty" numeric) OWNER to "postgres";

create or replace function "public"."fsrs_d_0" ("score" integer) RETURNS numeric LANGUAGE "plv8" as $$
	const W_4 = 7.1949;
	const W_5 = 0.5345;
	return plv8.find_function("fsrs_clamp_d")(W_4 - Math.exp(W_5 * (score - 1.0)) + 1.0);
$$;

alter function "public"."fsrs_d_0" ("score" integer) OWNER to "postgres";

create or replace function "public"."fsrs_days_between" (
	"date_before" timestamp with time zone,
	"date_after" timestamp with time zone
) RETURNS numeric LANGUAGE "plv8" as $$
	// returns interval, in days, rounded to the second
	return Math.round((new Date(date_after) - new Date(date_before)) / 60 / 60 / 24) / 1000;
$$;

alter function "public"."fsrs_days_between" (
	"date_before" timestamp with time zone,
	"date_after" timestamp with time zone
) OWNER to "postgres";

create or replace function "public"."fsrs_delta_d" ("score" integer) RETURNS numeric LANGUAGE "plv8" as $$
	const W_6 = 1.4604;
  return -W_6 * (score - 3.0);
$$;

alter function "public"."fsrs_delta_d" ("score" integer) OWNER to "postgres";

create or replace function "public"."fsrs_difficulty" ("difficulty" numeric, "score" integer) RETURNS numeric LANGUAGE "plv8" as $$
	const W_7 = 0.0046;
	return plv8.find_function("fsrs_clamp_d")(W_7 * plv8.find_function("fsrs_d_0")(4) + (1.0 - W_7) * plv8.find_function("fsrs_dp")(difficulty, score));
$$;

alter function "public"."fsrs_difficulty" ("difficulty" numeric, "score" integer) OWNER to "postgres";

create or replace function "public"."fsrs_dp" ("difficulty" numeric, "score" integer) RETURNS numeric LANGUAGE "plv8" as $$
	return difficulty + plv8.find_function("fsrs_delta_d")(score) * ((10.0 - difficulty) / 9.0);
$$;

alter function "public"."fsrs_dp" ("difficulty" numeric, "score" integer) OWNER to "postgres";

create or replace function "public"."fsrs_interval" (
	"desired_retrievability" numeric,
	"stability" numeric
) RETURNS numeric LANGUAGE "plv8" as $$
	const f = 19.0 / 81.0;
	const c = -0.5;
	return (stability / f) * (Math.pow(desired_retrievability, 1.0 / c) - 1.0);
$$;

alter function "public"."fsrs_interval" (
	"desired_retrievability" numeric,
	"stability" numeric
) OWNER to "postgres";

create or replace function "public"."fsrs_retrievability" ("time_in_days" numeric, "stability" numeric) RETURNS numeric LANGUAGE "plv8" as $$
	const f = 19.0 / 81.0;
	const c = -0.5;
	return Math.pow(1.0 + f * (time_in_days / stability), c);
$$;

alter function "public"."fsrs_retrievability" ("time_in_days" numeric, "stability" numeric) OWNER to "postgres";

create or replace function "public"."fsrs_s_0" ("score" integer) RETURNS numeric LANGUAGE "plv8" as $$
	const W = [0.40255, 1.18385, 3.173, 15.69105];
	return W[score - 1];
$$;

alter function "public"."fsrs_s_0" ("score" integer) OWNER to "postgres";

create or replace function "public"."fsrs_s_fail" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric
) RETURNS numeric LANGUAGE "plv8" as $$
	const W_11 = 1.9395;
	const W_12 = 0.11;
	const W_13 = 0.29605;
	const W_14 = 2.2698;
	const d_f = Math.pow(difficulty, -W_12);
	const s_f = Math.pow(stability + 1.0, W_13) - 1.0;
	const r_f = Math.exp(W_14 * (1.0 - review_time_retrievability));
	const c_f = W_11;
	const s_f2 = d_f * s_f * r_f * c_f;
	return Math.min(s_f2, stability);
$$;

alter function "public"."fsrs_s_fail" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric
) OWNER to "postgres";

create or replace function "public"."fsrs_s_success" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" integer
) RETURNS numeric LANGUAGE "plv8" as $$
	const W_8 = 1.54575;
	const W_9 = 0.1192;
	const W_10 = 1.01925;
	const W_15 = 0.2315;
	const W_16 = 2.9898;
	const t_d = 11.0 - difficulty;
	const t_s = Math.pow(stability, -W_9);
	const t_r = Math.exp(W_10 * (1.0 - review_time_retrievability)) - 1.0;
	const h = score === 2 ? W_15 : 1.0;
	const b = score === 4 ? W_16 : 1.0;
	const c = Math.exp(W_8);
	const alpha = 1.0 + t_d * t_s * t_r * h * b * c;
  return stability * alpha;
$$;

alter function "public"."fsrs_s_success" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" integer
) OWNER to "postgres";

create or replace function "public"."fsrs_stability" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" integer
) RETURNS numeric LANGUAGE "plv8" as $$
	return (score === 1) ?
			plv8.find_function("fsrs_s_fail")(difficulty, stability, review_time_retrievability)
		: plv8.find_function("fsrs_s_success")(difficulty, stability, review_time_retrievability, score);
$$;

alter function "public"."fsrs_stability" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" integer
) OWNER to "postgres";

set
	default_tablespace = '';

set
	default_table_access_method = "heap";

create table if not exists "public"."user_card_scheduled" (
	"id" "uuid" default "gen_random_uuid" () not null,
	"created_at" timestamp with time zone default "now" () not null,
	"scheduled_for" timestamp with time zone default "now" () not null,
	"user_card_id" "uuid" not null,
	"uid" "uuid" default "auth"."uid" () not null,
	"new_difficulty" numeric not null,
	"new_stability" numeric not null,
	"review_time_difficulty" numeric,
	"review_time_stability" numeric,
	"score" smallint not null,
	"new_interval_r90" numeric default '1'::numeric not null,
	"review_time_retrievability" numeric,
	"prev_id" "uuid",
	"user_deck_id" "uuid",
	"updated_at" timestamp with time zone default "now" () not null,
	"reviewed_at" timestamp with time zone,
	constraint "user_card_scheduled_interval_r90_check" check (("new_interval_r90" > (0)::numeric)),
	constraint "user_card_scheduled_review_time_difficulty_check" check (
		(
			("review_time_difficulty" >= 0.0)
			and ("review_time_difficulty" <= 10.0)
		)
	),
	constraint "user_card_scheduled_review_time_stability_check" check (("review_time_stability" >= 0.0)),
	constraint "user_card_scheduled_score_check" check (("score" = any (array[1, 2, 3, 4])))
);

alter table "public"."user_card_scheduled" OWNER to "postgres";

COMMENT on table "public"."user_card_scheduled" is 'A record for each time a user_card is due to be reviewed';

COMMENT on column "public"."user_card_scheduled"."new_interval_r90" is 'days till the predicted interval till the Retrievability will be 0.90';

create or replace function "public"."record_review_and_schedule" ("user_card_id" "uuid", "score" integer) RETURNS "public"."user_card_scheduled" LANGUAGE "plv8" as $_$

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

$_$;

alter function "public"."record_review_and_schedule" ("user_card_id" "uuid", "score" integer) OWNER to "postgres";

create table if not exists "public"."friend_request_action" (
	"id" "uuid" default "gen_random_uuid" () not null,
	"uid_by" "uuid" not null,
	"uid_for" "uuid" not null,
	"created_at" timestamp with time zone default "now" () not null,
	"action_type" "public"."friend_request_response",
	"uid_less" "uuid",
	"uid_more" "uuid"
);

alter table "public"."friend_request_action" OWNER to "postgres";

COMMENT on column "public"."friend_request_action"."uid_less" is 'The lesser of the two UIDs (to prevent cases where B-A duplicates A-B)';

COMMENT on column "public"."friend_request_action"."uid_more" is 'The greater of the two UIDs (to prevent cases where B-A duplicates A-B)';

create or replace view "public"."friend_summary"
with
	("security_invoker" = 'true') as
select distinct
	on ("a"."uid_less", "a"."uid_more") "a"."uid_less",
	"a"."uid_more",
	case
		when (
			"a"."action_type" = 'accept'::"public"."friend_request_response"
		) then 'friends'::"text"
		when (
			"a"."action_type" = 'invite'::"public"."friend_request_response"
		) then 'pending'::"text"
		when (
			"a"."action_type" = any (
				array[
					'decline'::"public"."friend_request_response",
					'cancel'::"public"."friend_request_response",
					'remove'::"public"."friend_request_response"
				]
			)
		) then 'unconnected'::"text"
		else null::"text"
	end as "status",
	"a"."created_at" as "most_recent_created_at",
	"a"."uid_by" as "most_recent_uid_by",
	"a"."uid_for" as "most_recent_uid_for",
	"a"."action_type" as "most_recent_action_type"
from
	"public"."friend_request_action" "a"
order by
	"a"."uid_less",
	"a"."uid_more",
	"a"."created_at" desc;

alter table "public"."friend_summary" OWNER to "postgres";

create table if not exists "public"."language" (
	"name" "text" not null,
	"lang" character varying not null,
	"alias_of" character varying
);

alter table "public"."language" OWNER to "postgres";

COMMENT on table "public"."language" is 'The languages that people are trying to learn';

create table if not exists "public"."phrase" (
	"text" "text" not null,
	"id" "uuid" default "extensions"."uuid_generate_v4" () not null,
	"added_by" "uuid" default "auth"."uid" (),
	"lang" character varying not null,
	"created_at" timestamp with time zone default "now" ()
);

alter table "public"."phrase" OWNER to "postgres";

COMMENT on column "public"."phrase"."added_by" is 'User who added this card';

COMMENT on column "public"."phrase"."lang" is 'The 3-letter code for the language (iso-369-3)';

create table if not exists "public"."user_deck" (
	"id" "uuid" default "extensions"."uuid_generate_v4" () not null,
	"uid" "uuid" default "auth"."uid" () not null,
	"lang" character varying not null,
	"created_at" timestamp with time zone default "now" () not null,
	"learning_goal" "public"."learning_goal" default 'moving'::"public"."learning_goal" not null,
	"archived" boolean default false not null
);

alter table "public"."user_deck" OWNER to "postgres";

COMMENT on table "public"."user_deck" is 'A set of cards in one language which user intends to learn @graphql({"name": "UserDeck"})';

COMMENT on column "public"."user_deck"."uid" is 'The owner user''s ID';

COMMENT on column "public"."user_deck"."lang" is 'The 3-letter code for the language (iso-369-3)';

COMMENT on column "public"."user_deck"."created_at" is 'the moment the deck was created';

COMMENT on column "public"."user_deck"."learning_goal" is 'why are you learning this language?';

COMMENT on column "public"."user_deck"."archived" is 'is the deck archived or active';

create or replace view "public"."language_plus" as
with
	"first" as (
		select
			"l"."lang",
			"l"."name",
			"l"."alias_of",
			(
				select
					"count" (distinct "d"."uid") as "count"
				from
					"public"."user_deck" "d"
				where
					(("l"."lang")::"text" = ("d"."lang")::"text")
			) as "learners",
			(
				select
					"count" (distinct "p"."id") as "count"
				from
					"public"."phrase" "p"
				where
					(("l"."lang")::"text" = ("p"."lang")::"text")
			) as "phrases_to_learn"
		from
			"public"."language" "l"
		group by
			"l"."lang",
			"l"."name",
			"l"."alias_of"
	),
	"second" as (
		select
			"first"."lang",
			"first"."name",
			"first"."alias_of",
			"first"."learners",
			"first"."phrases_to_learn",
			("first"."learners" * "first"."phrases_to_learn") as "display_score"
		from
			"first"
		order by
			("first"."learners" * "first"."phrases_to_learn") desc
	)
select
	"second"."lang",
	"second"."name",
	"second"."alias_of",
	"second"."learners",
	"second"."phrases_to_learn",
	"rank" () over (
		order by
			"second"."display_score" desc
	) as "rank",
	"rank" () over (
		order by
			"second"."display_score" desc,
			"second"."name"
	) as "display_order"
from
	"second";

alter table "public"."language_plus" OWNER to "postgres";

create table if not exists "public"."phrase_relation" (
	"from_phrase_id" "uuid",
	"to_phrase_id" "uuid",
	"id" "uuid" default "extensions"."uuid_generate_v4" () not null,
	"added_by" "uuid" default "auth"."uid" ()
);

alter table "public"."phrase_relation" OWNER to "postgres";

COMMENT on column "public"."phrase_relation"."added_by" is 'User who added this association';

create or replace view "public"."phrase_plus" as
select
	"p"."text",
	"p"."id",
	"p"."added_by",
	"p"."lang",
	"p"."created_at",
	ARRAY(
		select
			case
				when ("r"."to_phrase_id" = "p"."id") then "r"."from_phrase_id"
				else "r"."to_phrase_id"
			end as "to_phrase_id"
		from
			"public"."phrase_relation" "r"
		where
			(
				("p"."id" = "r"."to_phrase_id")
				or ("p"."id" = "r"."from_phrase_id")
			)
	) as "relation_pids"
from
	"public"."phrase" "p";

alter table "public"."phrase_plus" OWNER to "postgres";

create table if not exists "public"."phrase_translation" (
	"text" "text" not null,
	"literal" "text",
	"id" "uuid" default "extensions"."uuid_generate_v4" () not null,
	"phrase_id" "uuid" not null,
	"added_by" "uuid" default "auth"."uid" (),
	"lang" character varying not null
);

alter table "public"."phrase_translation" OWNER to "postgres";

COMMENT on table "public"."phrase_translation" is 'A translation of one phrase into another language';

COMMENT on column "public"."phrase_translation"."added_by" is 'User who added this translation';

COMMENT on column "public"."phrase_translation"."lang" is 'The 3-letter code for the language (iso-369-3)';

create table if not exists "public"."user_profile" (
	"uid" "uuid" default "auth"."uid" () not null,
	"username" "text",
	"avatar_url" "text",
	"updated_at" timestamp with time zone,
	"created_at" timestamp with time zone default "now" () not null,
	"languages_spoken" character varying[] default '{}'::character varying[] not null,
	"language_primary" "text" default 'EN'::"text" not null,
	constraint "username_length" check (("char_length" ("username") >= 3))
);

alter table "public"."user_profile" OWNER to "postgres";

COMMENT on column "public"."user_profile"."uid" is 'Primary key (same as auth.users.id and uid())';

create or replace view "public"."public_profile" as
select
	"user_profile"."uid",
	"user_profile"."username",
	"user_profile"."avatar_url"
from
	"public"."user_profile";

alter table "public"."public_profile" OWNER to "postgres";

create table if not exists "public"."user_card" (
	"uid" "uuid" default "auth"."uid" () not null,
	"id" "uuid" default "extensions"."uuid_generate_v4" () not null,
	"phrase_id" "uuid" not null,
	"user_deck_id" "uuid" not null,
	"updated_at" timestamp with time zone default "now" (),
	"created_at" timestamp with time zone default "now" (),
	"status" "public"."card_status" default 'active'::"public"."card_status"
);

alter table "public"."user_card" OWNER to "postgres";

COMMENT on table "public"."user_card" is 'Which card is in which deck, and its status';

COMMENT on column "public"."user_card"."uid" is 'The owner user''s ID';

COMMENT on column "public"."user_card"."user_deck_id" is 'Foreign key to the user_deck item to which this card belongs';

create or replace view "public"."user_card_plus"
with
	("security_invoker" = 'true') as
select
	"deck"."lang",
	"card"."id",
	"card"."uid",
	"card"."status",
	"card"."phrase_id",
	"card"."user_deck_id",
	"card"."created_at",
	"card"."updated_at"
from
	(
		"public"."user_card" "card"
		join "public"."user_deck" "deck" on (("deck"."id" = "card"."user_deck_id"))
	);

alter table "public"."user_card_plus" OWNER to "postgres";

create or replace view "public"."user_card_pick_new_active"
with
	("security_invoker" = 'true') as
select
	"card"."id" as "user_card_id",
	null::"uuid" as "prev_id",
	null::timestamp with time zone as "prev_created_at",
	null::numeric as "review_time_difficulty",
	null::numeric as "review_time_stability",
	null::timestamp with time zone as "last_scheduled_for",
	null::numeric as "last_scheduled_interval",
	null::numeric as "overdue_days",
	null::double precision as "overdue_percent"
from
	(
		"public"."user_card_plus" "card"
		left join "public"."user_card_scheduled" "reviews" on (("reviews"."user_card_id" = "card"."id"))
	)
where
	(
		("reviews"."id" is null)
		and (
			"card"."status" = 'active'::"public"."card_status"
		)
	)
order by
	("random" ())
limit
	15;

alter table "public"."user_card_pick_new_active" OWNER to "postgres";

create or replace view "public"."user_card_scheduled_today"
with
	("security_invoker" = 'true') as
with
	"first" as (
		select distinct
			on ("record"."user_card_id") "record"."user_card_id",
			"record"."id" as "prev_id",
			"record"."created_at" as "prev_created_at",
			"record"."new_difficulty" as "review_time_difficulty",
			"record"."new_stability" as "review_time_stability",
			"record"."scheduled_for" as "last_scheduled_for",
			"record"."new_interval_r90" as "last_scheduled_interval",
			(
				(
					(
						(
							EXTRACT(
								epoch
								from
									CURRENT_TIMESTAMP
							) - EXTRACT(
								epoch
								from
									"record"."scheduled_for"
							)
						) / 60.0
					) / 60.0
				) / 24.0
			) as "overdue_days",
			(
				(
					(
						(
							(
								(
									EXTRACT(
										epoch
										from
											CURRENT_TIMESTAMP
									) - EXTRACT(
										epoch
										from
											"record"."scheduled_for"
									)
								)
							)::double precision / (60.0)::double precision
						) / (60.0)::double precision
					) / (24.0)::double precision
				) / ("record"."new_interval_r90")::double precision
			) as "overdue_percent"
		from
			"public"."user_card_scheduled" "record"
		order by
			"record"."user_card_id",
			"record"."created_at" desc
	)
select
	"first"."user_card_id",
	"first"."prev_id",
	"first"."prev_created_at",
	"first"."review_time_difficulty",
	"first"."review_time_stability",
	"first"."last_scheduled_for",
	"first"."last_scheduled_interval",
	"first"."overdue_days",
	"first"."overdue_percent"
from
	"first"
where
	("first"."last_scheduled_for" < "now" ())
order by
	("random" ());

alter table "public"."user_card_scheduled_today" OWNER to "postgres";

create or replace view "public"."user_card_review_today"
with
	("security_invoker" = 'true') as
with
	"first" as (
		select
			"user_card_scheduled_today"."prev_id",
			"user_card_scheduled_today"."user_card_id",
			"user_card_scheduled_today"."review_time_difficulty",
			"user_card_scheduled_today"."review_time_stability",
			"user_card_scheduled_today"."last_scheduled_for",
			"user_card_scheduled_today"."last_scheduled_interval",
			"user_card_scheduled_today"."overdue_days",
			"user_card_scheduled_today"."overdue_percent",
			"user_card_scheduled_today"."prev_created_at"
		from
			"public"."user_card_scheduled_today"
		union all
		select
			"user_card_pick_new_active"."prev_id",
			"user_card_pick_new_active"."user_card_id",
			"user_card_pick_new_active"."review_time_difficulty",
			"user_card_pick_new_active"."review_time_stability",
			"user_card_pick_new_active"."last_scheduled_for",
			"user_card_pick_new_active"."last_scheduled_interval",
			"user_card_pick_new_active"."overdue_days",
			"user_card_pick_new_active"."overdue_percent",
			"user_card_pick_new_active"."prev_created_at"
		from
			"public"."user_card_pick_new_active"
	)
select
	"first"."prev_id",
	"first"."user_card_id",
	"first"."review_time_difficulty",
	"first"."review_time_stability",
	"first"."last_scheduled_for",
	"first"."last_scheduled_interval",
	"first"."overdue_days",
	"first"."overdue_percent",
	"first"."prev_created_at",
	"card"."lang",
	"card"."phrase_id"
from
	(
		"first"
		join "public"."user_card_plus" "card" on (("first"."user_card_id" = "card"."id"))
	)
where
	(
		"card"."status" = 'active'::"public"."card_status"
	)
order by
	("random" ());

alter table "public"."user_card_review_today" OWNER to "postgres";

create or replace view "public"."user_deck_plus" as
select
	null::"uuid" as "id",
	null::"uuid" as "uid",
	null::character varying as "lang",
	null::"public"."learning_goal" as "learning_goal",
	null::boolean as "archived",
	null::"text" as "language",
	null::timestamp with time zone as "created_at",
	null::bigint as "cards_learned",
	null::bigint as "cards_active",
	null::bigint as "cards_skipped",
	null::bigint as "lang_total_phrases",
	null::timestamp with time zone as "most_recent_review_at",
	null::bigint as "count_reviews_7d",
	null::bigint as "count_reviews_7d_positive";

alter table "public"."user_deck_plus" OWNER to "postgres";

alter table only "public"."phrase"
add constraint "card_phrase_id_int_key" unique ("id");

alter table only "public"."phrase"
add constraint "card_phrase_pkey" primary key ("id");

alter table only "public"."phrase_relation"
add constraint "card_see_also_pkey" primary key ("id");

alter table only "public"."phrase_relation"
add constraint "card_see_also_uuid_key" unique ("id");

alter table only "public"."phrase_translation"
add constraint "card_translation_pkey" primary key ("id");

alter table only "public"."phrase_translation"
add constraint "card_translation_uuid_key" unique ("id");

alter table only "public"."user_card"
add constraint "ensure_phrases_unique_within_deck" unique ("user_deck_id", "phrase_id");

alter table only "public"."friend_request_action"
add constraint "friend_request_action_pkey" primary key ("id");

alter table only "public"."language"
add constraint "language_code2_key" unique ("lang");

alter table only "public"."language"
add constraint "language_pkey" primary key ("lang");

alter table only "public"."user_deck"
add constraint "one_deck_per_language_per_user" unique ("uid", "lang");

alter table only "public"."user_profile"
add constraint "profile_old_id_key" unique ("uid");

alter table only "public"."user_profile"
add constraint "profiles_pkey" primary key ("uid");

alter table only "public"."user_profile"
add constraint "profiles_username_key" unique ("username");

alter table only "public"."user_card_scheduled"
add constraint "user_card_scheduled_pkey" primary key ("id");

alter table only "public"."user_card"
add constraint "user_deck_card_membership_pkey" primary key ("id");

alter table only "public"."user_card"
add constraint "user_deck_card_membership_uuid_key" unique ("id");

alter table only "public"."user_deck"
add constraint "user_deck_pkey" primary key ("id");

alter table only "public"."user_deck"
add constraint "user_deck_uuid_key" unique ("id");

create unique index "uid_card" on "public"."user_card" using "btree" ("uid", "phrase_id");

create unique index "uid_deck" on "public"."user_deck" using "btree" ("uid", "lang");

create unique index "unique_text_phrase_lang" on "public"."phrase_translation" using "btree" ("text", "lang", "phrase_id");

create or replace view "public"."user_deck_plus"
with
	("security_invoker" = 'true') as
select
	"d"."id",
	"d"."uid",
	"d"."lang",
	"d"."learning_goal",
	"d"."archived",
	(
		select
			"l"."name"
		from
			"public"."language" "l"
		where
			(("l"."lang")::"text" = ("d"."lang")::"text")
		limit
			1
	) as "language",
	"d"."created_at",
	"count" (*) filter (
		where
			("c"."status" = 'learned'::"public"."card_status")
	) as "cards_learned",
	"count" (*) filter (
		where
			("c"."status" = 'active'::"public"."card_status")
	) as "cards_active",
	"count" (*) filter (
		where
			("c"."status" = 'skipped'::"public"."card_status")
	) as "cards_skipped",
	(
		select
			"count" (*) as "count"
		from
			"public"."phrase" "p"
		where
			(("p"."lang")::"text" = ("d"."lang")::"text")
	) as "lang_total_phrases",
	(
		select
			"max" ("c"."created_at") as "max"
		from
			"public"."user_card_scheduled" "r"
		where
			("r"."user_deck_id" = "d"."id")
		limit
			1
	) as "most_recent_review_at",
	(
		select
			"count" (*) as "count"
		from
			"public"."user_card_scheduled" "r"
		where
			(
				("r"."user_deck_id" = "d"."id")
				and (
					"r"."created_at" > ("now" () - '7 days'::interval)
				)
			)
		limit
			1
	) as "count_reviews_7d",
	(
		select
			"count" (*) as "count"
		from
			"public"."user_card_scheduled" "r"
		where
			(
				("r"."user_deck_id" = "d"."id")
				and (
					"r"."created_at" > ("now" () - '7 days'::interval)
				)
				and ("r"."score" >= 2)
			)
		limit
			1
	) as "count_reviews_7d_positive"
from
	(
		"public"."user_deck" "d"
		left join "public"."user_card" "c" on (("d"."id" = "c"."user_deck_id"))
	)
group by
	"d"."id",
	"d"."lang",
	"d"."created_at"
order by
	(
		select
			"count" (*) as "count"
		from
			"public"."user_card_scheduled" "r"
		where
			(
				("r"."user_deck_id" = "d"."id")
				and (
					"r"."created_at" > ("now" () - '7 days'::interval)
				)
			)
		limit
			1
	) desc nulls last,
	"d"."created_at" desc;

alter table only "public"."friend_request_action"
add constraint "friend_request_action_uid_by_fkey" foreign KEY ("uid_by") references "public"."user_profile" ("uid") on update cascade on delete cascade;

alter table only "public"."friend_request_action"
add constraint "friend_request_action_uid_for_fkey" foreign KEY ("uid_for") references "public"."user_profile" ("uid") on update cascade on delete cascade;

alter table only "public"."friend_request_action"
add constraint "friend_request_action_uid_less_fkey" foreign KEY ("uid_less") references "public"."user_profile" ("uid") on update cascade on delete cascade;

alter table only "public"."friend_request_action"
add constraint "friend_request_action_uid_more_fkey" foreign KEY ("uid_more") references "public"."user_profile" ("uid") on update cascade on delete cascade;

alter table only "public"."phrase"
add constraint "phrase_added_by_fkey" foreign KEY ("added_by") references "public"."user_profile" ("uid") on delete set null;

alter table only "public"."phrase"
add constraint "phrase_lang_fkey" foreign KEY ("lang") references "public"."language" ("lang");

alter table only "public"."phrase_relation"
add constraint "phrase_see_also_added_by_fkey" foreign KEY ("added_by") references "public"."user_profile" ("uid") on delete set null;

alter table only "public"."phrase_relation"
add constraint "phrase_see_also_from_phrase_id_fkey" foreign KEY ("from_phrase_id") references "public"."phrase" ("id");

alter table only "public"."phrase_relation"
add constraint "phrase_see_also_to_phrase_id_fkey" foreign KEY ("to_phrase_id") references "public"."phrase" ("id");

alter table only "public"."phrase_translation"
add constraint "phrase_translation_added_by_fkey" foreign KEY ("added_by") references "public"."user_profile" ("uid") on delete set null;

alter table only "public"."phrase_translation"
add constraint "phrase_translation_lang_fkey" foreign KEY ("lang") references "public"."language" ("lang");

alter table only "public"."phrase_translation"
add constraint "phrase_translation_phrase_id_fkey" foreign KEY ("phrase_id") references "public"."phrase" ("id") on delete cascade;

alter table only "public"."user_card"
add constraint "user_card_phrase_id_fkey" foreign KEY ("phrase_id") references "public"."phrase" ("id") on delete cascade;

alter table only "public"."user_card_scheduled"
add constraint "user_card_scheduled_uid_fkey" foreign KEY ("uid") references "public"."user_profile" ("uid") on update cascade on delete cascade;

alter table only "public"."user_card_scheduled"
add constraint "user_card_scheduled_user_card_id_fkey" foreign KEY ("user_card_id") references "public"."user_card" ("id") on update cascade on delete cascade;

alter table only "public"."user_card_scheduled"
add constraint "user_card_scheduled_user_deck_id_fkey" foreign KEY ("user_deck_id") references "public"."user_deck" ("id") on update cascade on delete cascade;

alter table only "public"."user_card"
add constraint "user_card_uid_fkey" foreign KEY ("uid") references "public"."user_profile" ("uid") on update cascade on delete cascade;

alter table only "public"."user_card"
add constraint "user_card_user_deck_id_fkey" foreign KEY ("user_deck_id") references "public"."user_deck" ("id") on delete cascade;

alter table only "public"."user_deck"
add constraint "user_deck_lang_fkey" foreign KEY ("lang") references "public"."language" ("lang");

alter table only "public"."user_deck"
add constraint "user_deck_uid_fkey" foreign KEY ("uid") references "public"."user_profile" ("uid") on update cascade on delete cascade;

create policy "Anyone can add cards" on "public"."phrase" for INSERT to "authenticated"
with
	check (true);

create policy "Enable all actions for users based on uid" on "public"."user_card_scheduled" to "authenticated" using (
	(
		(
			select
				"auth"."uid" () as "uid"
		) = "uid"
	)
)
with
	check (
		(
			(
				select
					"auth"."uid" () as "uid"
			) = "uid"
		)
	);

create policy "Enable read access for all users" on "public"."language" for
select
	using (true);

create policy "Enable read access for all users" on "public"."phrase" for
select
	using (true);

create policy "Enable read access for all users" on "public"."phrase_relation" for
select
	using (true);

create policy "Enable read access for all users" on "public"."phrase_translation" for
select
	using (true);

create policy "Enable users to view their own data only" on "public"."friend_request_action" for
select
	to "authenticated" using (
		(
			(
				(
					select
						"auth"."uid" () as "uid"
				) = "uid_by"
			)
			or (
				(
					select
						"auth"."uid" () as "uid"
				) = "uid_for"
			)
		)
	);

create policy "Logged in users can add see_also's" on "public"."phrase_relation" for INSERT to "authenticated"
with
	check (true);

create policy "Logged in users can add translations" on "public"."phrase_translation" for INSERT to "authenticated"
with
	check (true);

create policy "Policy with table joins" on "public"."friend_request_action" for INSERT to "authenticated"
with
	check (
		(
			(
				(
					select
						"auth"."uid" () as "uid"
				) = "uid_by"
			)
			and (
				(
					(
						(
							select
								"auth"."uid" () as "uid"
						) = "uid_less"
					)
					and ("uid_for" = "uid_more")
				)
				or (
					(
						(
							select
								"auth"."uid" () as "uid"
						) = "uid_more"
					)
					and ("uid_for" = "uid_less")
				)
			)
		)
	);

create policy "User can view and update their own profile" on "public"."user_profile" to "authenticated" using (("uid" = "auth"."uid" ()))
with
	check (("uid" = "auth"."uid" ()));

create policy "User data only for this user" on "public"."user_card" using (("auth"."uid" () = "uid"))
with
	check (("auth"."uid" () = "uid"));

create policy "User data only for this user" on "public"."user_deck" using (("auth"."uid" () = "uid"))
with
	check (("auth"."uid" () = "uid"));

alter table "public"."friend_request_action" ENABLE row LEVEL SECURITY;

alter table "public"."language" ENABLE row LEVEL SECURITY;

alter table "public"."phrase" ENABLE row LEVEL SECURITY;

alter table "public"."phrase_relation" ENABLE row LEVEL SECURITY;

alter table "public"."phrase_translation" ENABLE row LEVEL SECURITY;

alter table "public"."user_card" ENABLE row LEVEL SECURITY;

alter table "public"."user_card_scheduled" ENABLE row LEVEL SECURITY;

alter table "public"."user_deck" ENABLE row LEVEL SECURITY;

alter table "public"."user_profile" ENABLE row LEVEL SECURITY;

alter publication "supabase_realtime" OWNER to "postgres";

revoke USAGE on SCHEMA "public"
from
	PUBLIC;

grant USAGE on SCHEMA "public" to "anon";

grant USAGE on SCHEMA "public" to "authenticated";

grant USAGE on SCHEMA "public" to "service_role";

grant all on FUNCTION "public"."add_phrase_translation_card" (
	"text" "text",
	"lang" "text",
	"translation_text" "text",
	"translation_lang" "text"
) to "anon";

grant all on FUNCTION "public"."add_phrase_translation_card" (
	"text" "text",
	"lang" "text",
	"translation_text" "text",
	"translation_lang" "text"
) to "authenticated";

grant all on FUNCTION "public"."add_phrase_translation_card" (
	"text" "text",
	"lang" "text",
	"translation_text" "text",
	"translation_lang" "text"
) to "service_role";

grant all on FUNCTION "public"."fsrs_clamp_d" ("difficulty" numeric) to "anon";

grant all on FUNCTION "public"."fsrs_clamp_d" ("difficulty" numeric) to "authenticated";

grant all on FUNCTION "public"."fsrs_clamp_d" ("difficulty" numeric) to "service_role";

grant all on FUNCTION "public"."fsrs_d_0" ("score" integer) to "anon";

grant all on FUNCTION "public"."fsrs_d_0" ("score" integer) to "authenticated";

grant all on FUNCTION "public"."fsrs_d_0" ("score" integer) to "service_role";

grant all on FUNCTION "public"."fsrs_days_between" (
	"date_before" timestamp with time zone,
	"date_after" timestamp with time zone
) to "anon";

grant all on FUNCTION "public"."fsrs_days_between" (
	"date_before" timestamp with time zone,
	"date_after" timestamp with time zone
) to "authenticated";

grant all on FUNCTION "public"."fsrs_days_between" (
	"date_before" timestamp with time zone,
	"date_after" timestamp with time zone
) to "service_role";

grant all on FUNCTION "public"."fsrs_delta_d" ("score" integer) to "anon";

grant all on FUNCTION "public"."fsrs_delta_d" ("score" integer) to "authenticated";

grant all on FUNCTION "public"."fsrs_delta_d" ("score" integer) to "service_role";

grant all on FUNCTION "public"."fsrs_difficulty" ("difficulty" numeric, "score" integer) to "anon";

grant all on FUNCTION "public"."fsrs_difficulty" ("difficulty" numeric, "score" integer) to "authenticated";

grant all on FUNCTION "public"."fsrs_difficulty" ("difficulty" numeric, "score" integer) to "service_role";

grant all on FUNCTION "public"."fsrs_dp" ("difficulty" numeric, "score" integer) to "anon";

grant all on FUNCTION "public"."fsrs_dp" ("difficulty" numeric, "score" integer) to "authenticated";

grant all on FUNCTION "public"."fsrs_dp" ("difficulty" numeric, "score" integer) to "service_role";

grant all on FUNCTION "public"."fsrs_interval" (
	"desired_retrievability" numeric,
	"stability" numeric
) to "anon";

grant all on FUNCTION "public"."fsrs_interval" (
	"desired_retrievability" numeric,
	"stability" numeric
) to "authenticated";

grant all on FUNCTION "public"."fsrs_interval" (
	"desired_retrievability" numeric,
	"stability" numeric
) to "service_role";

grant all on FUNCTION "public"."fsrs_retrievability" ("time_in_days" numeric, "stability" numeric) to "anon";

grant all on FUNCTION "public"."fsrs_retrievability" ("time_in_days" numeric, "stability" numeric) to "authenticated";

grant all on FUNCTION "public"."fsrs_retrievability" ("time_in_days" numeric, "stability" numeric) to "service_role";

grant all on FUNCTION "public"."fsrs_s_0" ("score" integer) to "anon";

grant all on FUNCTION "public"."fsrs_s_0" ("score" integer) to "authenticated";

grant all on FUNCTION "public"."fsrs_s_0" ("score" integer) to "service_role";

grant all on FUNCTION "public"."fsrs_s_fail" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric
) to "anon";

grant all on FUNCTION "public"."fsrs_s_fail" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric
) to "authenticated";

grant all on FUNCTION "public"."fsrs_s_fail" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric
) to "service_role";

grant all on FUNCTION "public"."fsrs_s_success" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" integer
) to "anon";

grant all on FUNCTION "public"."fsrs_s_success" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" integer
) to "authenticated";

grant all on FUNCTION "public"."fsrs_s_success" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" integer
) to "service_role";

grant all on FUNCTION "public"."fsrs_stability" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" integer
) to "anon";

grant all on FUNCTION "public"."fsrs_stability" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" integer
) to "authenticated";

grant all on FUNCTION "public"."fsrs_stability" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" integer
) to "service_role";

grant all on table "public"."user_card_scheduled" to "anon";

grant all on table "public"."user_card_scheduled" to "authenticated";

grant all on table "public"."user_card_scheduled" to "service_role";

grant all on FUNCTION "public"."record_review_and_schedule" ("user_card_id" "uuid", "score" integer) to "anon";

grant all on FUNCTION "public"."record_review_and_schedule" ("user_card_id" "uuid", "score" integer) to "authenticated";

grant all on FUNCTION "public"."record_review_and_schedule" ("user_card_id" "uuid", "score" integer) to "service_role";

grant all on table "public"."friend_request_action" to "anon";

grant all on table "public"."friend_request_action" to "authenticated";

grant all on table "public"."friend_request_action" to "service_role";

grant all on table "public"."friend_summary" to "anon";

grant all on table "public"."friend_summary" to "authenticated";

grant all on table "public"."friend_summary" to "service_role";

grant all on table "public"."language" to "anon";

grant all on table "public"."language" to "authenticated";

grant all on table "public"."language" to "service_role";

grant all on table "public"."phrase" to "anon";

grant all on table "public"."phrase" to "authenticated";

grant all on table "public"."phrase" to "service_role";

grant all on table "public"."user_deck" to "anon";

grant all on table "public"."user_deck" to "authenticated";

grant all on table "public"."user_deck" to "service_role";

grant all on table "public"."language_plus" to "anon";

grant all on table "public"."language_plus" to "authenticated";

grant all on table "public"."language_plus" to "service_role";

grant all on table "public"."phrase_relation" to "anon";

grant all on table "public"."phrase_relation" to "authenticated";

grant all on table "public"."phrase_relation" to "service_role";

grant all on table "public"."phrase_plus" to "anon";

grant all on table "public"."phrase_plus" to "authenticated";

grant all on table "public"."phrase_plus" to "service_role";

grant all on table "public"."phrase_translation" to "anon";

grant all on table "public"."phrase_translation" to "authenticated";

grant all on table "public"."phrase_translation" to "service_role";

grant all on table "public"."user_profile" to "anon";

grant all on table "public"."user_profile" to "authenticated";

grant all on table "public"."user_profile" to "service_role";

grant all on table "public"."public_profile" to "anon";

grant all on table "public"."public_profile" to "authenticated";

grant all on table "public"."public_profile" to "service_role";

grant all on table "public"."user_card" to "anon";

grant all on table "public"."user_card" to "authenticated";

grant all on table "public"."user_card" to "service_role";

grant all on table "public"."user_card_plus" to "anon";

grant all on table "public"."user_card_plus" to "authenticated";

grant all on table "public"."user_card_plus" to "service_role";

grant all on table "public"."user_card_pick_new_active" to "anon";

grant all on table "public"."user_card_pick_new_active" to "authenticated";

grant all on table "public"."user_card_pick_new_active" to "service_role";

grant all on table "public"."user_card_scheduled_today" to "anon";

grant all on table "public"."user_card_scheduled_today" to "authenticated";

grant all on table "public"."user_card_scheduled_today" to "service_role";

grant all on table "public"."user_card_review_today" to "anon";

grant all on table "public"."user_card_review_today" to "authenticated";

grant all on table "public"."user_card_review_today" to "service_role";

grant all on table "public"."user_deck_plus" to "anon";

grant all on table "public"."user_deck_plus" to "authenticated";

grant all on table "public"."user_deck_plus" to "service_role";

alter default privileges for ROLE "postgres" in SCHEMA "public"
grant all on SEQUENCES to "postgres";

alter default privileges for ROLE "postgres" in SCHEMA "public"
grant all on SEQUENCES to "anon";

alter default privileges for ROLE "postgres" in SCHEMA "public"
grant all on SEQUENCES to "authenticated";

alter default privileges for ROLE "postgres" in SCHEMA "public"
grant all on SEQUENCES to "service_role";

alter default privileges for ROLE "postgres" in SCHEMA "public"
grant all on FUNCTIONS to "postgres";

alter default privileges for ROLE "postgres" in SCHEMA "public"
grant all on FUNCTIONS to "anon";

alter default privileges for ROLE "postgres" in SCHEMA "public"
grant all on FUNCTIONS to "authenticated";

alter default privileges for ROLE "postgres" in SCHEMA "public"
grant all on FUNCTIONS to "service_role";

alter default privileges for ROLE "postgres" in SCHEMA "public"
grant all on TABLES to "postgres";

alter default privileges for ROLE "postgres" in SCHEMA "public"
grant all on TABLES to "anon";

alter default privileges for ROLE "postgres" in SCHEMA "public"
grant all on TABLES to "authenticated";

alter default privileges for ROLE "postgres" in SCHEMA "public"
grant all on TABLES to "service_role";

reset all;
