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

create schema if not exists "auth";

alter schema "auth" owner to "supabase_admin";

create schema if not exists "public";

alter schema "public" owner to "postgres";

comment on schema "public" is '@graphql({"inflect_names": true})';

create schema if not exists "storage";

alter schema "storage" owner to "supabase_admin";

create type "auth"."aal_level" as enum('aal1', 'aal2', 'aal3');

alter type "auth"."aal_level" owner to "supabase_auth_admin";

create type "auth"."code_challenge_method" as enum('s256', 'plain');

alter type "auth"."code_challenge_method" owner to "supabase_auth_admin";

create type "auth"."factor_status" as enum('unverified', 'verified');

alter type "auth"."factor_status" owner to "supabase_auth_admin";

create type "auth"."factor_type" as enum('totp', 'webauthn', 'phone');

alter type "auth"."factor_type" owner to "supabase_auth_admin";

create type "auth"."one_time_token_type" as enum(
	'confirmation_token',
	'reauthentication_token',
	'recovery_token',
	'email_change_token_new',
	'email_change_token_current',
	'phone_change_token'
);

alter type "auth"."one_time_token_type" owner to "supabase_auth_admin";

create type "public"."card_status" as enum('active', 'learned', 'skipped');

alter type "public"."card_status" owner to "postgres";

comment on
type "public"."card_status" is 'card status is either active, learned or skipped';

create type "public"."friend_request_response" as enum('accept', 'decline', 'cancel', 'remove', 'invite');

alter type "public"."friend_request_response" owner to "postgres";

create type "public"."learning_goal" as enum('moving', 'family', 'visiting');

alter type "public"."learning_goal" owner to "postgres";

comment on
type "public"."learning_goal" is 'why are you learning this language?';

create
or replace function "auth"."email" () returns "text" language "sql" stable as $$
  select
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;

alter function "auth"."email" () owner to "supabase_auth_admin";

comment on function "auth"."email" () is 'Deprecated. Use auth.jwt() -> ''email'' instead.';

create
or replace function "auth"."jwt" () returns "jsonb" language "sql" stable as $$
  select
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;

alter function "auth"."jwt" () owner to "supabase_auth_admin";

create
or replace function "auth"."role" () returns "text" language "sql" stable as $$
  select
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;

alter function "auth"."role" () owner to "supabase_auth_admin";

comment on function "auth"."role" () is 'Deprecated. Use auth.jwt() -> ''role'' instead.';

create
or replace function "auth"."uid" () returns "uuid" language "sql" stable as $$
  select
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

alter function "auth"."uid" () owner to "supabase_auth_admin";

comment on function "auth"."uid" () is 'Deprecated. Use auth.jwt() -> ''sub'' instead.';

create
or replace function "public"."add_phrase_translation_card" (
	"text" "text",
	"lang" "text",
	"translation_text" "text",
	"translation_lang" "text"
) returns "uuid" language "plpgsql" as $$
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

set
	default_tablespace = '';

set
	default_table_access_method = "heap";

create table if not exists
	"public"."user_card_review" (
		"id" "uuid" default "gen_random_uuid" () not null,
		"uid" "uuid" default "auth"."uid" () not null,
		"user_card_id" "uuid" not null,
		"score" smallint not null,
		"difficulty" numeric,
		"stability" numeric,
		"review_time_retrievability" numeric,
		"created_at" timestamp with time zone default "now" () not null,
		"updated_at" timestamp with time zone default "now" () not null,
		"user_deck_id" "uuid" not null,
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
	"user_card_id" "uuid",
	"score" integer,
	"desired_retention" numeric default 0.9
) returns "public"."user_card_review" language "plv8" as $_$

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
	`INSERT INTO public.user_card_review (score, user_card_id, user_deck_id, review_time_retrievability, difficulty, stability) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
	[
		score,
		user_card_id,
		prev.user_deck_id,
		calc.review_time_retrievability,
		calc.difficulty,
		calc.stability
	]
);

const response = insertedResult[0] ?? null;
if (!response) throw new Error(`Got all the way to the end and then no row was inserted for ${user_card_id}, ${score}, prev: ${JSON.stringify(prev)}, calc: ${JSON.stringify(calc)}`)
return response

$_$;

alter function "public"."insert_user_card_review" (
	"user_card_id" "uuid",
	"score" integer,
	"desired_retention" numeric
) owner to "postgres";

create
or replace function "storage"."add_prefixes" ("_bucket_id" "text", "_name" "text") returns "void" language "plpgsql" security definer as $$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$$;

alter function "storage"."add_prefixes" ("_bucket_id" "text", "_name" "text") owner to "supabase_storage_admin";

create
or replace function "storage"."can_insert_object" (
	"bucketid" "text",
	"name" "text",
	"owner" "uuid",
	"metadata" "jsonb"
) returns "void" language "plpgsql" as $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;

alter function "storage"."can_insert_object" (
	"bucketid" "text",
	"name" "text",
	"owner" "uuid",
	"metadata" "jsonb"
) owner to "supabase_storage_admin";

create
or replace function "storage"."delete_prefix" ("_bucket_id" "text", "_name" "text") returns boolean language "plpgsql" security definer as $$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$$;

alter function "storage"."delete_prefix" ("_bucket_id" "text", "_name" "text") owner to "supabase_storage_admin";

create
or replace function "storage"."delete_prefix_hierarchy_trigger" () returns "trigger" language "plpgsql" as $$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$$;

alter function "storage"."delete_prefix_hierarchy_trigger" () owner to "supabase_storage_admin";

create
or replace function "storage"."extension" ("name" "text") returns "text" language "plpgsql" as $$
DECLARE
_parts text[];
_filename text;
BEGIN
    select string_to_array(name, '/') into _parts;
    select _parts[array_length(_parts,1)] into _filename;
    -- @todo return the last part instead of 2
    return split_part(_filename, '.', 2);
END
$$;

alter function "storage"."extension" ("name" "text") owner to "supabase_storage_admin";

create
or replace function "storage"."filename" ("name" "text") returns "text" language "plpgsql" as $$
DECLARE
_parts text[];
BEGIN
    select string_to_array(name, '/') into _parts;
    return _parts[array_length(_parts,1)];
END
$$;

alter function "storage"."filename" ("name" "text") owner to "supabase_storage_admin";

create
or replace function "storage"."foldername" ("name" "text") returns "text" [] language "plpgsql" as $$
DECLARE
_parts text[];
BEGIN
    select string_to_array(name, '/') into _parts;
    return _parts[1:array_length(_parts,1)-1];
END
$$;

alter function "storage"."foldername" ("name" "text") owner to "supabase_storage_admin";

create
or replace function "storage"."get_level" ("name" "text") returns integer language "sql" immutable strict as $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;

alter function "storage"."get_level" ("name" "text") owner to "supabase_storage_admin";

create
or replace function "storage"."get_prefix" ("name" "text") returns "text" language "sql" immutable strict as $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;

alter function "storage"."get_prefix" ("name" "text") owner to "supabase_storage_admin";

create
or replace function "storage"."get_prefixes" ("name" "text") returns "text" [] language "plpgsql" immutable strict as $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;

alter function "storage"."get_prefixes" ("name" "text") owner to "supabase_storage_admin";

create
or replace function "storage"."get_size_by_bucket" () returns table ("size" bigint, "bucket_id" "text") language "plpgsql" stable as $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;

alter function "storage"."get_size_by_bucket" () owner to "supabase_storage_admin";

create
or replace function "storage"."list_multipart_uploads_with_delimiter" (
	"bucket_id" "text",
	"prefix_param" "text",
	"delimiter_param" "text",
	"max_keys" integer default 100,
	"next_key_token" "text" default ''::"text",
	"next_upload_token" "text" default ''::"text"
) returns table ("key" "text", "id" "text", "created_at" timestamp with time zone) language "plpgsql" as $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;

alter function "storage"."list_multipart_uploads_with_delimiter" (
	"bucket_id" "text",
	"prefix_param" "text",
	"delimiter_param" "text",
	"max_keys" integer,
	"next_key_token" "text",
	"next_upload_token" "text"
) owner to "supabase_storage_admin";

create
or replace function "storage"."list_objects_with_delimiter" (
	"bucket_id" "text",
	"prefix_param" "text",
	"delimiter_param" "text",
	"max_keys" integer default 100,
	"start_after" "text" default ''::"text",
	"next_token" "text" default ''::"text"
) returns table (
	"name" "text",
	"id" "uuid",
	"metadata" "jsonb",
	"updated_at" timestamp with time zone
) language "plpgsql" as $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;

alter function "storage"."list_objects_with_delimiter" (
	"bucket_id" "text",
	"prefix_param" "text",
	"delimiter_param" "text",
	"max_keys" integer,
	"start_after" "text",
	"next_token" "text"
) owner to "supabase_storage_admin";

create
or replace function "storage"."objects_insert_prefix_trigger" () returns "trigger" language "plpgsql" as $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;

alter function "storage"."objects_insert_prefix_trigger" () owner to "supabase_storage_admin";

create
or replace function "storage"."objects_update_prefix_trigger" () returns "trigger" language "plpgsql" as $$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;

alter function "storage"."objects_update_prefix_trigger" () owner to "supabase_storage_admin";

create
or replace function "storage"."operation" () returns "text" language "plpgsql" stable as $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;

alter function "storage"."operation" () owner to "supabase_storage_admin";

create
or replace function "storage"."prefixes_insert_trigger" () returns "trigger" language "plpgsql" as $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$$;

alter function "storage"."prefixes_insert_trigger" () owner to "supabase_storage_admin";

create
or replace function "storage"."search" (
	"prefix" "text",
	"bucketname" "text",
	"limits" integer default 100,
	"levels" integer default 1,
	"offsets" integer default 0,
	"search" "text" default ''::"text",
	"sortcolumn" "text" default 'name'::"text",
	"sortorder" "text" default 'asc'::"text"
) returns table (
	"name" "text",
	"id" "uuid",
	"updated_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"last_accessed_at" timestamp with time zone,
	"metadata" "jsonb"
) language "plpgsql" as $$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$$;

alter function "storage"."search" (
	"prefix" "text",
	"bucketname" "text",
	"limits" integer,
	"levels" integer,
	"offsets" integer,
	"search" "text",
	"sortcolumn" "text",
	"sortorder" "text"
) owner to "supabase_storage_admin";

create
or replace function "storage"."search_legacy_v1" (
	"prefix" "text",
	"bucketname" "text",
	"limits" integer default 100,
	"levels" integer default 1,
	"offsets" integer default 0,
	"search" "text" default ''::"text",
	"sortcolumn" "text" default 'name'::"text",
	"sortorder" "text" default 'asc'::"text"
) returns table (
	"name" "text",
	"id" "uuid",
	"updated_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"last_accessed_at" timestamp with time zone,
	"metadata" "jsonb"
) language "plpgsql" stable as $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;

alter function "storage"."search_legacy_v1" (
	"prefix" "text",
	"bucketname" "text",
	"limits" integer,
	"levels" integer,
	"offsets" integer,
	"search" "text",
	"sortcolumn" "text",
	"sortorder" "text"
) owner to "supabase_storage_admin";

create
or replace function "storage"."search_v1_optimised" (
	"prefix" "text",
	"bucketname" "text",
	"limits" integer default 100,
	"levels" integer default 1,
	"offsets" integer default 0,
	"search" "text" default ''::"text",
	"sortcolumn" "text" default 'name'::"text",
	"sortorder" "text" default 'asc'::"text"
) returns table (
	"name" "text",
	"id" "uuid",
	"updated_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"last_accessed_at" timestamp with time zone,
	"metadata" "jsonb"
) language "plpgsql" stable as $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;

alter function "storage"."search_v1_optimised" (
	"prefix" "text",
	"bucketname" "text",
	"limits" integer,
	"levels" integer,
	"offsets" integer,
	"search" "text",
	"sortcolumn" "text",
	"sortorder" "text"
) owner to "supabase_storage_admin";

create
or replace function "storage"."search_v2" (
	"prefix" "text",
	"bucket_name" "text",
	"limits" integer default 100,
	"levels" integer default 1,
	"start_after" "text" default ''::"text"
) returns table (
	"key" "text",
	"name" "text",
	"id" "uuid",
	"updated_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"metadata" "jsonb"
) language "plpgsql" stable as $_$
BEGIN
    RETURN query EXECUTE
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name || '/' AS name,
                    NULL::uuid AS id,
                    NULL::timestamptz AS updated_at,
                    NULL::timestamptz AS created_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%'
                AND bucket_id = $2
                AND level = $4
                AND name COLLATE "C" > $5
                ORDER BY prefixes.name COLLATE "C" LIMIT $3
            )
            UNION ALL
            (SELECT split_part(name, '/', $4) AS key,
                name,
                id,
                updated_at,
                created_at,
                metadata
            FROM storage.objects
            WHERE name COLLATE "C" LIKE $1 || '%'
                AND bucket_id = $2
                AND level = $4
                AND name COLLATE "C" > $5
            ORDER BY name COLLATE "C" LIMIT $3)
        ) obj
        ORDER BY name COLLATE "C" LIMIT $3;
        $sql$
        USING prefix, bucket_name, limits, levels, start_after;
END;
$_$;

alter function "storage"."search_v2" (
	"prefix" "text",
	"bucket_name" "text",
	"limits" integer,
	"levels" integer,
	"start_after" "text"
) owner to "supabase_storage_admin";

create
or replace function "storage"."update_updated_at_column" () returns "trigger" language "plpgsql" as $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

alter function "storage"."update_updated_at_column" () owner to "supabase_storage_admin";

create table if not exists
	"auth"."audit_log_entries" (
		"instance_id" "uuid",
		"id" "uuid" not null,
		"payload" "json",
		"created_at" timestamp with time zone,
		"ip_address" character varying(64) default ''::character varying not null
	);

alter table "auth"."audit_log_entries" owner to "supabase_auth_admin";

comment on table "auth"."audit_log_entries" is 'Auth: Audit trail for user actions.';

create table if not exists
	"auth"."flow_state" (
		"id" "uuid" not null,
		"user_id" "uuid",
		"auth_code" "text" not null,
		"code_challenge_method" "auth"."code_challenge_method" not null,
		"code_challenge" "text" not null,
		"provider_type" "text" not null,
		"provider_access_token" "text",
		"provider_refresh_token" "text",
		"created_at" timestamp with time zone,
		"updated_at" timestamp with time zone,
		"authentication_method" "text" not null,
		"auth_code_issued_at" timestamp with time zone
	);

alter table "auth"."flow_state" owner to "supabase_auth_admin";

comment on table "auth"."flow_state" is 'stores metadata for pkce logins';

create table if not exists
	"auth"."identities" (
		"provider_id" "text" not null,
		"user_id" "uuid" not null,
		"identity_data" "jsonb" not null,
		"provider" "text" not null,
		"last_sign_in_at" timestamp with time zone,
		"created_at" timestamp with time zone,
		"updated_at" timestamp with time zone,
		"email" "text" generated always as ("lower" (("identity_data" ->> 'email'::"text"))) stored,
		"id" "uuid" default "gen_random_uuid" () not null
	);

alter table "auth"."identities" owner to "supabase_auth_admin";

comment on table "auth"."identities" is 'Auth: Stores identities associated to a user.';

comment on column "auth"."identities"."email" is 'Auth: Email is a generated column that references the optional email property in the identity_data';

create table if not exists
	"auth"."instances" (
		"id" "uuid" not null,
		"uuid" "uuid",
		"raw_base_config" "text",
		"created_at" timestamp with time zone,
		"updated_at" timestamp with time zone
	);

alter table "auth"."instances" owner to "supabase_auth_admin";

comment on table "auth"."instances" is 'Auth: Manages users across multiple sites.';

create table if not exists
	"auth"."mfa_amr_claims" (
		"session_id" "uuid" not null,
		"created_at" timestamp with time zone not null,
		"updated_at" timestamp with time zone not null,
		"authentication_method" "text" not null,
		"id" "uuid" not null
	);

alter table "auth"."mfa_amr_claims" owner to "supabase_auth_admin";

comment on table "auth"."mfa_amr_claims" is 'auth: stores authenticator method reference claims for multi factor authentication';

create table if not exists
	"auth"."mfa_challenges" (
		"id" "uuid" not null,
		"factor_id" "uuid" not null,
		"created_at" timestamp with time zone not null,
		"verified_at" timestamp with time zone,
		"ip_address" "inet" not null,
		"otp_code" "text",
		"web_authn_session_data" "jsonb"
	);

alter table "auth"."mfa_challenges" owner to "supabase_auth_admin";

comment on table "auth"."mfa_challenges" is 'auth: stores metadata about challenge requests made';

create table if not exists
	"auth"."mfa_factors" (
		"id" "uuid" not null,
		"user_id" "uuid" not null,
		"friendly_name" "text",
		"factor_type" "auth"."factor_type" not null,
		"status" "auth"."factor_status" not null,
		"created_at" timestamp with time zone not null,
		"updated_at" timestamp with time zone not null,
		"secret" "text",
		"phone" "text",
		"last_challenged_at" timestamp with time zone,
		"web_authn_credential" "jsonb",
		"web_authn_aaguid" "uuid"
	);

alter table "auth"."mfa_factors" owner to "supabase_auth_admin";

comment on table "auth"."mfa_factors" is 'auth: stores metadata about factors';

create table if not exists
	"auth"."one_time_tokens" (
		"id" "uuid" not null,
		"user_id" "uuid" not null,
		"token_type" "auth"."one_time_token_type" not null,
		"token_hash" "text" not null,
		"relates_to" "text" not null,
		"created_at" timestamp without time zone default "now" () not null,
		"updated_at" timestamp without time zone default "now" () not null,
		constraint "one_time_tokens_token_hash_check" check (("char_length" ("token_hash") > 0))
	);

alter table "auth"."one_time_tokens" owner to "supabase_auth_admin";

create table if not exists
	"auth"."refresh_tokens" (
		"instance_id" "uuid",
		"id" bigint not null,
		"token" character varying(255),
		"user_id" character varying(255),
		"revoked" boolean,
		"created_at" timestamp with time zone,
		"updated_at" timestamp with time zone,
		"parent" character varying(255),
		"session_id" "uuid"
	);

alter table "auth"."refresh_tokens" owner to "supabase_auth_admin";

comment on table "auth"."refresh_tokens" is 'Auth: Store of tokens used to refresh JWT tokens once they expire.';

create sequence if not exists "auth"."refresh_tokens_id_seq" start
with
	1 increment by 1 no minvalue no maxvalue cache 1;

alter table "auth"."refresh_tokens_id_seq" owner to "supabase_auth_admin";

alter sequence "auth"."refresh_tokens_id_seq" owned by "auth"."refresh_tokens"."id";

create table if not exists
	"auth"."saml_providers" (
		"id" "uuid" not null,
		"sso_provider_id" "uuid" not null,
		"entity_id" "text" not null,
		"metadata_xml" "text" not null,
		"metadata_url" "text",
		"attribute_mapping" "jsonb",
		"created_at" timestamp with time zone,
		"updated_at" timestamp with time zone,
		"name_id_format" "text",
		constraint "entity_id not empty" check (("char_length" ("entity_id") > 0)),
		constraint "metadata_url not empty" check (
			(
				("metadata_url" = null::"text")
				or ("char_length" ("metadata_url") > 0)
			)
		),
		constraint "metadata_xml not empty" check (("char_length" ("metadata_xml") > 0))
	);

alter table "auth"."saml_providers" owner to "supabase_auth_admin";

comment on table "auth"."saml_providers" is 'Auth: Manages SAML Identity Provider connections.';

create table if not exists
	"auth"."saml_relay_states" (
		"id" "uuid" not null,
		"sso_provider_id" "uuid" not null,
		"request_id" "text" not null,
		"for_email" "text",
		"redirect_to" "text",
		"created_at" timestamp with time zone,
		"updated_at" timestamp with time zone,
		"flow_state_id" "uuid",
		constraint "request_id not empty" check (("char_length" ("request_id") > 0))
	);

alter table "auth"."saml_relay_states" owner to "supabase_auth_admin";

comment on table "auth"."saml_relay_states" is 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';

create table if not exists
	"auth"."schema_migrations" ("version" character varying(255) not null);

alter table "auth"."schema_migrations" owner to "supabase_auth_admin";

comment on table "auth"."schema_migrations" is 'Auth: Manages updates to the auth system.';

create table if not exists
	"auth"."sessions" (
		"id" "uuid" not null,
		"user_id" "uuid" not null,
		"created_at" timestamp with time zone,
		"updated_at" timestamp with time zone,
		"factor_id" "uuid",
		"aal" "auth"."aal_level",
		"not_after" timestamp with time zone,
		"refreshed_at" timestamp without time zone,
		"user_agent" "text",
		"ip" "inet",
		"tag" "text"
	);

alter table "auth"."sessions" owner to "supabase_auth_admin";

comment on table "auth"."sessions" is 'Auth: Stores session data associated to a user.';

comment on column "auth"."sessions"."not_after" is 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';

create table if not exists
	"auth"."sso_domains" (
		"id" "uuid" not null,
		"sso_provider_id" "uuid" not null,
		"domain" "text" not null,
		"created_at" timestamp with time zone,
		"updated_at" timestamp with time zone,
		constraint "domain not empty" check (("char_length" ("domain") > 0))
	);

alter table "auth"."sso_domains" owner to "supabase_auth_admin";

comment on table "auth"."sso_domains" is 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';

create table if not exists
	"auth"."sso_providers" (
		"id" "uuid" not null,
		"resource_id" "text",
		"created_at" timestamp with time zone,
		"updated_at" timestamp with time zone,
		constraint "resource_id not empty" check (
			(
				("resource_id" = null::"text")
				or ("char_length" ("resource_id") > 0)
			)
		)
	);

alter table "auth"."sso_providers" owner to "supabase_auth_admin";

comment on table "auth"."sso_providers" is 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';

comment on column "auth"."sso_providers"."resource_id" is 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';

create table if not exists
	"auth"."users" (
		"instance_id" "uuid",
		"id" "uuid" not null,
		"aud" character varying(255),
		"role" character varying(255),
		"email" character varying(255),
		"encrypted_password" character varying(255),
		"email_confirmed_at" timestamp with time zone,
		"invited_at" timestamp with time zone,
		"confirmation_token" character varying(255),
		"confirmation_sent_at" timestamp with time zone,
		"recovery_token" character varying(255),
		"recovery_sent_at" timestamp with time zone,
		"email_change_token_new" character varying(255),
		"email_change" character varying(255),
		"email_change_sent_at" timestamp with time zone,
		"last_sign_in_at" timestamp with time zone,
		"raw_app_meta_data" "jsonb",
		"raw_user_meta_data" "jsonb",
		"is_super_admin" boolean,
		"created_at" timestamp with time zone,
		"updated_at" timestamp with time zone,
		"phone" "text" default null::character varying,
		"phone_confirmed_at" timestamp with time zone,
		"phone_change" "text" default ''::character varying,
		"phone_change_token" character varying(255) default ''::character varying,
		"phone_change_sent_at" timestamp with time zone,
		"confirmed_at" timestamp with time zone generated always as (least("email_confirmed_at", "phone_confirmed_at")) stored,
		"email_change_token_current" character varying(255) default ''::character varying,
		"email_change_confirm_status" smallint default 0,
		"banned_until" timestamp with time zone,
		"reauthentication_token" character varying(255) default ''::character varying,
		"reauthentication_sent_at" timestamp with time zone,
		"is_sso_user" boolean default false not null,
		"deleted_at" timestamp with time zone,
		"is_anonymous" boolean default false not null,
		constraint "users_email_change_confirm_status_check" check (
			(
				("email_change_confirm_status" >= 0)
				and ("email_change_confirm_status" <= 2)
			)
		)
	);

alter table "auth"."users" owner to "supabase_auth_admin";

comment on table "auth"."users" is 'Auth: Stores user login data within a secure schema.';

comment on column "auth"."users"."is_sso_user" is 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';

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
	"a"."action_type" as "most_recent_action_type"
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
		"added_by" "uuid" default "auth"."uid" (),
		"lang" character varying not null,
		"created_at" timestamp with time zone default "now" ()
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
		"archived" boolean default false not null
	);

alter table "public"."user_deck" owner to "postgres";

comment on table "public"."user_deck" is 'A set of cards in one language which user intends to learn @graphql({"name": "UserDeck"})';

comment on column "public"."user_deck"."uid" is 'The owner user''s ID';

comment on column "public"."user_deck"."lang" is 'The 3-letter code for the language (iso-369-3)';

comment on column "public"."user_deck"."created_at" is 'the moment the deck was created';

comment on column "public"."user_deck"."learning_goal" is 'why are you learning this language?';

comment on column "public"."user_deck"."archived" is 'is the deck archived or active';

create or replace view
	"public"."language_plus" as
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

alter table "public"."language_plus" owner to "postgres";

create table if not exists
	"public"."phrase_relation" (
		"from_phrase_id" "uuid",
		"to_phrase_id" "uuid",
		"id" "uuid" default "extensions"."uuid_generate_v4" () not null,
		"added_by" "uuid" default "auth"."uid" ()
	);

alter table "public"."phrase_relation" owner to "postgres";

comment on column "public"."phrase_relation"."added_by" is 'User who added this association';

create or replace view
	"public"."phrase_plus" as
select
	"p"."text",
	"p"."id",
	"p"."added_by",
	"p"."lang",
	"p"."created_at",
	array (
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

alter table "public"."phrase_plus" owner to "postgres";

create table if not exists
	"public"."phrase_translation" (
		"text" "text" not null,
		"literal" "text",
		"id" "uuid" default "extensions"."uuid_generate_v4" () not null,
		"phrase_id" "uuid" not null,
		"added_by" "uuid" default "auth"."uid" (),
		"lang" character varying not null
	);

alter table "public"."phrase_translation" owner to "postgres";

comment on table "public"."phrase_translation" is 'A translation of one phrase into another language';

comment on column "public"."phrase_translation"."added_by" is 'User who added this translation';

comment on column "public"."phrase_translation"."lang" is 'The 3-letter code for the language (iso-369-3)';

create table if not exists
	"public"."user_profile" (
		"uid" "uuid" default "auth"."uid" () not null,
		"username" "text",
		"avatar_url" "text",
		"updated_at" timestamp with time zone,
		"created_at" timestamp with time zone default "now" () not null,
		"languages_spoken" character varying[] default '{}'::character varying[] not null,
		"language_primary" "text" default 'EN'::"text" not null,
		constraint "username_length" check (("char_length" ("username") >= 3))
	);

alter table "public"."user_profile" owner to "postgres";

comment on column "public"."user_profile"."uid" is 'Primary key (same as auth.users.id and uid())';

create or replace view
	"public"."public_profile" as
select
	"user_profile"."uid",
	"user_profile"."username",
	"user_profile"."avatar_url"
from
	"public"."user_profile";

alter table "public"."public_profile" owner to "postgres";

create table if not exists
	"public"."user_card" (
		"uid" "uuid" default "auth"."uid" () not null,
		"id" "uuid" default "extensions"."uuid_generate_v4" () not null,
		"phrase_id" "uuid" not null,
		"user_deck_id" "uuid" not null,
		"updated_at" timestamp with time zone default "now" (),
		"created_at" timestamp with time zone default "now" (),
		"status" "public"."card_status" default 'active'::"public"."card_status"
	);

alter table "public"."user_card" owner to "postgres";

comment on table "public"."user_card" is 'Which card is in which deck, and its status';

comment on column "public"."user_card"."uid" is 'The owner user''s ID';

comment on column "public"."user_card"."user_deck_id" is 'Foreign key to the user_deck item to which this card belongs';

create or replace view
	"public"."user_card_plus"
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
	"card"."updated_at",
	"review"."created_at" as "last_reviewed_at",
	"review"."difficulty",
	"review"."stability",
	current_timestamp as "current_timestamp",
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
	) as "retrievability_now"
from
	(
		(
			"public"."user_card" "card"
			join "public"."user_deck" "deck" on (("deck"."id" = "card"."user_deck_id"))
		)
		left join (
			select
				"rev"."id",
				"rev"."uid",
				"rev"."user_card_id",
				"rev"."score",
				"rev"."difficulty",
				"rev"."stability",
				"rev"."review_time_retrievability",
				"rev"."created_at",
				"rev"."updated_at",
				"rev"."user_deck_id"
			from
				(
					"public"."user_card_review" "rev"
					left join "public"."user_card_review" "rev2" on (
						(
							("rev"."user_card_id" = "rev2"."user_card_id")
							and ("rev"."created_at" < "rev2"."created_at")
						)
					)
				)
			where
				("rev2"."created_at" is null)
		) "review" on (("card"."id" = "review"."user_card_id"))
	);

alter table "public"."user_card_plus" owner to "postgres";

create or replace view
	"public"."user_deck_plus" as
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

alter table "public"."user_deck_plus" owner to "postgres";

create table if not exists
	"storage"."buckets" (
		"id" "text" not null,
		"name" "text" not null,
		"owner" "uuid",
		"created_at" timestamp with time zone default "now" (),
		"updated_at" timestamp with time zone default "now" (),
		"public" boolean default false,
		"avif_autodetection" boolean default false,
		"file_size_limit" bigint,
		"allowed_mime_types" "text" [],
		"owner_id" "text"
	);

alter table "storage"."buckets" owner to "supabase_storage_admin";

comment on column "storage"."buckets"."owner" is 'Field is deprecated, use owner_id instead';

create table if not exists
	"storage"."migrations" (
		"id" integer not null,
		"name" character varying(100) not null,
		"hash" character varying(40) not null,
		"executed_at" timestamp without time zone default current_timestamp
	);

alter table "storage"."migrations" owner to "supabase_storage_admin";

create table if not exists
	"storage"."objects" (
		"id" "uuid" default "gen_random_uuid" () not null,
		"bucket_id" "text",
		"name" "text",
		"owner" "uuid",
		"created_at" timestamp with time zone default "now" (),
		"updated_at" timestamp with time zone default "now" (),
		"last_accessed_at" timestamp with time zone default "now" (),
		"metadata" "jsonb",
		"path_tokens" "text" [] generated always as ("string_to_array" ("name", '/'::"text")) stored,
		"version" "text",
		"owner_id" "text",
		"user_metadata" "jsonb",
		"level" integer
	);

alter table "storage"."objects" owner to "supabase_storage_admin";

comment on column "storage"."objects"."owner" is 'Field is deprecated, use owner_id instead';

create table if not exists
	"storage"."prefixes" (
		"bucket_id" "text" not null,
		"name" "text" not null collate "pg_catalog"."C",
		"level" integer generated always as ("storage"."get_level" ("name")) stored not null,
		"created_at" timestamp with time zone default "now" (),
		"updated_at" timestamp with time zone default "now" ()
	);

alter table "storage"."prefixes" owner to "supabase_storage_admin";

create table if not exists
	"storage"."s3_multipart_uploads" (
		"id" "text" not null,
		"in_progress_size" bigint default 0 not null,
		"upload_signature" "text" not null,
		"bucket_id" "text" not null,
		"key" "text" not null collate "pg_catalog"."C",
		"version" "text" not null,
		"owner_id" "text",
		"created_at" timestamp with time zone default "now" () not null,
		"user_metadata" "jsonb"
	);

alter table "storage"."s3_multipart_uploads" owner to "supabase_storage_admin";

create table if not exists
	"storage"."s3_multipart_uploads_parts" (
		"id" "uuid" default "gen_random_uuid" () not null,
		"upload_id" "text" not null,
		"size" bigint default 0 not null,
		"part_number" integer not null,
		"bucket_id" "text" not null,
		"key" "text" not null collate "pg_catalog"."C",
		"etag" "text" not null,
		"owner_id" "text",
		"version" "text" not null,
		"created_at" timestamp with time zone default "now" () not null
	);

alter table "storage"."s3_multipart_uploads_parts" owner to "supabase_storage_admin";

alter table only "auth"."refresh_tokens"
alter column "id"
set default "nextval" ('"auth"."refresh_tokens_id_seq"'::"regclass");

alter table only "auth"."mfa_amr_claims"
add constraint "amr_id_pk" primary key ("id");

alter table only "auth"."audit_log_entries"
add constraint "audit_log_entries_pkey" primary key ("id");

alter table only "auth"."flow_state"
add constraint "flow_state_pkey" primary key ("id");

alter table only "auth"."identities"
add constraint "identities_pkey" primary key ("id");

alter table only "auth"."identities"
add constraint "identities_provider_id_provider_unique" unique ("provider_id", "provider");

alter table only "auth"."instances"
add constraint "instances_pkey" primary key ("id");

alter table only "auth"."mfa_amr_claims"
add constraint "mfa_amr_claims_session_id_authentication_method_pkey" unique ("session_id", "authentication_method");

alter table only "auth"."mfa_challenges"
add constraint "mfa_challenges_pkey" primary key ("id");

alter table only "auth"."mfa_factors"
add constraint "mfa_factors_last_challenged_at_key" unique ("last_challenged_at");

alter table only "auth"."mfa_factors"
add constraint "mfa_factors_pkey" primary key ("id");

alter table only "auth"."one_time_tokens"
add constraint "one_time_tokens_pkey" primary key ("id");

alter table only "auth"."refresh_tokens"
add constraint "refresh_tokens_pkey" primary key ("id");

alter table only "auth"."refresh_tokens"
add constraint "refresh_tokens_token_unique" unique ("token");

alter table only "auth"."saml_providers"
add constraint "saml_providers_entity_id_key" unique ("entity_id");

alter table only "auth"."saml_providers"
add constraint "saml_providers_pkey" primary key ("id");

alter table only "auth"."saml_relay_states"
add constraint "saml_relay_states_pkey" primary key ("id");

alter table only "auth"."schema_migrations"
add constraint "schema_migrations_pkey" primary key ("version");

alter table only "auth"."sessions"
add constraint "sessions_pkey" primary key ("id");

alter table only "auth"."sso_domains"
add constraint "sso_domains_pkey" primary key ("id");

alter table only "auth"."sso_providers"
add constraint "sso_providers_pkey" primary key ("id");

alter table only "auth"."users"
add constraint "users_phone_key" unique ("phone");

alter table only "auth"."users"
add constraint "users_pkey" primary key ("id");

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

alter table only "public"."user_card_review"
add constraint "user_card_review_pkey" primary key ("id");

alter table only "public"."user_card"
add constraint "user_deck_card_membership_pkey" primary key ("id");

alter table only "public"."user_card"
add constraint "user_deck_card_membership_uuid_key" unique ("id");

alter table only "public"."user_deck"
add constraint "user_deck_pkey" primary key ("id");

alter table only "public"."user_deck"
add constraint "user_deck_uuid_key" unique ("id");

alter table only "storage"."buckets"
add constraint "buckets_pkey" primary key ("id");

alter table only "storage"."migrations"
add constraint "migrations_name_key" unique ("name");

alter table only "storage"."migrations"
add constraint "migrations_pkey" primary key ("id");

alter table only "storage"."objects"
add constraint "objects_pkey" primary key ("id");

alter table only "storage"."prefixes"
add constraint "prefixes_pkey" primary key ("bucket_id", "level", "name");

alter table only "storage"."s3_multipart_uploads_parts"
add constraint "s3_multipart_uploads_parts_pkey" primary key ("id");

alter table only "storage"."s3_multipart_uploads"
add constraint "s3_multipart_uploads_pkey" primary key ("id");

create index "audit_logs_instance_id_idx" on "auth"."audit_log_entries" using "btree" ("instance_id");

create unique index "confirmation_token_idx" on "auth"."users" using "btree" ("confirmation_token")
where
	(("confirmation_token")::"text" !~ '^[0-9 ]*$'::"text");

create unique index "email_change_token_current_idx" on "auth"."users" using "btree" ("email_change_token_current")
where
	(("email_change_token_current")::"text" !~ '^[0-9 ]*$'::"text");

create unique index "email_change_token_new_idx" on "auth"."users" using "btree" ("email_change_token_new")
where
	(("email_change_token_new")::"text" !~ '^[0-9 ]*$'::"text");

create index "factor_id_created_at_idx" on "auth"."mfa_factors" using "btree" ("user_id", "created_at");

create index "flow_state_created_at_idx" on "auth"."flow_state" using "btree" ("created_at" desc);

create index "identities_email_idx" on "auth"."identities" using "btree" ("email" "text_pattern_ops");

comment on index "auth"."identities_email_idx" is 'Auth: Ensures indexed queries on the email column';

create index "identities_user_id_idx" on "auth"."identities" using "btree" ("user_id");

create index "idx_auth_code" on "auth"."flow_state" using "btree" ("auth_code");

create index "idx_user_id_auth_method" on "auth"."flow_state" using "btree" ("user_id", "authentication_method");

create index "mfa_challenge_created_at_idx" on "auth"."mfa_challenges" using "btree" ("created_at" desc);

create unique index "mfa_factors_user_friendly_name_unique" on "auth"."mfa_factors" using "btree" ("friendly_name", "user_id")
where
	(
		trim(
			both
			from
				"friendly_name"
		) <> ''::"text"
	);

create index "mfa_factors_user_id_idx" on "auth"."mfa_factors" using "btree" ("user_id");

create index "one_time_tokens_relates_to_hash_idx" on "auth"."one_time_tokens" using "hash" ("relates_to");

create index "one_time_tokens_token_hash_hash_idx" on "auth"."one_time_tokens" using "hash" ("token_hash");

create unique index "one_time_tokens_user_id_token_type_key" on "auth"."one_time_tokens" using "btree" ("user_id", "token_type");

create unique index "reauthentication_token_idx" on "auth"."users" using "btree" ("reauthentication_token")
where
	(("reauthentication_token")::"text" !~ '^[0-9 ]*$'::"text");

create unique index "recovery_token_idx" on "auth"."users" using "btree" ("recovery_token")
where
	(("recovery_token")::"text" !~ '^[0-9 ]*$'::"text");

create index "refresh_tokens_instance_id_idx" on "auth"."refresh_tokens" using "btree" ("instance_id");

create index "refresh_tokens_instance_id_user_id_idx" on "auth"."refresh_tokens" using "btree" ("instance_id", "user_id");

create index "refresh_tokens_parent_idx" on "auth"."refresh_tokens" using "btree" ("parent");

create index "refresh_tokens_session_id_revoked_idx" on "auth"."refresh_tokens" using "btree" ("session_id", "revoked");

create index "refresh_tokens_updated_at_idx" on "auth"."refresh_tokens" using "btree" ("updated_at" desc);

create index "saml_providers_sso_provider_id_idx" on "auth"."saml_providers" using "btree" ("sso_provider_id");

create index "saml_relay_states_created_at_idx" on "auth"."saml_relay_states" using "btree" ("created_at" desc);

create index "saml_relay_states_for_email_idx" on "auth"."saml_relay_states" using "btree" ("for_email");

create index "saml_relay_states_sso_provider_id_idx" on "auth"."saml_relay_states" using "btree" ("sso_provider_id");

create index "sessions_not_after_idx" on "auth"."sessions" using "btree" ("not_after" desc);

create index "sessions_user_id_idx" on "auth"."sessions" using "btree" ("user_id");

create unique index "sso_domains_domain_idx" on "auth"."sso_domains" using "btree" ("lower" ("domain"));

create index "sso_domains_sso_provider_id_idx" on "auth"."sso_domains" using "btree" ("sso_provider_id");

create unique index "sso_providers_resource_id_idx" on "auth"."sso_providers" using "btree" ("lower" ("resource_id"));

create unique index "unique_phone_factor_per_user" on "auth"."mfa_factors" using "btree" ("user_id", "phone");

create index "user_id_created_at_idx" on "auth"."sessions" using "btree" ("user_id", "created_at");

create unique index "users_email_partial_key" on "auth"."users" using "btree" ("email")
where
	("is_sso_user" = false);

comment on index "auth"."users_email_partial_key" is 'Auth: A partial unique index that applies only when is_sso_user is false';

create index "users_instance_id_email_idx" on "auth"."users" using "btree" ("instance_id", "lower" (("email")::"text"));

create index "users_instance_id_idx" on "auth"."users" using "btree" ("instance_id");

create index "users_is_anonymous_idx" on "auth"."users" using "btree" ("is_anonymous");

create unique index "uid_card" on "public"."user_card" using "btree" ("uid", "phrase_id");

create unique index "uid_deck" on "public"."user_deck" using "btree" ("uid", "lang");

create unique index "unique_text_phrase_lang" on "public"."phrase_translation" using "btree" ("text", "lang", "phrase_id");

create unique index "bname" on "storage"."buckets" using "btree" ("name");

create unique index "bucketid_objname" on "storage"."objects" using "btree" ("bucket_id", "name");

create index "idx_multipart_uploads_list" on "storage"."s3_multipart_uploads" using "btree" ("bucket_id", "key", "created_at");

create unique index "idx_name_bucket_level_unique" on "storage"."objects" using "btree" ("name" collate "C", "bucket_id", "level");

create index "idx_objects_bucket_id_name" on "storage"."objects" using "btree" ("bucket_id", "name" collate "C");

create index "idx_objects_lower_name" on "storage"."objects" using "btree" (
	("path_tokens" ["level"]),
	"lower" ("name") "text_pattern_ops",
	"bucket_id",
	"level"
);

create index "idx_prefixes_lower_name" on "storage"."prefixes" using "btree" (
	"bucket_id",
	"level",
	(("string_to_array" ("name", '/'::"text")) ["level"]),
	"lower" ("name") "text_pattern_ops"
);

create index "name_prefix_search" on "storage"."objects" using "btree" ("name" "text_pattern_ops");

create unique index "objects_bucket_id_level_idx" on "storage"."objects" using "btree" ("bucket_id", "level", "name" collate "C");

create or replace view
	"public"."user_deck_plus" as
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
			"public"."user_card_review" "r"
		where
			("r"."user_deck_id" = "d"."id")
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
				("r"."user_deck_id" = "d"."id")
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
				("r"."user_deck_id" = "d"."id")
				and ("r"."created_at" > ("now" () - '7 days'::interval))
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
			"public"."user_card_review" "r"
		where
			(
				("r"."user_deck_id" = "d"."id")
				and ("r"."created_at" > ("now" () - '7 days'::interval))
			)
		limit
			1
	) desc nulls last,
	"d"."created_at" desc;

create
or replace trigger "objects_delete_delete_prefix"
after delete on "storage"."objects" for each row
execute function "storage"."delete_prefix_hierarchy_trigger" ();

create
or replace trigger "objects_insert_create_prefix" before insert on "storage"."objects" for each row
execute function "storage"."objects_insert_prefix_trigger" ();

create
or replace trigger "objects_update_create_prefix" before
update on "storage"."objects" for each row when (
	(
		("new"."name" <> "old"."name")
		or ("new"."bucket_id" <> "old"."bucket_id")
	)
)
execute function "storage"."objects_update_prefix_trigger" ();

create
or replace trigger "prefixes_create_hierarchy" before insert on "storage"."prefixes" for each row when (("pg_trigger_depth" () < 1))
execute function "storage"."prefixes_insert_trigger" ();

create
or replace trigger "prefixes_delete_hierarchy"
after delete on "storage"."prefixes" for each row
execute function "storage"."delete_prefix_hierarchy_trigger" ();

create
or replace trigger "update_objects_updated_at" before
update on "storage"."objects" for each row
execute function "storage"."update_updated_at_column" ();

alter table only "auth"."identities"
add constraint "identities_user_id_fkey" foreign key ("user_id") references "auth"."users" ("id") on delete cascade;

alter table only "auth"."mfa_amr_claims"
add constraint "mfa_amr_claims_session_id_fkey" foreign key ("session_id") references "auth"."sessions" ("id") on delete cascade;

alter table only "auth"."mfa_challenges"
add constraint "mfa_challenges_auth_factor_id_fkey" foreign key ("factor_id") references "auth"."mfa_factors" ("id") on delete cascade;

alter table only "auth"."mfa_factors"
add constraint "mfa_factors_user_id_fkey" foreign key ("user_id") references "auth"."users" ("id") on delete cascade;

alter table only "auth"."one_time_tokens"
add constraint "one_time_tokens_user_id_fkey" foreign key ("user_id") references "auth"."users" ("id") on delete cascade;

alter table only "auth"."refresh_tokens"
add constraint "refresh_tokens_session_id_fkey" foreign key ("session_id") references "auth"."sessions" ("id") on delete cascade;

alter table only "auth"."saml_providers"
add constraint "saml_providers_sso_provider_id_fkey" foreign key ("sso_provider_id") references "auth"."sso_providers" ("id") on delete cascade;

alter table only "auth"."saml_relay_states"
add constraint "saml_relay_states_flow_state_id_fkey" foreign key ("flow_state_id") references "auth"."flow_state" ("id") on delete cascade;

alter table only "auth"."saml_relay_states"
add constraint "saml_relay_states_sso_provider_id_fkey" foreign key ("sso_provider_id") references "auth"."sso_providers" ("id") on delete cascade;

alter table only "auth"."sessions"
add constraint "sessions_user_id_fkey" foreign key ("user_id") references "auth"."users" ("id") on delete cascade;

alter table only "auth"."sso_domains"
add constraint "sso_domains_sso_provider_id_fkey" foreign key ("sso_provider_id") references "auth"."sso_providers" ("id") on delete cascade;

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

alter table only "public"."phrase_relation"
add constraint "phrase_see_also_added_by_fkey" foreign key ("added_by") references "public"."user_profile" ("uid") on delete set null;

alter table only "public"."phrase_relation"
add constraint "phrase_see_also_from_phrase_id_fkey" foreign key ("from_phrase_id") references "public"."phrase" ("id");

alter table only "public"."phrase_relation"
add constraint "phrase_see_also_to_phrase_id_fkey" foreign key ("to_phrase_id") references "public"."phrase" ("id");

alter table only "public"."phrase_translation"
add constraint "phrase_translation_added_by_fkey" foreign key ("added_by") references "public"."user_profile" ("uid") on delete set null;

alter table only "public"."phrase_translation"
add constraint "phrase_translation_lang_fkey" foreign key ("lang") references "public"."language" ("lang");

alter table only "public"."phrase_translation"
add constraint "phrase_translation_phrase_id_fkey" foreign key ("phrase_id") references "public"."phrase" ("id") on delete cascade;

alter table only "public"."user_card"
add constraint "user_card_phrase_id_fkey" foreign key ("phrase_id") references "public"."phrase" ("id") on delete cascade;

alter table only "public"."user_card_review"
add constraint "user_card_review_uid_fkey" foreign key ("uid") references "public"."user_profile" ("uid") on update cascade on delete cascade;

alter table only "public"."user_card_review"
add constraint "user_card_review_user_card_id_fkey" foreign key ("user_card_id") references "public"."user_card" ("id") on update cascade on delete set null;

alter table only "public"."user_card_review"
add constraint "user_card_review_user_deck_id_fkey" foreign key ("user_deck_id") references "public"."user_deck" ("id") on update cascade on delete set null;

alter table only "public"."user_card"
add constraint "user_card_uid_fkey" foreign key ("uid") references "public"."user_profile" ("uid") on update cascade on delete cascade;

alter table only "public"."user_card"
add constraint "user_card_user_deck_id_fkey" foreign key ("user_deck_id") references "public"."user_deck" ("id") on delete cascade;

alter table only "public"."user_deck"
add constraint "user_deck_lang_fkey" foreign key ("lang") references "public"."language" ("lang");

alter table only "public"."user_deck"
add constraint "user_deck_uid_fkey" foreign key ("uid") references "public"."user_profile" ("uid") on update cascade on delete cascade;

alter table only "storage"."objects"
add constraint "objects_bucketId_fkey" foreign key ("bucket_id") references "storage"."buckets" ("id");

alter table only "storage"."prefixes"
add constraint "prefixes_bucketId_fkey" foreign key ("bucket_id") references "storage"."buckets" ("id");

alter table only "storage"."s3_multipart_uploads"
add constraint "s3_multipart_uploads_bucket_id_fkey" foreign key ("bucket_id") references "storage"."buckets" ("id");

alter table only "storage"."s3_multipart_uploads_parts"
add constraint "s3_multipart_uploads_parts_bucket_id_fkey" foreign key ("bucket_id") references "storage"."buckets" ("id");

alter table only "storage"."s3_multipart_uploads_parts"
add constraint "s3_multipart_uploads_parts_upload_id_fkey" foreign key ("upload_id") references "storage"."s3_multipart_uploads" ("id") on delete cascade;

alter table "auth"."audit_log_entries" enable row level security;

alter table "auth"."flow_state" enable row level security;

alter table "auth"."identities" enable row level security;

alter table "auth"."instances" enable row level security;

alter table "auth"."mfa_amr_claims" enable row level security;

alter table "auth"."mfa_challenges" enable row level security;

alter table "auth"."mfa_factors" enable row level security;

alter table "auth"."one_time_tokens" enable row level security;

alter table "auth"."refresh_tokens" enable row level security;

alter table "auth"."saml_providers" enable row level security;

alter table "auth"."saml_relay_states" enable row level security;

alter table "auth"."schema_migrations" enable row level security;

alter table "auth"."sessions" enable row level security;

alter table "auth"."sso_domains" enable row level security;

alter table "auth"."sso_providers" enable row level security;

alter table "auth"."users" enable row level security;

create policy "Anyone can add cards" on "public"."phrase" for insert to "authenticated"
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

alter table "public"."friend_request_action" enable row level security;

alter table "public"."language" enable row level security;

alter table "public"."phrase" enable row level security;

alter table "public"."phrase_relation" enable row level security;

alter table "public"."phrase_translation" enable row level security;

alter table "public"."user_card" enable row level security;

alter table "public"."user_card_review" enable row level security;

alter table "public"."user_deck" enable row level security;

alter table "public"."user_profile" enable row level security;

create policy "Allow users to select, insert, update 1oj01fe_0" on "storage"."objects" for insert to "authenticated"
with
	check (("bucket_id" = 'avatars'::"text"));

create policy "Allow users to select, insert, update 1oj01fe_1" on "storage"."objects" for
update to "authenticated" using (("bucket_id" = 'avatars'::"text"));

create policy "Allow users to select, insert, update 1oj01fe_2" on "storage"."objects" for
select
	to "authenticated" using (("bucket_id" = 'avatars'::"text"));

alter table "storage"."buckets" enable row level security;

alter table "storage"."migrations" enable row level security;

alter table "storage"."objects" enable row level security;

alter table "storage"."prefixes" enable row level security;

alter table "storage"."s3_multipart_uploads" enable row level security;

alter table "storage"."s3_multipart_uploads_parts" enable row level security;

grant USAGE on schema "auth" to "anon";

grant USAGE on schema "auth" to "authenticated";

grant USAGE on schema "auth" to "service_role";

grant all on schema "auth" to "supabase_auth_admin";

grant all on schema "auth" to "dashboard_user";

grant all on schema "auth" to "postgres";

revoke USAGE on schema "public"
from
	PUBLIC;

grant USAGE on schema "public" to "anon";

grant USAGE on schema "public" to "authenticated";

grant USAGE on schema "public" to "service_role";

grant all on schema "storage" to "postgres";

grant USAGE on schema "storage" to "anon";

grant USAGE on schema "storage" to "authenticated";

grant USAGE on schema "storage" to "service_role";

grant all on schema "storage" to "supabase_storage_admin";

grant all on schema "storage" to "dashboard_user";

grant all on function "auth"."email" () to "dashboard_user";

grant all on function "auth"."jwt" () to "postgres";

grant all on function "auth"."jwt" () to "dashboard_user";

grant all on function "auth"."role" () to "dashboard_user";

grant all on function "auth"."uid" () to "dashboard_user";

grant all on function "public"."add_phrase_translation_card" (
	"text" "text",
	"lang" "text",
	"translation_text" "text",
	"translation_lang" "text"
) to "anon";

grant all on function "public"."add_phrase_translation_card" (
	"text" "text",
	"lang" "text",
	"translation_text" "text",
	"translation_lang" "text"
) to "authenticated";

grant all on function "public"."add_phrase_translation_card" (
	"text" "text",
	"lang" "text",
	"translation_text" "text",
	"translation_lang" "text"
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

grant all on table "public"."user_card_review" to "anon";

grant all on table "public"."user_card_review" to "authenticated";

grant all on table "public"."user_card_review" to "service_role";

grant all on function "public"."insert_user_card_review" (
	"user_card_id" "uuid",
	"score" integer,
	"desired_retention" numeric
) to "anon";

grant all on function "public"."insert_user_card_review" (
	"user_card_id" "uuid",
	"score" integer,
	"desired_retention" numeric
) to "authenticated";

grant all on function "public"."insert_user_card_review" (
	"user_card_id" "uuid",
	"score" integer,
	"desired_retention" numeric
) to "service_role";

grant all on table "auth"."audit_log_entries" to "dashboard_user";

grant insert,
references,
delete,
trigger,
truncate,
update on table "auth"."audit_log_entries" to "postgres";

grant
select
	on table "auth"."audit_log_entries" to "postgres"
with
grant option;

grant insert,
references,
delete,
trigger,
truncate,
update on table "auth"."flow_state" to "postgres";

grant
select
	on table "auth"."flow_state" to "postgres"
with
grant option;

grant all on table "auth"."flow_state" to "dashboard_user";

grant insert,
references,
delete,
trigger,
truncate,
update on table "auth"."identities" to "postgres";

grant
select
	on table "auth"."identities" to "postgres"
with
grant option;

grant all on table "auth"."identities" to "dashboard_user";

grant all on table "auth"."instances" to "dashboard_user";

grant insert,
references,
delete,
trigger,
truncate,
update on table "auth"."instances" to "postgres";

grant
select
	on table "auth"."instances" to "postgres"
with
grant option;

grant insert,
references,
delete,
trigger,
truncate,
update on table "auth"."mfa_amr_claims" to "postgres";

grant
select
	on table "auth"."mfa_amr_claims" to "postgres"
with
grant option;

grant all on table "auth"."mfa_amr_claims" to "dashboard_user";

grant insert,
references,
delete,
trigger,
truncate,
update on table "auth"."mfa_challenges" to "postgres";

grant
select
	on table "auth"."mfa_challenges" to "postgres"
with
grant option;

grant all on table "auth"."mfa_challenges" to "dashboard_user";

grant insert,
references,
delete,
trigger,
truncate,
update on table "auth"."mfa_factors" to "postgres";

grant
select
	on table "auth"."mfa_factors" to "postgres"
with
grant option;

grant all on table "auth"."mfa_factors" to "dashboard_user";

grant insert,
references,
delete,
trigger,
truncate,
update on table "auth"."one_time_tokens" to "postgres";

grant
select
	on table "auth"."one_time_tokens" to "postgres"
with
grant option;

grant all on table "auth"."one_time_tokens" to "dashboard_user";

grant all on table "auth"."refresh_tokens" to "dashboard_user";

grant insert,
references,
delete,
trigger,
truncate,
update on table "auth"."refresh_tokens" to "postgres";

grant
select
	on table "auth"."refresh_tokens" to "postgres"
with
grant option;

grant all on sequence "auth"."refresh_tokens_id_seq" to "dashboard_user";

grant all on sequence "auth"."refresh_tokens_id_seq" to "postgres";

grant insert,
references,
delete,
trigger,
truncate,
update on table "auth"."saml_providers" to "postgres";

grant
select
	on table "auth"."saml_providers" to "postgres"
with
grant option;

grant all on table "auth"."saml_providers" to "dashboard_user";

grant insert,
references,
delete,
trigger,
truncate,
update on table "auth"."saml_relay_states" to "postgres";

grant
select
	on table "auth"."saml_relay_states" to "postgres"
with
grant option;

grant all on table "auth"."saml_relay_states" to "dashboard_user";

grant all on table "auth"."schema_migrations" to "dashboard_user";

grant insert,
references,
delete,
trigger,
truncate,
update on table "auth"."schema_migrations" to "postgres";

grant
select
	on table "auth"."schema_migrations" to "postgres"
with
grant option;

grant insert,
references,
delete,
trigger,
truncate,
update on table "auth"."sessions" to "postgres";

grant
select
	on table "auth"."sessions" to "postgres"
with
grant option;

grant all on table "auth"."sessions" to "dashboard_user";

grant insert,
references,
delete,
trigger,
truncate,
update on table "auth"."sso_domains" to "postgres";

grant
select
	on table "auth"."sso_domains" to "postgres"
with
grant option;

grant all on table "auth"."sso_domains" to "dashboard_user";

grant insert,
references,
delete,
trigger,
truncate,
update on table "auth"."sso_providers" to "postgres";

grant
select
	on table "auth"."sso_providers" to "postgres"
with
grant option;

grant all on table "auth"."sso_providers" to "dashboard_user";

grant all on table "auth"."users" to "dashboard_user";

grant insert,
references,
delete,
trigger,
truncate,
update on table "auth"."users" to "postgres";

grant
select
	on table "auth"."users" to "postgres"
with
grant option;

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

grant all on table "public"."user_deck_plus" to "anon";

grant all on table "public"."user_deck_plus" to "authenticated";

grant all on table "public"."user_deck_plus" to "service_role";

grant all on table "storage"."buckets" to "anon";

grant all on table "storage"."buckets" to "authenticated";

grant all on table "storage"."buckets" to "service_role";

grant all on table "storage"."buckets" to "postgres";

grant all on table "storage"."migrations" to "anon";

grant all on table "storage"."migrations" to "authenticated";

grant all on table "storage"."migrations" to "service_role";

grant all on table "storage"."migrations" to "postgres";

grant all on table "storage"."objects" to "anon";

grant all on table "storage"."objects" to "authenticated";

grant all on table "storage"."objects" to "service_role";

grant all on table "storage"."objects" to "postgres";

grant all on table "storage"."prefixes" to "service_role";

grant all on table "storage"."prefixes" to "authenticated";

grant all on table "storage"."prefixes" to "anon";

grant all on table "storage"."s3_multipart_uploads" to "service_role";

grant
select
	on table "storage"."s3_multipart_uploads" to "authenticated";

grant
select
	on table "storage"."s3_multipart_uploads" to "anon";

grant all on table "storage"."s3_multipart_uploads" to "postgres";

grant all on table "storage"."s3_multipart_uploads_parts" to "service_role";

grant
select
	on table "storage"."s3_multipart_uploads_parts" to "authenticated";

grant
select
	on table "storage"."s3_multipart_uploads_parts" to "anon";

grant all on table "storage"."s3_multipart_uploads_parts" to "postgres";

alter default privileges for role "supabase_auth_admin" in schema "auth"
grant all on sequences to "postgres";

alter default privileges for role "supabase_auth_admin" in schema "auth"
grant all on sequences to "dashboard_user";

alter default privileges for role "supabase_auth_admin" in schema "auth"
grant all on functions to "postgres";

alter default privileges for role "supabase_auth_admin" in schema "auth"
grant all on functions to "dashboard_user";

alter default privileges for role "supabase_auth_admin" in schema "auth"
grant all on tables to "postgres";

alter default privileges for role "supabase_auth_admin" in schema "auth"
grant all on tables to "dashboard_user";

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

alter default privileges for role "postgres" in schema "storage"
grant all on sequences to "postgres";

alter default privileges for role "postgres" in schema "storage"
grant all on sequences to "anon";

alter default privileges for role "postgres" in schema "storage"
grant all on sequences to "authenticated";

alter default privileges for role "postgres" in schema "storage"
grant all on sequences to "service_role";

alter default privileges for role "postgres" in schema "storage"
grant all on functions to "postgres";

alter default privileges for role "postgres" in schema "storage"
grant all on functions to "anon";

alter default privileges for role "postgres" in schema "storage"
grant all on functions to "authenticated";

alter default privileges for role "postgres" in schema "storage"
grant all on functions to "service_role";

alter default privileges for role "postgres" in schema "storage"
grant all on tables to "postgres";

alter default privileges for role "postgres" in schema "storage"
grant all on tables to "anon";

alter default privileges for role "postgres" in schema "storage"
grant all on tables to "authenticated";

alter default privileges for role "postgres" in schema "storage"
grant all on tables to "service_role";

reset all;