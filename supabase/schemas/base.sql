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

create extension if not exists "pg_net"
with
	schema "extensions";

create extension if not exists "pgsodium";

alter schema "public" owner to "postgres";

comment on schema "public" is '@graphql({"inflect_names": true})';

create extension if not exists "plv8"
with
	schema "pg_catalog";

create extension if not exists "pg_graphql"
with
	schema "graphql";

create extension if not exists "pg_stat_statements"
with
	schema "extensions";

create extension if not exists "pgcrypto"
with
	schema "extensions";

create extension if not exists "pgjwt"
with
	schema "extensions";

create extension if not exists "supabase_vault"
with
	schema "vault";

create extension if not exists "uuid-ossp"
with
	schema "extensions";

create type "public"."card_status" as enum('active', 'learned', 'skipped');

alter type "public"."card_status" owner to "postgres";

comment on
type "public"."card_status" is 'card status is either active, learned or skipped';

create type "public"."chat_message_type" as enum('recommendation', 'accepted', 'request');

alter type "public"."chat_message_type" owner to "postgres";

create type "public"."friend_request_response" as enum('accept', 'decline', 'cancel', 'remove', 'invite');

alter type "public"."friend_request_response" owner to "postgres";

create type "public"."language_proficiency" as enum('fluent', 'proficient', 'beginner');

alter type "public"."language_proficiency" owner to "postgres";

create type "public"."learning_goal" as enum('moving', 'family', 'visiting');

alter type "public"."learning_goal" owner to "postgres";

comment on
type "public"."learning_goal" is 'why are you learning this language?';

create type "public"."phrase_request_status" as enum('pending', 'fulfilled', 'cancelled');

alter type "public"."phrase_request_status" owner to "postgres";

create type "public"."translation_input" as ("lang" character(3), "text" "text");

alter type "public"."translation_input" owner to "postgres";

create type "public"."phrase_with_translations_input" as (
	"phrase_text" "text",
	"translations" "public"."translation_input" []
);

alter type "public"."phrase_with_translations_input" owner to "postgres";

create type "public"."translation_output" as ("id" "uuid", "lang" character(3), "text" "text");

alter type "public"."translation_output" owner to "postgres";

create type "public"."phrase_with_translations_output" as (
	"id" "uuid",
	"lang" character(3),
	"text" "text",
	"translations" "public"."translation_output" []
);

alter type "public"."phrase_with_translations_output" owner to "postgres";

create
or replace function "public"."add_phrase_translation_card" (
	"phrase_text" "text",
	"phrase_lang" "text",
	"translation_text" "text",
	"translation_lang" "text",
	"phrase_text_script" "text" default null::"text",
	"translation_text_script" "text" default null::"text"
) returns "json" language "plpgsql" as $$
DECLARE
    new_phrase public.phrase;
    new_translation public.phrase_translation;
    new_card public.user_card;

BEGIN
    -- Insert a new phrase and get the id
    INSERT INTO public.phrase (text, lang, text_script)
    VALUES (phrase_text, phrase_lang, phrase_text_script)
    RETURNING * INTO new_phrase;

    -- Insert the translation for the new phrase
    INSERT INTO public.phrase_translation (phrase_id, text, lang, text_script)
    VALUES (new_phrase.id, translation_text, translation_lang, translation_text_script)
    RETURNING * INTO new_translation;

    -- Insert a new user card for the authenticated user
    INSERT INTO public.user_card (phrase_id, status, lang)
    VALUES (new_phrase.id, 'active', phrase_lang)
    RETURNING * INTO new_card;

    RETURN json_build_object('phrase', row_to_json(new_phrase), 'translation', row_to_json(new_translation), 'card', row_to_json(new_card));
END;
$$;

alter function "public"."add_phrase_translation_card" (
	"phrase_text" "text",
	"phrase_lang" "text",
	"translation_text" "text",
	"translation_lang" "text",
	"phrase_text_script" "text",
	"translation_text_script" "text"
) owner to "postgres";

create
or replace function "public"."add_tags_to_phrase" (
	"p_phrase_id" "uuid",
	"p_lang" character varying,
	"p_tags" "text" []
) returns "jsonb" language "plpgsql" as $$
DECLARE
    tag_name text;
    v_tag_id uuid;
    new_tag_record public.tag;
    new_phrase_tag_record public.phrase_tag;
    created_tags jsonb[] := '{}';
    created_phrase_tags jsonb[] := '{}';
BEGIN
    FOREACH tag_name IN ARRAY p_tags
    LOOP
        -- Upsert tag and get its ID.
        WITH new_tag AS (
            INSERT INTO public.tag (name, lang, added_by)
            VALUES (tag_name, p_lang, auth.uid())
            ON CONFLICT (name, lang) DO NOTHING
            RETURNING *
        )
        SELECT * INTO new_tag_record FROM new_tag; -- Only populated if a new tag was created

        -- If a new tag was created, add it to our array and get its ID.
        IF new_tag_record.id IS NOT NULL THEN
            v_tag_id := new_tag_record.id;
            created_tags := array_append(created_tags, to_jsonb(new_tag_record));
        ELSE
            -- If the insert did nothing (because the tag already existed), select the existing tag's ID.
            SELECT id INTO v_tag_id FROM public.tag WHERE name = tag_name AND lang = p_lang;
        END IF;

        -- Associate tag with phrase
        WITH new_pt AS (
            INSERT INTO public.phrase_tag (phrase_id, tag_id, added_by)
            VALUES (p_phrase_id, v_tag_id, auth.uid())
            ON CONFLICT (phrase_id, tag_id) DO NOTHING
            RETURNING *
        )
        SELECT * INTO new_phrase_tag_record FROM new_pt; -- Only populated if a new association was created

        IF new_phrase_tag_record.phrase_id IS NOT NULL THEN
            created_phrase_tags := array_append(created_phrase_tags, to_jsonb(new_phrase_tag_record));
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'tags', created_tags,
        'phrase_tags', created_phrase_tags
    );
END;
$$;

alter function "public"."add_tags_to_phrase" (
	"p_phrase_id" "uuid",
	"p_lang" character varying,
	"p_tags" "text" []
) owner to "postgres";

create
or replace function "public"."are_friends" ("uid1" "uuid", "uid2" "uuid") returns boolean language "sql" security definer as $$
  SELECT EXISTS (
    SELECT 1
    FROM public.friend_summary
    WHERE
      status = 'friends' AND
      (
        (uid_less = uid1 AND uid_more = uid2) OR
        (uid_less = uid2 AND uid_more = uid1)
      )
  );
$$;

alter function "public"."are_friends" ("uid1" "uuid", "uid2" "uuid") owner to "postgres";

create
or replace function "public"."bulk_add_phrases" (
	"p_lang" character,
	"p_phrases" "public"."phrase_with_translations_input" []
) returns setof "public"."phrase_with_translations_output" language "plpgsql" as $$
declare
    phrase_item public.phrase_with_translations_input;
    translation_item public.translation_input;
    new_phrase_id uuid;
    new_translation_id uuid;
    result public.phrase_with_translations_output;
    translation_outputs public.translation_output[];
begin
    foreach phrase_item in array p_phrases
    loop
        -- Insert the phrase and get its ID.
        insert into public.phrase (lang, text)
        values (p_lang, phrase_item.phrase_text)
        returning id into new_phrase_id;

        -- Reset translations array for this phrase
        translation_outputs := '{}';

        -- Insert all translations for the new phrase
        if array_length(phrase_item.translations, 1) > 0 then
            foreach translation_item in array phrase_item.translations
            loop
                insert into public.phrase_translation (phrase_id, lang, text)
                values (new_phrase_id, translation_item.lang, translation_item.text)
                returning id into new_translation_id;

                -- Add the new translation to our output array
                translation_outputs := array_append(
                    translation_outputs,
                    (new_translation_id, translation_item.lang, translation_item.text)::public.translation_output
                );
            end loop;
        end if;

        -- Construct the result for the current phrase
        result := (
            new_phrase_id,
            p_lang,
            phrase_item.phrase_text,
            translation_outputs
        )::public.phrase_with_translations_output;

        return next result;
    end loop;
end;
$$;

alter function "public"."bulk_add_phrases" (
	"p_lang" character,
	"p_phrases" "public"."phrase_with_translations_input" []
) owner to "postgres";

create
or replace function "public"."fsrs_clamp_d" ("difficulty" numeric) returns numeric language "plv8" as $$
  return Math.min(Math.max(difficulty, 1.0), 10.0);
$$;

alter function "public"."fsrs_clamp_d" ("difficulty" numeric) owner to "postgres";

create
or replace function "public"."fsrs_d_0" ("score" integer) returns numeric language "plv8" as $$
	const W_4 = 7.1949;
	const W_5 = 0.5345;
	return plv8.find_function("fsrs_clamp_d")(W_4 - Math.exp(W_5 * (score - 1.0)) + 1.0);
$$;

alter function "public"."fsrs_d_0" ("score" integer) owner to "postgres";

create
or replace function "public"."fsrs_days_between" (
	"date_before" timestamp with time zone,
	"date_after" timestamp with time zone
) returns numeric language "plv8" as $$
	// returns interval, in days, rounded to the second
	return Math.round((new Date(date_after) - new Date(date_before)) / 60 / 60 / 24) / 1000;
$$;

alter function "public"."fsrs_days_between" (
	"date_before" timestamp with time zone,
	"date_after" timestamp with time zone
) owner to "postgres";

create
or replace function "public"."fsrs_delta_d" ("score" integer) returns numeric language "plv8" as $$
	const W_6 = 1.4604;
  return -W_6 * (score - 3.0);
$$;

alter function "public"."fsrs_delta_d" ("score" integer) owner to "postgres";

create
or replace function "public"."fsrs_difficulty" ("difficulty" numeric, "score" integer) returns numeric language "plv8" as $$
	const W_7 = 0.0046;
	return plv8.find_function("fsrs_clamp_d")(W_7 * plv8.find_function("fsrs_d_0")(4) + (1.0 - W_7) * plv8.find_function("fsrs_dp")(difficulty, score));
$$;

alter function "public"."fsrs_difficulty" ("difficulty" numeric, "score" integer) owner to "postgres";

create
or replace function "public"."fsrs_dp" ("difficulty" numeric, "score" integer) returns numeric language "plv8" as $$
	return difficulty + plv8.find_function("fsrs_delta_d")(score) * ((10.0 - difficulty) / 9.0);
$$;

alter function "public"."fsrs_dp" ("difficulty" numeric, "score" integer) owner to "postgres";

create
or replace function "public"."fsrs_interval" ("desired_retrievability" numeric, "stability" numeric) returns numeric language "plv8" as $$
	const f = 19.0 / 81.0;
	const c = -0.5;
	return (stability / f) * (Math.pow(desired_retrievability, 1.0 / c) - 1.0);
$$;

alter function "public"."fsrs_interval" ("desired_retrievability" numeric, "stability" numeric) owner to "postgres";

create
or replace function "public"."fsrs_retrievability" ("time_in_days" numeric, "stability" numeric) returns numeric language "plv8" as $$
	const f = 19.0 / 81.0;
	const c = -0.5;
	return Math.pow(1.0 + f * (time_in_days / stability), c);
$$;

alter function "public"."fsrs_retrievability" ("time_in_days" numeric, "stability" numeric) owner to "postgres";

create
or replace function "public"."fsrs_s_0" ("score" integer) returns numeric language "plv8" as $$
	const W = [0.40255, 1.18385, 3.173, 15.69105];
	return W[score - 1];
$$;

alter function "public"."fsrs_s_0" ("score" integer) owner to "postgres";

create
or replace function "public"."fsrs_s_fail" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric
) returns numeric language "plv8" as $$
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
) owner to "postgres";

create
or replace function "public"."fsrs_s_success" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" integer
) returns numeric language "plv8" as $$
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
) owner to "postgres";

create
or replace function "public"."fsrs_stability" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" integer
) returns numeric language "plv8" as $$
	return (score === 1) ?
			plv8.find_function("fsrs_s_fail")(difficulty, stability, review_time_retrievability)
		: plv8.find_function("fsrs_s_success")(difficulty, stability, review_time_retrievability, score);
$$;

alter function "public"."fsrs_stability" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" integer
) owner to "postgres";

create
or replace function public.fulfill_phrase_request (
	request_id uuid,
	p_phrase_text text,
	p_translation_text text,
	p_translation_lang character varying
) returns json language plpgsql as $$
DECLARE
    v_requester_uid uuid;
    v_phrase_lang character varying;
    v_request_status public.phrase_request_status;
    fulfiller_uid uuid;
    new_phrase public.phrase;
    new_translation public.phrase_translation;
BEGIN
    -- Get the requester's UID and the phrase language from the request
    SELECT requester_uid, lang, status
    INTO v_requester_uid, v_phrase_lang, v_request_status
    FROM public.phrase_request
    WHERE id = request_id;

    IF v_requester_uid IS NULL THEN
        RAISE EXCEPTION 'Phrase request not found';
    END IF;

    -- Get the UID of the user calling this function, if they are authenticated
    fulfiller_uid := auth.uid();

    -- Insert the new phrase and return the entire row
    INSERT INTO public.phrase (text, lang, added_by, request_id)
    VALUES (p_phrase_text, v_phrase_lang, fulfiller_uid, request_id)
    RETURNING * INTO new_phrase;

    -- Insert the translation for the new phrase and return the entire row
    INSERT INTO public.phrase_translation (phrase_id, text, lang, added_by)
    VALUES (new_phrase.id, p_translation_text, p_translation_lang, fulfiller_uid)
    RETURNING * INTO new_translation;

    -- If the requester is also the fulfiller, make them a new card
    IF v_requester_uid = fulfiller_uid THEN
        INSERT INTO public.user_card (phrase_id, uid, lang, status)
        VALUES (new_phrase.id, fulfiller_uid, v_phrase_lang, 'active');

        -- Update the phrase_request to mark it as fulfilled
        UPDATE public.phrase_request
        SET status = 'fulfilled', fulfilled_at = now()
        WHERE id = request_id;
    END IF;

    -- Return the created phrase and translation as a JSON object
    RETURN json_build_object('phrase', row_to_json(new_phrase), 'translation', row_to_json(new_translation));
END;
$$;

alter function "public"."fulfill_phrase_request" (
	"request_id" "uuid",
	"p_phrase_text" "text",
	"p_translation_text" "text",
	"p_translation_lang" character varying
) owner to "postgres";

set
	default_tablespace = '';

set
	default_table_access_method = "heap";

create table if not exists
	"public"."user_card_review" (
		"id" "uuid" default "gen_random_uuid" () not null,
		"uid" "uuid" default "auth"."uid" () not null,
		"score" smallint not null,
		"difficulty" numeric,
		"stability" numeric,
		"review_time_retrievability" numeric,
		"created_at" timestamp with time zone default "now" () not null,
		"updated_at" timestamp with time zone default "now" () not null,
		"day_session" "date" not null,
		"lang" character varying not null,
		"phrase_id" "uuid" not null,
		"day_first_review" boolean default true not null,
		constraint "user_card_review_difficulty_check" check (
			(
				("difficulty" >= 0.0)
				and ("difficulty" <= 10.0)
			)
		),
		constraint "user_card_review_score_check" check (("score" = any (array[1, 2, 3, 4]))),
		constraint "user_card_review_stability_check" check (("stability" >= 0.0))
	);

alter table "public"."user_card_review" owner to "postgres";

create
or replace function "public"."insert_user_card_review" (
	"phrase_id" "uuid",
	"lang" character varying,
	"score" integer,
	"day_session" "text",
	"desired_retention" numeric default 0.9
) returns "public"."user_card_review" language "plv8" as $_$

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

$_$;

alter function "public"."insert_user_card_review" (
	"phrase_id" "uuid",
	"lang" character varying,
	"score" integer,
	"day_session" "text",
	"desired_retention" numeric
) owner to "postgres";

create
or replace function "public"."update_user_card_review" ("review_id" "uuid", "score" integer) returns "public"."user_card_review" language "plv8" as $_$

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

$_$;

alter function "public"."update_user_card_review" ("review_id" "uuid", "score" integer) owner to "postgres";

create table if not exists
	"public"."chat_message" (
		"id" "uuid" default "gen_random_uuid" () not null,
		"created_at" timestamp with time zone default "now" () not null,
		"sender_uid" "uuid" default "auth"."uid" () not null,
		"recipient_uid" "uuid" not null,
		"message_type" "public"."chat_message_type" not null,
		"phrase_id" "uuid",
		"related_message_id" "uuid",
		"content" "jsonb",
		"lang" character varying not null,
		"request_id" "uuid",
		constraint "uids_are_different" check (("sender_uid" <> "recipient_uid"))
	);

alter table "public"."chat_message" owner to "postgres";

comment on column "public"."chat_message"."sender_uid" is 'The user who sent the message.';

comment on column "public"."chat_message"."recipient_uid" is 'The user who received the message.';

comment on column "public"."chat_message"."message_type" is 'The type of message, e.g., a phrase recommendation.';

comment on column "public"."chat_message"."phrase_id" is 'If it''s a recommendation, this links to the phrase.';

comment on column "public"."chat_message"."related_message_id" is 'If this message is a reply/reaction to another (e.g. accepting a recommendation).';

comment on column "public"."chat_message"."content" is 'Flexible JSONB for extra data, like the text of an accepted phrase.';

create table if not exists
	"public"."friend_request_action" (
		"id" "uuid" default "gen_random_uuid" () not null,
		"uid_by" "uuid" not null,
		"uid_for" "uuid" not null,
		"created_at" timestamp with time zone default "now" () not null,
		"action_type" "public"."friend_request_response",
		"uid_less" "uuid",
		"uid_more" "uuid"
	);

alter table "public"."friend_request_action" owner to "postgres";

comment on column "public"."friend_request_action"."uid_less" is 'The lesser of the two UIDs (to prevent cases where B-A duplicates A-B)';

comment on column "public"."friend_request_action"."uid_more" is 'The greater of the two UIDs (to prevent cases where B-A duplicates A-B)';

create or replace view
	"public"."friend_summary"
with
	("security_invoker" = 'true') as
select distinct
	on ("a"."uid_less", "a"."uid_more") "a"."uid_less",
	"a"."uid_more",
	case
		when ("a"."action_type" = 'accept'::"public"."friend_request_response") then 'friends'::"text"
		when ("a"."action_type" = 'invite'::"public"."friend_request_response") then 'pending'::"text"
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
	"a"."action_type" as "most_recent_action_type",
	case
		when ("a"."uid_by" = "auth"."uid" ()) then "a"."uid_for"
		else "a"."uid_by"
	end as "uid"
from
	"public"."friend_request_action" "a"
order by
	"a"."uid_less",
	"a"."uid_more",
	"a"."created_at" desc;

alter table "public"."friend_summary" owner to "postgres";

create table if not exists
	"public"."language" (
		"name" "text" not null,
		"lang" character varying not null,
		"alias_of" character varying
	);

alter table "public"."language" owner to "postgres";

comment on table "public"."language" is 'The languages that people are trying to learn';

create table if not exists
	"public"."phrase" (
		"text" "text" not null,
		"id" "uuid" default "extensions"."uuid_generate_v4" () not null,
		"added_by" "uuid" default "auth"."uid" () not null,
		"lang" character varying not null,
		"created_at" timestamp with time zone default "now" () not null,
		"text_script" "text",
		"request_id" "uuid"
	);

alter table "public"."phrase" owner to "postgres";

comment on column "public"."phrase"."added_by" is 'User who added this card';

comment on column "public"."phrase"."lang" is 'The 3-letter code for the language (iso-369-3)';

create table if not exists
	"public"."user_deck" (
		"id" "uuid" default "extensions"."uuid_generate_v4" () not null,
		"uid" "uuid" default "auth"."uid" () not null,
		"lang" character varying not null,
		"created_at" timestamp with time zone default "now" () not null,
		"learning_goal" "public"."learning_goal" default 'moving'::"public"."learning_goal" not null,
		"archived" boolean default false not null,
		"daily_review_goal" smallint default 15 not null,
		constraint "daily_review_goal_valid_values" check (("daily_review_goal" = any (array[10, 15, 20])))
	);

alter table "public"."user_deck" owner to "postgres";

comment on table "public"."user_deck" is 'A set of cards in one language which user intends to learn @graphql({"name": "UserDeck"})';

comment on column "public"."user_deck"."uid" is 'The owner user''s ID';

comment on column "public"."user_deck"."lang" is 'The 3-letter code for the language (iso-369-3)';

comment on column "public"."user_deck"."created_at" is 'the moment the deck was created';

comment on column "public"."user_deck"."learning_goal" is 'why are you learning this language?';

comment on column "public"."user_deck"."archived" is 'is the deck archived or active';

create or replace view
	"public"."meta_language" as
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

alter table "public"."meta_language" owner to "postgres";

create table if not exists
	"public"."phrase_tag" (
		"phrase_id" "uuid" not null,
		"tag_id" "uuid" not null,
		"created_at" timestamp with time zone default "now" () not null,
		"added_by" "uuid" default "auth"."uid" () not null
	);

alter table "public"."phrase_tag" owner to "postgres";

create table if not exists
	"public"."user_profile" (
		"uid" "uuid" default "auth"."uid" () not null,
		"username" "text",
		"updated_at" timestamp with time zone,
		"created_at" timestamp with time zone default "now" () not null,
		"avatar_path" "text",
		"languages_known" "jsonb" default '[]'::"jsonb" not null,
		constraint "username_length" check (("char_length" ("username") >= 3))
	);

alter table "public"."user_profile" owner to "postgres";

comment on column "public"."user_profile"."uid" is 'Primary key (same as auth.users.id and uid())';

create or replace view
	"public"."public_profile" as
select
	"user_profile"."uid",
	"user_profile"."username",
	"user_profile"."avatar_path"
from
	"public"."user_profile";

alter table "public"."public_profile" owner to "postgres";

create table if not exists
	"public"."tag" (
		"id" "uuid" default "gen_random_uuid" () not null,
		"created_at" timestamp with time zone default "now" () not null,
		"name" "text" not null,
		"lang" character varying not null,
		"added_by" "uuid" default "auth"."uid" ()
	);

alter table "public"."tag" owner to "postgres";

create table if not exists
	"public"."user_card" (
		"uid" "uuid" default "auth"."uid" () not null,
		"id" "uuid" default "extensions"."uuid_generate_v4" () not null,
		"phrase_id" "uuid" not null,
		"updated_at" timestamp with time zone default "now" (),
		"created_at" timestamp with time zone default "now" (),
		"status" "public"."card_status" default 'active'::"public"."card_status",
		"lang" character varying not null
	);

alter table "public"."user_card" owner to "postgres";

comment on table "public"."user_card" is 'Which card is in which deck, and its status';

comment on column "public"."user_card"."uid" is 'The owner user''s ID';

create or replace view
	"public"."meta_phrase_info" as
with
	"recent_review" as (
		select
			"r1"."id",
			"r1"."uid",
			"r1"."phrase_id",
			"r1"."lang",
			"r1"."score",
			"r1"."difficulty",
			"r1"."stability",
			"r1"."review_time_retrievability",
			"r1"."created_at" as "recentest_review_at",
			"r1"."updated_at"
		from
			(
				"public"."user_card_review" "r1"
				left join "public"."user_card_review" "r2" on (
					(
						("r1"."uid" = "r2"."uid")
						and ("r1"."phrase_id" = "r2"."phrase_id")
						and ("r1"."created_at" < "r2"."created_at")
					)
				)
			)
		where
			("r2"."created_at" is null)
	),
	"card_with_recentest_review" as (
		select distinct
			"c"."phrase_id",
			"c"."status",
			"r"."difficulty",
			"r"."stability",
			"r"."recentest_review_at"
		from
			(
				"public"."user_card" "c"
				join "recent_review" "r" on (
					(
						("c"."phrase_id" = "r"."phrase_id")
						and ("c"."uid" = "r"."uid")
					)
				)
			)
	),
	"results" as (
		select
			"p"."id",
			"p"."created_at",
			"p"."added_by",
			"p"."request_id",
			"p"."lang",
			"p"."text",
			"avg" ("c"."difficulty") as "avg_difficulty",
			"jsonb_build_object" (
				'uid',
				"pp"."uid",
				'username',
				"pp"."username",
				'avatar_path',
				"pp"."avatar_path"
			) as "added_by_profile",
			"avg" ("c"."stability") as "avg_stability",
			"count" (distinct "c"."phrase_id") as "count_cards",
			"sum" (
				case
					when ("c"."status" = 'active'::"public"."card_status") then 1
					else 0
				end
			) as "count_active",
			"sum" (
				case
					when ("c"."status" = 'learned'::"public"."card_status") then 1
					else 0
				end
			) as "count_learned",
			"sum" (
				case
					when ("c"."status" = 'skipped'::"public"."card_status") then 1
					else 0
				end
			) as "count_skipped",
			"json_agg" (
				distinct "jsonb_build_object" ('id', "t"."id", 'name', "t"."name")
			) filter (
				where
					("t"."id" is not null)
			) as "tags"
		from
			(
				(
					(
						(
							"public"."phrase" "p"
							left join "card_with_recentest_review" "c" on (("c"."phrase_id" = "p"."id"))
						)
						left join "public"."phrase_tag" "pt" on (("pt"."phrase_id" = "p"."id"))
					)
					left join "public"."public_profile" "pp" on (("p"."added_by" = "pp"."uid"))
				)
				left join "public"."tag" "t" on (("t"."id" = "pt"."tag_id"))
			)
		group by
			"pp"."uid",
			"pp"."username",
			"pp"."avatar_path",
			"p"."id",
			"p"."lang",
			"p"."text",
			"p"."created_at",
			"p"."added_by",
			"p"."request_id"
	)
select
	"results"."id",
	"results"."added_by",
	"results"."request_id",
	"results"."created_at",
	"results"."lang",
	"results"."text",
	"results"."added_by_profile",
	"results"."avg_difficulty",
	"results"."avg_stability",
	"results"."count_cards",
	"results"."count_active",
	"results"."count_learned",
	"results"."count_skipped",
	case
		when ("results"."count_cards" = 0) then null::numeric
		else "round" (
			(("results"."count_active" / "results"."count_cards"))::numeric,
			2
		)
	end as "percent_active",
	case
		when ("results"."count_cards" = 0) then null::numeric
		else "round" (
			(("results"."count_learned" / "results"."count_cards"))::numeric,
			2
		)
	end as "percent_learned",
	case
		when ("results"."count_cards" = 0) then null::numeric
		else "round" (
			(("results"."count_skipped" / "results"."count_cards"))::numeric,
			2
		)
	end as "percent_skipped",
	"rank" () over (
		partition by
			"results"."lang"
		order by
			"results"."avg_difficulty"
	) as "rank_least_difficult",
	"rank" () over (
		partition by
			"results"."lang"
		order by
			"results"."avg_stability" desc nulls last
	) as "rank_most_stable",
	"rank" () over (
		partition by
			"results"."lang"
		order by
			case
				when ("results"."count_cards" > 0) then (
					("results"."count_skipped")::numeric / ("results"."count_cards")::numeric
				)
				else null::numeric
			end
	) as "rank_least_skipped",
	"rank" () over (
		partition by
			"results"."lang"
		order by
			case
				when ("results"."count_cards" > 0) then (
					("results"."count_learned")::numeric / ("results"."count_cards")::numeric
				)
				else null::numeric
			end desc nulls last
	) as "rank_most_learned",
	"rank" () over (
		partition by
			"results"."lang"
		order by
			"results"."created_at" desc
	) as "rank_newest",
	"results"."tags"
from
	"results";

alter table "public"."meta_phrase_info" owner to "postgres";

create table if not exists
	"public"."phrase_request" (
		"id" "uuid" default "gen_random_uuid" () not null,
		"created_at" timestamp with time zone default "now" () not null,
		"requester_uid" "uuid" not null,
		"lang" character varying not null,
		"prompt" "text" not null,
		"status" "public"."phrase_request_status" default 'pending'::"public"."phrase_request_status" not null,
		"fulfilled_at" timestamp with time zone
	);

alter table "public"."phrase_request" owner to "postgres";

create or replace view
	"public"."meta_phrase_request" as
select
	"pr"."id",
	"pr"."created_at",
	"pr"."requester_uid",
	"pr"."lang",
	"pr"."prompt",
	"pr"."status",
	"pr"."fulfilled_at",
	"jsonb_build_object" (
		'uid',
		"pp"."uid",
		'username',
		"pp"."username",
		'avatar_path',
		"pp"."avatar_path"
	) as "requester",
	"jsonb_agg" ("mpi".*) filter (
		where
			("mpi"."id" is not null)
	) as "phrases"
from
	(
		(
			"public"."phrase_request" "pr"
			left join "public"."public_profile" "pp" on (("pr"."requester_uid" = "pp"."uid"))
		)
		left join "public"."meta_phrase_info" "mpi" on (("pr"."id" = "mpi"."request_id"))
	)
group by
	"pr"."id",
	"pr"."created_at",
	"pr"."requester_uid",
	"pr"."lang",
	"pr"."prompt",
	"pr"."status",
	"pr"."fulfilled_at",
	"pp"."uid",
	"pp"."username",
	"pp"."avatar_path";

alter table "public"."meta_phrase_request" owner to "postgres";

create table if not exists
	"public"."phrase_relation" (
		"from_phrase_id" "uuid",
		"to_phrase_id" "uuid",
		"id" "uuid" default "extensions"."uuid_generate_v4" () not null,
		"added_by" "uuid" default "auth"."uid" () not null
	);

alter table "public"."phrase_relation" owner to "postgres";

comment on column "public"."phrase_relation"."added_by" is 'User who added this association';

create table if not exists
	"public"."phrase_translation" (
		"text" "text" not null,
		"literal" "text",
		"id" "uuid" default "extensions"."uuid_generate_v4" () not null,
		"phrase_id" "uuid" not null,
		"added_by" "uuid" default "auth"."uid" () not null,
		"lang" character varying not null,
		"text_script" "text",
		"created_at" timestamp with time zone default "now" () not null
	);

alter table "public"."phrase_translation" owner to "postgres";

comment on table "public"."phrase_translation" is 'A translation of one phrase into another language';

comment on column "public"."phrase_translation"."added_by" is 'User who added this translation';

comment on column "public"."phrase_translation"."lang" is 'The 3-letter code for the language (iso-369-3)';

create or replace view
	"public"."user_card_plus"
with
	("security_invoker" = 'true') as
with
	"review" as (
		select
			"rev"."id",
			"rev"."uid",
			"rev"."score",
			"rev"."difficulty",
			"rev"."stability",
			"rev"."review_time_retrievability",
			"rev"."created_at",
			"rev"."updated_at",
			"rev"."day_session",
			"rev"."lang",
			"rev"."phrase_id"
		from
			(
				"public"."user_card_review" "rev"
				left join "public"."user_card_review" "rev2" on (
					(
						("rev"."phrase_id" = "rev2"."phrase_id")
						and ("rev"."uid" = "rev2"."uid")
						and ("rev"."created_at" < "rev2"."created_at")
					)
				)
			)
		where
			("rev2"."created_at" is null)
	)
select
	"card"."lang",
	"card"."id",
	"card"."uid",
	"card"."status",
	"card"."phrase_id",
	"card"."created_at",
	"card"."updated_at",
	"review"."created_at" as "last_reviewed_at",
	"review"."difficulty",
	"review"."stability",
	current_timestamp as "current_timestamp",
	nullif(
		"public"."fsrs_retrievability" (
			(
				(
					extract(
						epoch
						from
							(current_timestamp - "review"."created_at")
					) / (3600)::numeric
				) / (24)::numeric
			),
			"review"."stability"
		),
		'NaN'::numeric
	) as "retrievability_now"
from
	(
		"public"."user_card" "card"
		left join "review" on (
			(
				("card"."phrase_id" = "review"."phrase_id")
				and ("card"."uid" = "review"."uid")
			)
		)
	);

alter table "public"."user_card_plus" owner to "postgres";

create table if not exists
	"public"."user_client_event" (
		"id" "uuid" default "gen_random_uuid" () not null,
		"created_at" timestamp with time zone default "now" () not null,
		"uid" "uuid" default "auth"."uid" (),
		"message" "text",
		"context" "jsonb",
		"url" "text"
	);

alter table "public"."user_client_event" owner to "postgres";

create or replace view
	"public"."user_deck_plus"
with
	("security_invoker" = 'true') as
select
	"d"."uid",
	"d"."lang",
	"d"."learning_goal",
	"d"."archived",
	"d"."daily_review_goal",
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
			"max" ("r"."created_at") as "max"
		from
			"public"."user_card_review" "r"
		where
			(
				(("r"."lang")::"text" = ("d"."lang")::"text")
				and ("r"."uid" = "d"."uid")
			)
		limit
			1
	) as "most_recent_review_at",
	(
		select
			"count" (*) as "count"
		from
			"public"."user_card_review" "r"
		where
			(
				(("r"."lang")::"text" = ("d"."lang")::"text")
				and ("r"."uid" = "d"."uid")
				and ("r"."created_at" > ("now" () - '7 days'::interval))
			)
		limit
			1
	) as "count_reviews_7d",
	(
		select
			"count" (*) as "count"
		from
			"public"."user_card_review" "r"
		where
			(
				(("r"."lang")::"text" = ("d"."lang")::"text")
				and ("r"."uid" = "d"."uid")
				and ("r"."created_at" > ("now" () - '7 days'::interval))
				and ("r"."score" >= 2)
			)
		limit
			1
	) as "count_reviews_7d_positive"
from
	(
		"public"."user_deck" "d"
		left join "public"."user_card" "c" on (
			(
				(("d"."lang")::"text" = ("c"."lang")::"text")
				and ("d"."uid" = "c"."uid")
			)
		)
	)
group by
	"d"."uid",
	"d"."lang",
	"d"."learning_goal",
	"d"."archived",
	"d"."daily_review_goal",
	"d"."created_at"
order by
	(
		select
			"count" (*) as "count"
		from
			"public"."user_card_review" "r"
		where
			(
				(("r"."lang")::"text" = ("d"."lang")::"text")
				and ("r"."uid" = "d"."uid")
				and ("r"."created_at" > ("now" () - '7 days'::interval))
			)
		limit
			1
	) desc nulls last,
	"d"."created_at" desc;

alter table "public"."user_deck_plus" owner to "postgres";

create table if not exists
	"public"."user_deck_review_state" (
		"lang" character varying not null,
		"uid" "uuid" default "auth"."uid" () not null,
		"day_session" "date" not null,
		"created_at" timestamp with time zone default "now" () not null,
		"manifest" "jsonb"
	);

alter table "public"."user_deck_review_state" owner to "postgres";

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

alter table only "public"."chat_message"
add constraint "chat_message_pkey" primary key ("id");

alter table only "public"."friend_request_action"
add constraint "friend_request_action_pkey" primary key ("id");

alter table only "public"."language"
add constraint "language_code2_key" unique ("lang");

alter table only "public"."language"
add constraint "language_pkey" primary key ("lang");

alter table only "public"."user_deck"
add constraint "one_deck_per_language_per_user" unique ("uid", "lang");

alter table only "public"."phrase_request"
add constraint "phrase_request_pkey" primary key ("id");

alter table only "public"."phrase_tag"
add constraint "phrase_tag_pkey" primary key ("phrase_id", "tag_id");

alter table only "public"."user_profile"
add constraint "profile_old_id_key" unique ("uid");

alter table only "public"."user_profile"
add constraint "profiles_pkey" primary key ("uid");

alter table only "public"."user_profile"
add constraint "profiles_username_key" unique ("username");

alter table only "public"."tag"
add constraint "tag_name_lang_key" unique ("name", "lang");

alter table only "public"."tag"
add constraint "tag_pkey" primary key ("id");

alter table only "public"."user_card_review"
add constraint "user_card_review_pkey" primary key ("id");

alter table only "public"."user_card"
add constraint "user_card_uid_phrase_id_key" unique ("uid", "phrase_id");

alter table only "public"."user_client_event"
add constraint "user_client_event_pkey" primary key ("id");

alter table only "public"."user_card"
add constraint "user_deck_card_membership_pkey" primary key ("id");

alter table only "public"."user_card"
add constraint "user_deck_card_membership_uuid_key" unique ("id");

alter table only "public"."user_deck"
add constraint "user_deck_pkey" primary key ("id");

alter table only "public"."user_deck_review_state"
add constraint "user_deck_review_state_pkey" primary key ("lang", "uid", "day_session");

alter table only "public"."user_deck"
add constraint "user_deck_uuid_key" unique ("id");

create index "chat_message_recipient_uid_sender_uid_created_at_idx" on "public"."chat_message" using "btree" ("recipient_uid", "sender_uid", "created_at" desc);

create index "chat_message_sender_uid_recipient_uid_created_at_idx" on "public"."chat_message" using "btree" ("sender_uid", "recipient_uid", "created_at" desc);

create unique index "uid_card" on "public"."user_card" using "btree" ("uid", "phrase_id");

create unique index "uid_deck" on "public"."user_deck" using "btree" ("uid", "lang");

create unique index "unique_text_phrase_lang" on "public"."phrase_translation" using "btree" ("text", "lang", "phrase_id");

alter table only "public"."chat_message"
add constraint "chat_message_lang_fkey" foreign key ("lang") references "public"."language" ("lang") on update cascade on delete set null;

alter table only "public"."chat_message"
add constraint "chat_message_phrase_id_fkey" foreign key ("phrase_id") references "public"."phrase" ("id") on delete set null;

alter table only "public"."chat_message"
add constraint "chat_message_recipient_uid_fkey" foreign key ("recipient_uid") references "public"."user_profile" ("uid") on delete cascade;

alter table only "public"."chat_message"
add constraint "chat_message_related_message_id_fkey" foreign key ("related_message_id") references "public"."chat_message" ("id") on delete set null;

alter table only "public"."chat_message"
add constraint "chat_message_request_id_fkey" foreign key ("request_id") references "public"."phrase_request" ("id") on delete set null;

alter table only "public"."chat_message"
add constraint "chat_message_sender_uid_fkey" foreign key ("sender_uid") references "public"."user_profile" ("uid") on delete cascade;

alter table only "public"."friend_request_action"
add constraint "friend_request_action_uid_by_fkey" foreign key ("uid_by") references "public"."user_profile" ("uid") on update cascade on delete cascade;

alter table only "public"."friend_request_action"
add constraint "friend_request_action_uid_for_fkey" foreign key ("uid_for") references "public"."user_profile" ("uid") on update cascade on delete cascade;

alter table only "public"."friend_request_action"
add constraint "friend_request_action_uid_less_fkey" foreign key ("uid_less") references "public"."user_profile" ("uid") on update cascade on delete cascade;

alter table only "public"."friend_request_action"
add constraint "friend_request_action_uid_more_fkey" foreign key ("uid_more") references "public"."user_profile" ("uid") on update cascade on delete cascade;

alter table only "public"."phrase"
add constraint "phrase_added_by_fkey" foreign key ("added_by") references "public"."user_profile" ("uid") on delete set null;

alter table only "public"."phrase"
add constraint "phrase_lang_fkey" foreign key ("lang") references "public"."language" ("lang");

alter table only "public"."phrase"
add constraint "phrase_request_id_fkey" foreign key ("request_id") references "public"."phrase_request" ("id") on delete set null;

alter table only "public"."phrase_request"
add constraint "phrase_request_lang_fkey" foreign key ("lang") references "public"."language" ("lang") on delete cascade;

alter table only "public"."phrase_request"
add constraint "phrase_request_requester_uid_fkey" foreign key ("requester_uid") references "public"."user_profile" ("uid") on delete cascade;

alter table only "public"."phrase_relation"
add constraint "phrase_see_also_added_by_fkey" foreign key ("added_by") references "public"."user_profile" ("uid") on delete set null;

alter table only "public"."phrase_relation"
add constraint "phrase_see_also_from_phrase_id_fkey" foreign key ("from_phrase_id") references "public"."phrase" ("id");

alter table only "public"."phrase_relation"
add constraint "phrase_see_also_to_phrase_id_fkey" foreign key ("to_phrase_id") references "public"."phrase" ("id");

alter table only "public"."phrase_tag"
add constraint "phrase_tag_added_by_fkey" foreign key ("added_by") references "public"."user_profile" ("uid") on delete set null;

alter table only "public"."phrase_tag"
add constraint "phrase_tag_phrase_id_fkey" foreign key ("phrase_id") references "public"."phrase" ("id") on delete cascade;

alter table only "public"."phrase_tag"
add constraint "phrase_tag_tag_id_fkey" foreign key ("tag_id") references "public"."tag" ("id") on delete cascade;

alter table only "public"."phrase_translation"
add constraint "phrase_translation_added_by_fkey" foreign key ("added_by") references "public"."user_profile" ("uid") on delete set null;

alter table only "public"."phrase_translation"
add constraint "phrase_translation_lang_fkey" foreign key ("lang") references "public"."language" ("lang");

alter table only "public"."phrase_translation"
add constraint "phrase_translation_phrase_id_fkey" foreign key ("phrase_id") references "public"."phrase" ("id") on delete cascade;

alter table only "public"."tag"
add constraint "tag_added_by_fkey" foreign key ("added_by") references "public"."user_profile" ("uid") on delete set null;

alter table only "public"."tag"
add constraint "tag_lang_fkey" foreign key ("lang") references "public"."language" ("lang") on update cascade on delete cascade;

alter table only "public"."user_card"
add constraint "user_card_lang_fkey" foreign key ("lang") references "public"."language" ("lang") on update cascade on delete cascade;

alter table only "public"."user_card"
add constraint "user_card_lang_uid_fkey" foreign key ("uid", "lang") references "public"."user_deck" ("uid", "lang");

alter table only "public"."user_card"
add constraint "user_card_phrase_id_fkey" foreign key ("phrase_id") references "public"."phrase" ("id") on delete cascade;

alter table only "public"."user_card_review"
add constraint "user_card_review_lang_uid_fkey" foreign key ("uid", "lang") references "public"."user_deck" ("uid", "lang");

alter table only "public"."user_card_review"
add constraint "user_card_review_phrase_id_fkey" foreign key ("phrase_id") references "public"."phrase" ("id") on update cascade on delete set null;

alter table only "public"."user_card_review"
add constraint "user_card_review_phrase_id_uid_fkey" foreign key ("uid", "phrase_id") references "public"."user_card" ("uid", "phrase_id");

alter table only "public"."user_card_review"
add constraint "user_card_review_uid_fkey" foreign key ("uid") references "public"."user_profile" ("uid") on update cascade on delete cascade;

alter table only "public"."user_card_review"
add constraint "user_card_review_uid_lang_day_session_fkey" foreign key ("uid", "lang", "day_session") references "public"."user_deck_review_state" ("uid", "lang", "day_session") on update cascade on delete set null;

alter table only "public"."user_card"
add constraint "user_card_uid_fkey" foreign key ("uid") references "public"."user_profile" ("uid") on update cascade on delete cascade;

alter table only "public"."user_client_event"
add constraint "user_client_event_uid_fkey" foreign key ("uid") references "public"."user_profile" ("uid") on update cascade on delete set null;

alter table only "public"."user_deck"
add constraint "user_deck_lang_fkey" foreign key ("lang") references "public"."language" ("lang");

alter table only "public"."user_deck_review_state"
add constraint "user_deck_review_state_lang_uid_fkey" foreign key ("lang", "uid") references "public"."user_deck" ("lang", "uid") on update cascade on delete cascade;

alter table only "public"."user_deck"
add constraint "user_deck_uid_fkey" foreign key ("uid") references "public"."user_profile" ("uid") on update cascade on delete cascade;

create policy "Anyone can add cards" on "public"."phrase" for insert to "authenticated"
with
	check (true);

create policy "Enable insert for any user" on "public"."user_client_event" for insert to "authenticated",
"anon"
with
	check (true);

create policy "Enable insert for authenticated users only" on "public"."user_card_review" for insert to "authenticated"
with
	check (
		(
			(
				select
					"auth"."uid" () as "uid"
			) = "uid"
		)
	);

create policy "Enable insert for authenticated users only" on "public"."user_deck_review_state" for insert to "authenticated"
with
	check (("uid" = "auth"."uid" ()));

create policy "Enable read access for all users" on "public"."language" for
select
	using (true);

create policy "Enable read access for all users" on "public"."phrase" for
select
	using (true);

create policy "Enable read access for all users" on "public"."phrase_relation" for
select
	using (true);

create policy "Enable read access for all users" on "public"."phrase_request" for
select
	using (true);

create policy "Enable read access for all users" on "public"."phrase_tag" for
select
	using (true);

create policy "Enable read access for all users" on "public"."phrase_translation" for
select
	using (true);

create policy "Enable read access for all users" on "public"."tag" for
select
	using (true);

create policy "Enable users to update their own data only" on "public"."user_card_review" for
update to "authenticated" using (
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

create policy "Enable users to view their own data only" on "public"."user_card_review" for
select
	to "authenticated" using (
		(
			(
				select
					"auth"."uid" () as "uid"
			) = "uid"
		)
	);

create policy "Enable users to view their own data only" on "public"."user_deck_review_state" for
select
	to "authenticated" using (
		(
			(
				select
					"auth"."uid" () as "uid"
			) = "uid"
		)
	);

create policy "Logged in users can add see_also's" on "public"."phrase_relation" for insert to "authenticated"
with
	check (true);

create policy "Logged in users can add translations" on "public"."phrase_translation" for insert to "authenticated"
with
	check (true);

create policy "Policy with table joins" on "public"."friend_request_action" for insert to "authenticated"
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

create policy "Users can cancel their own requests" on "public"."phrase_request" for
update to "authenticated" using (("requester_uid" = "auth"."uid" ()))
with
	check (("requester_uid" = "auth"."uid" ()));

create policy "Users can create their own requests" on "public"."phrase_request" for insert to "authenticated"
with
	check (("requester_uid" = "auth"."uid" ()));

create policy "Users can insert tags" on "public"."tag" for insert
with
	check (("auth"."role" () = 'authenticated'::"text"));

create policy "Users can link tags to phrases" on "public"."phrase_tag" for insert
with
	check (("auth"."role" () = 'authenticated'::"text"));

create policy "Users can send messages to friends" on "public"."chat_message" for insert
with
	check (
		(
			("auth"."uid" () = "sender_uid")
			and "public"."are_friends" ("sender_uid", "recipient_uid")
		)
	);

create policy "Users can view their own chat messages" on "public"."chat_message" for
select
	using (
		(
			("auth"."uid" () = "sender_uid")
			or ("auth"."uid" () = "recipient_uid")
		)
	);

alter table "public"."chat_message" enable row level security;

alter table "public"."friend_request_action" enable row level security;

alter table "public"."language" enable row level security;

alter table "public"."phrase" enable row level security;

alter table "public"."phrase_relation" enable row level security;

alter table "public"."phrase_request" enable row level security;

alter table "public"."phrase_tag" enable row level security;

alter table "public"."phrase_translation" enable row level security;

alter table "public"."tag" enable row level security;

alter table "public"."user_card" enable row level security;

alter table "public"."user_card_review" enable row level security;

alter table "public"."user_client_event" enable row level security;

alter table "public"."user_deck" enable row level security;

alter table "public"."user_deck_review_state" enable row level security;

alter table "public"."user_profile" enable row level security;

alter publication "supabase_realtime" owner to "postgres";

alter publication "supabase_realtime"
add table only "public"."chat_message";

revoke USAGE on schema "public"
from
	PUBLIC;

grant USAGE on schema "public" to "anon";

grant USAGE on schema "public" to "authenticated";

grant USAGE on schema "public" to "service_role";

grant all on function "public"."add_phrase_translation_card" (
	"phrase_text" "text",
	"phrase_lang" "text",
	"translation_text" "text",
	"translation_lang" "text",
	"phrase_text_script" "text",
	"translation_text_script" "text"
) to "anon";

grant all on function "public"."add_phrase_translation_card" (
	"phrase_text" "text",
	"phrase_lang" "text",
	"translation_text" "text",
	"translation_lang" "text",
	"phrase_text_script" "text",
	"translation_text_script" "text"
) to "authenticated";

grant all on function "public"."add_phrase_translation_card" (
	"phrase_text" "text",
	"phrase_lang" "text",
	"translation_text" "text",
	"translation_lang" "text",
	"phrase_text_script" "text",
	"translation_text_script" "text"
) to "service_role";

grant all on function "public"."add_tags_to_phrase" (
	"p_phrase_id" "uuid",
	"p_lang" character varying,
	"p_tags" "text" []
) to "anon";

grant all on function "public"."add_tags_to_phrase" (
	"p_phrase_id" "uuid",
	"p_lang" character varying,
	"p_tags" "text" []
) to "authenticated";

grant all on function "public"."add_tags_to_phrase" (
	"p_phrase_id" "uuid",
	"p_lang" character varying,
	"p_tags" "text" []
) to "service_role";

grant all on function "public"."are_friends" ("uid1" "uuid", "uid2" "uuid") to "anon";

grant all on function "public"."are_friends" ("uid1" "uuid", "uid2" "uuid") to "authenticated";

grant all on function "public"."are_friends" ("uid1" "uuid", "uid2" "uuid") to "service_role";

grant all on function "public"."bulk_add_phrases" (
	"p_lang" character,
	"p_phrases" "public"."phrase_with_translations_input" []
) to "anon";

grant all on function "public"."bulk_add_phrases" (
	"p_lang" character,
	"p_phrases" "public"."phrase_with_translations_input" []
) to "authenticated";

grant all on function "public"."bulk_add_phrases" (
	"p_lang" character,
	"p_phrases" "public"."phrase_with_translations_input" []
) to "service_role";

grant all on function "public"."fsrs_clamp_d" ("difficulty" numeric) to "anon";

grant all on function "public"."fsrs_clamp_d" ("difficulty" numeric) to "authenticated";

grant all on function "public"."fsrs_clamp_d" ("difficulty" numeric) to "service_role";

grant all on function "public"."fsrs_d_0" ("score" integer) to "anon";

grant all on function "public"."fsrs_d_0" ("score" integer) to "authenticated";

grant all on function "public"."fsrs_d_0" ("score" integer) to "service_role";

grant all on function "public"."fsrs_days_between" (
	"date_before" timestamp with time zone,
	"date_after" timestamp with time zone
) to "anon";

grant all on function "public"."fsrs_days_between" (
	"date_before" timestamp with time zone,
	"date_after" timestamp with time zone
) to "authenticated";

grant all on function "public"."fsrs_days_between" (
	"date_before" timestamp with time zone,
	"date_after" timestamp with time zone
) to "service_role";

grant all on function "public"."fsrs_delta_d" ("score" integer) to "anon";

grant all on function "public"."fsrs_delta_d" ("score" integer) to "authenticated";

grant all on function "public"."fsrs_delta_d" ("score" integer) to "service_role";

grant all on function "public"."fsrs_difficulty" ("difficulty" numeric, "score" integer) to "anon";

grant all on function "public"."fsrs_difficulty" ("difficulty" numeric, "score" integer) to "authenticated";

grant all on function "public"."fsrs_difficulty" ("difficulty" numeric, "score" integer) to "service_role";

grant all on function "public"."fsrs_dp" ("difficulty" numeric, "score" integer) to "anon";

grant all on function "public"."fsrs_dp" ("difficulty" numeric, "score" integer) to "authenticated";

grant all on function "public"."fsrs_dp" ("difficulty" numeric, "score" integer) to "service_role";

grant all on function "public"."fsrs_interval" ("desired_retrievability" numeric, "stability" numeric) to "anon";

grant all on function "public"."fsrs_interval" ("desired_retrievability" numeric, "stability" numeric) to "authenticated";

grant all on function "public"."fsrs_interval" ("desired_retrievability" numeric, "stability" numeric) to "service_role";

grant all on function "public"."fsrs_retrievability" ("time_in_days" numeric, "stability" numeric) to "anon";

grant all on function "public"."fsrs_retrievability" ("time_in_days" numeric, "stability" numeric) to "authenticated";

grant all on function "public"."fsrs_retrievability" ("time_in_days" numeric, "stability" numeric) to "service_role";

grant all on function "public"."fsrs_s_0" ("score" integer) to "anon";

grant all on function "public"."fsrs_s_0" ("score" integer) to "authenticated";

grant all on function "public"."fsrs_s_0" ("score" integer) to "service_role";

grant all on function "public"."fsrs_s_fail" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric
) to "anon";

grant all on function "public"."fsrs_s_fail" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric
) to "authenticated";

grant all on function "public"."fsrs_s_fail" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric
) to "service_role";

grant all on function "public"."fsrs_s_success" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" integer
) to "anon";

grant all on function "public"."fsrs_s_success" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" integer
) to "authenticated";

grant all on function "public"."fsrs_s_success" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" integer
) to "service_role";

grant all on function "public"."fsrs_stability" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" integer
) to "anon";

grant all on function "public"."fsrs_stability" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" integer
) to "authenticated";

grant all on function "public"."fsrs_stability" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" integer
) to "service_role";

grant all on function "public"."fulfill_phrase_request" (
	"request_id" "uuid",
	"p_phrase_text" "text",
	"p_translation_text" "text",
	"p_translation_lang" character varying
) to "anon";

grant all on function "public"."fulfill_phrase_request" (
	"request_id" "uuid",
	"p_phrase_text" "text",
	"p_translation_text" "text",
	"p_translation_lang" character varying
) to "authenticated";

grant all on function "public"."fulfill_phrase_request" (
	"request_id" "uuid",
	"p_phrase_text" "text",
	"p_translation_text" "text",
	"p_translation_lang" character varying
) to "service_role";

grant all on table "public"."user_card_review" to "authenticated";

grant all on table "public"."user_card_review" to "service_role";

grant all on table "public"."user_card_review" to "anon";

grant all on function "public"."insert_user_card_review" (
	"phrase_id" "uuid",
	"lang" character varying,
	"score" integer,
	"day_session" "text",
	"desired_retention" numeric
) to "anon";

grant all on function "public"."insert_user_card_review" (
	"phrase_id" "uuid",
	"lang" character varying,
	"score" integer,
	"day_session" "text",
	"desired_retention" numeric
) to "authenticated";

grant all on function "public"."insert_user_card_review" (
	"phrase_id" "uuid",
	"lang" character varying,
	"score" integer,
	"day_session" "text",
	"desired_retention" numeric
) to "service_role";

grant all on function "public"."update_user_card_review" ("review_id" "uuid", "score" integer) to "anon";

grant all on function "public"."update_user_card_review" ("review_id" "uuid", "score" integer) to "authenticated";

grant all on function "public"."update_user_card_review" ("review_id" "uuid", "score" integer) to "service_role";

grant all on table "public"."chat_message" to "anon";

grant all on table "public"."chat_message" to "authenticated";

grant all on table "public"."chat_message" to "service_role";

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

grant all on table "public"."meta_language" to "anon";

grant all on table "public"."meta_language" to "authenticated";

grant all on table "public"."meta_language" to "service_role";

grant all on table "public"."phrase_tag" to "anon";

grant all on table "public"."phrase_tag" to "authenticated";

grant all on table "public"."phrase_tag" to "service_role";

grant all on table "public"."user_profile" to "anon";

grant all on table "public"."user_profile" to "authenticated";

grant all on table "public"."user_profile" to "service_role";

grant all on table "public"."public_profile" to "anon";

grant all on table "public"."public_profile" to "authenticated";

grant all on table "public"."public_profile" to "service_role";

grant all on table "public"."tag" to "anon";

grant all on table "public"."tag" to "authenticated";

grant all on table "public"."tag" to "service_role";

grant all on table "public"."user_card" to "anon";

grant all on table "public"."user_card" to "authenticated";

grant all on table "public"."user_card" to "service_role";

grant all on table "public"."meta_phrase_info" to "anon";

grant all on table "public"."meta_phrase_info" to "authenticated";

grant all on table "public"."meta_phrase_info" to "service_role";

grant all on table "public"."phrase_request" to "anon";

grant all on table "public"."phrase_request" to "authenticated";

grant all on table "public"."phrase_request" to "service_role";

grant all on table "public"."meta_phrase_request" to "anon";

grant all on table "public"."meta_phrase_request" to "authenticated";

grant all on table "public"."meta_phrase_request" to "service_role";

grant all on table "public"."phrase_relation" to "anon";

grant all on table "public"."phrase_relation" to "authenticated";

grant all on table "public"."phrase_relation" to "service_role";

grant all on table "public"."phrase_translation" to "anon";

grant all on table "public"."phrase_translation" to "authenticated";

grant all on table "public"."phrase_translation" to "service_role";

grant all on table "public"."user_card_plus" to "anon";

grant all on table "public"."user_card_plus" to "authenticated";

grant all on table "public"."user_card_plus" to "service_role";

grant all on table "public"."user_client_event" to "anon";

grant all on table "public"."user_client_event" to "authenticated";

grant all on table "public"."user_client_event" to "service_role";

grant all on table "public"."user_deck_plus" to "anon";

grant all on table "public"."user_deck_plus" to "authenticated";

grant all on table "public"."user_deck_plus" to "service_role";

grant all on table "public"."user_deck_review_state" to "anon";

grant all on table "public"."user_deck_review_state" to "authenticated";

grant all on table "public"."user_deck_review_state" to "service_role";

alter default privileges for role "postgres" in schema "public"
grant all on sequences to "postgres";

alter default privileges for role "postgres" in schema "public"
grant all on sequences to "anon";

alter default privileges for role "postgres" in schema "public"
grant all on sequences to "authenticated";

alter default privileges for role "postgres" in schema "public"
grant all on sequences to "service_role";

alter default privileges for role "postgres" in schema "public"
grant all on functions to "postgres";

alter default privileges for role "postgres" in schema "public"
grant all on functions to "anon";

alter default privileges for role "postgres" in schema "public"
grant all on functions to "authenticated";

alter default privileges for role "postgres" in schema "public"
grant all on functions to "service_role";

alter default privileges for role "postgres" in schema "public"
grant all on tables to "postgres";

alter default privileges for role "postgres" in schema "public"
grant all on tables to "anon";

alter default privileges for role "postgres" in schema "public"
grant all on tables to "authenticated";

alter default privileges for role "postgres" in schema "public"
grant all on tables to "service_role";

reset all;