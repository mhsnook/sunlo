

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


-- CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";








ALTER SCHEMA "public" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS '@graphql({"inflect_names": true})';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."card_status" AS ENUM (
    'active',
    'learned',
    'skipped'
);


ALTER TYPE "public"."card_status" OWNER TO "postgres";


COMMENT ON TYPE "public"."card_status" IS 'card status is either active, learned or skipped';



CREATE TYPE "public"."friend_request_response" AS ENUM (
    'accept',
    'decline',
    'cancel',
    'remove',
    'invite'
);


ALTER TYPE "public"."friend_request_response" OWNER TO "postgres";


CREATE TYPE "public"."learning_goal" AS ENUM (
    'moving',
    'family',
    'visiting'
);


ALTER TYPE "public"."learning_goal" OWNER TO "postgres";


COMMENT ON TYPE "public"."learning_goal" IS 'why are you learning this language?';



CREATE OR REPLACE FUNCTION "public"."add_phrase_translation_card"("text" "text", "lang" "text", "translation_text" "text", "translation_lang" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."add_phrase_translation_card"("text" "text", "lang" "text", "translation_text" "text", "translation_lang" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."error_example"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- fails: cannot read from nonexistent table
  select * from table_that_does_not_exist;

  exception
      when others then
          raise exception 'An error occurred in function <function name>: %', sqlerrm;
end;
$$;


ALTER FUNCTION "public"."error_example"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fsrs_clamp_d"("difficulty" numeric) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN greatest(least(difficulty, 10.0), 1.0);
END;
$$;


ALTER FUNCTION "public"."fsrs_clamp_d"("difficulty" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fsrs_d_0"("score" integer) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    W_4 numeric := 7.1949;
    W_5 numeric := 0.5345;
BEGIN
    RETURN fsrs_clamp_d(
			W_4 - exp(W_5 * (score::numeric - 1.0)) + 1.0
		);
END;
$$;


ALTER FUNCTION "public"."fsrs_d_0"("score" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fsrs_delta_d"("score" integer) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
	W_6 numeric := 1.4604;
BEGIN
    RETURN -W_6 * (score::numeric - 3.0);
END;
$$;


ALTER FUNCTION "public"."fsrs_delta_d"("score" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fsrs_delta_d"("score" numeric) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
	W_6 numeric := 1.4604;
BEGIN
    RETURN -W_6 * (score - 3.0);
END;
$$;


ALTER FUNCTION "public"."fsrs_delta_d"("score" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fsrs_difficulty"("difficulty" numeric, "score" integer) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
	W_7 numeric := 0.0046;
BEGIN
    RETURN fsrs_clamp_d(W_7 * fsrs_d_0(4) + (1.0 - W_7) * fsrs_dp(difficulty, score));
END;
$$;


ALTER FUNCTION "public"."fsrs_difficulty"("difficulty" numeric, "score" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fsrs_difficulty"("difficulty" numeric, "score" numeric) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
	W_7 numeric := 0.0046;
BEGIN
    RETURN fsrs_clamp_d(W_7 * fsrs_d_0(4) + (1.0 - W_7) * fsrs_dp(difficulty, score));
END;
$$;


ALTER FUNCTION "public"."fsrs_difficulty"("difficulty" numeric, "score" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fsrs_dp"("difficulty" numeric, "score" integer) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
BEGIN
    RETURN difficulty + fsrs_delta_d(score) * ((10.0 - difficulty) / 9.0);
END;
$$;


ALTER FUNCTION "public"."fsrs_dp"("difficulty" numeric, "score" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fsrs_dp"("difficulty" numeric, "score" numeric) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
BEGIN
    RETURN difficulty + fsrs_delta_d(score) * ((10.0 - difficulty) / 9.0);
END;
$$;


ALTER FUNCTION "public"."fsrs_dp"("difficulty" numeric, "score" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fsrs_interval"("desired_retrievability" numeric, "stability" numeric) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    f numeric := 19.0 / 81.0;
    c numeric := -0.5;
BEGIN
    RETURN (stability / f) * ((desired_retrievability ^ (1.0 / c)) - 1.0);
END;
$$;


ALTER FUNCTION "public"."fsrs_interval"("desired_retrievability" numeric, "stability" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fsrs_retrievability"("time_in_days" numeric, "stability" numeric) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    f numeric := 19.0 / 81.0;
    c numeric := -0.5;
BEGIN
    RETURN (1.0 + f * (time_in_days / stability)) ^ c;
END;
$$;


ALTER FUNCTION "public"."fsrs_retrievability"("time_in_days" numeric, "stability" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fsrs_s_0"("score" integer) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
	W NUMERIC[] := ARRAY[
		0.40255,
		1.18385,
		3.173,
		15.69105
	];
BEGIN
    RETURN W[score];
END;
$$;


ALTER FUNCTION "public"."fsrs_s_0"("score" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fsrs_s_0"("score" numeric) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
	W NUMERIC[] := ARRAY[
		0.40255,
		1.18385,
		3.173,
		15.69105
	];
BEGIN
    RETURN W[score];
END;
$$;


ALTER FUNCTION "public"."fsrs_s_0"("score" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fsrs_s_fail"("difficulty" numeric, "stability" numeric, "review_time_retrievability" numeric) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
	W_11 numeric := 1.9395;
	W_12 numeric := 0.11;
	W_13 numeric := 0.29605;
	W_14 numeric := 2.2698;
    d_f numeric;
    s_f numeric;
    r_f numeric;
    c_f numeric;
BEGIN
    d_f := difficulty ^ (-W_12);
    s_f := ((stability + 1.0) ^ W_13) - 1.0;
    r_f := exp(W_14 * (1.0 - review_time_retrievability));
    c_f := W_11;
    s_f := d_f * s_f * r_f * c_f;
    RETURN least(s_f, stability);
END;
$$;


ALTER FUNCTION "public"."fsrs_s_fail"("difficulty" numeric, "stability" numeric, "review_time_retrievability" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fsrs_s_success"("difficulty" numeric, "stability" numeric, "review_time_retrievability" numeric, "score" integer) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    W_8 numeric := 1.54575;
	W_9 numeric := 0.1192;
	W_10 numeric := 1.01925;
	W_15 numeric := 0.2315;
	W_16 numeric := 2.9898;
	t_d numeric;
    t_s numeric;
    t_r numeric;
    h numeric;
    b numeric;
    c numeric;
    alpha numeric;
BEGIN
    t_d := 11.0 - difficulty;
    t_s := stability ^ (-W_9);
    t_r := exp(W_10 * (1.0 - review_time_retrievability)) - 1.0;
    IF score = 2 THEN  -- "HARD"
        h := W_15;
    ELSE
        h := 1.0;
    END IF;
    IF score = 4 THEN  -- "EASY"
        b := W_16;
    ELSE
        b := 1.0;
    END IF;
    c := exp(W_8);
    alpha := 1.0 + t_d * t_s * t_r * h * b * c;
    RETURN stability * alpha;
END;
$$;


ALTER FUNCTION "public"."fsrs_s_success"("difficulty" numeric, "stability" numeric, "review_time_retrievability" numeric, "score" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fsrs_stability"("difficulty" numeric, "stability" numeric, "review_time_retrievability" numeric, "score" integer) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF score = 1 THEN
		RETURN fsrs_s_fail(difficulty, stability, review_time_retrievability);
		ELSE RETURN fsrs_s_success(difficulty, stability, review_time_retrievability, score);
		END IF;
END;
$$;


ALTER FUNCTION "public"."fsrs_stability"("difficulty" numeric, "stability" numeric, "review_time_retrievability" numeric, "score" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fsrs_stability"("difficulty" numeric, "stability" numeric, "review_time_retrievability" numeric, "score" numeric) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF score = 1 THEN
		RETURN fsrs_s_fail(difficulty, stability, review_time_retrievability);
		ELSE RETURN fsrs_s_success(difficulty, stability, review_time_retrievability, score);
		END IF;
END;
$$;


ALTER FUNCTION "public"."fsrs_stability"("difficulty" numeric, "stability" numeric, "review_time_retrievability" numeric, "score" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_review_and_schedule"("user_card_id" "uuid", "review_time_retrievability" numeric, "review_time_score" integer) RETURNS timestamp without time zone
    LANGUAGE "plpgsql"
    AS $$
DECLARE
		this_is_the_first_time BOOLEAN;
		desired_retention NUMERIC := 0.9;
    last_user_card_schedule_id UUID; --
		review_time_difficulty NUMERIC; -- 
		review_time_stability NUMERIC; --
		new_difficulty NUMERIC;
		new_stability NUMERIC;
		new_interval_r90 NUMERIC;
		scheduled_for TIMESTAMP;
    
BEGIN
    -- is this the first time or no 
    SELECT NOT EXISTS(
        SELECT 1 FROM public.user_card_scheduled s 
        WHERE s.user_card_id = record_review_and_schedule.user_card_id
    ) INTO this_is_the_first_time;

		raise log 'Is the first time for card? % for "%"', this_is_the_first_time, user_card_id;

		-- get the previous review/scheduling record
    IF this_is_the_first_time
		THEN 
			last_user_card_schedule_id := NULL; 
			review_time_difficulty := NULL;
			review_time_stability := NULL;
		ELSE
			SELECT 
				s.last_user_card_schedule_id, s.new_difficulty, s.new_stability
			INTO 
				last_user_card_schedule_id, review_time_difficulty, review_time_stability 		
			FROM public.user_card_scheduled AS s
			WHERE s.user_card_id = record_review_and_schedule.user_card_id
			ORDER BY s.created_at DESC
			LIMIT 1;
		END IF;

		raise log 'Step 0: fetch previous (difficulty, stability), (%, %)', review_time_difficulty, review_time_stability;

		-- 1. calculate New Stability
		IF this_is_the_first_time
		THEN
			new_stability := fsrs_s_0(review_time_score);
		ELSE
			new_stability := fsrs_stability(
				review_time_difficulty,
    		review_time_stability,
    		review_time_retrievability,
    		review_time_score
			);
		END IF;

		raise log 'Step 1: new stability (%)', new_stability;


		-- 2. update difficulty		
		IF this_is_the_first_time
		THEN
    	new_difficulty := fsrs_d_0(review_time_score);
		ELSE
			new_difficulty := fsrs_difficulty(review_time_difficulty, review_time_score);
		END IF;
		raise log 'Step 2: new difficulty (%)', new_difficulty;


		-- 3. calculate retention interval
		new_interval_r90 := fsrs_interval(desired_retention, new_stability);
		scheduled_for := CURRENT_TIMESTAMP + (new_interval_r90::text || ' days')::interval;
		raise log 'Step 3: new interval, scheduled_for (%, %)', new_interval_r90, scheduled_for;

	
  	-- properties of the scheduling record to create
		INSERT INTO public.user_card_scheduled (
			user_card_id, --
			last_user_card_schedule_id,
			review_time_difficulty,
			review_time_stability,
			review_time_retrievability,
			review_time_score,
			new_difficulty,
			new_stability,
			new_interval_r90,
			scheduled_for
		)
		VALUES (
			user_card_id, --
			last_user_card_schedule_id, --
			review_time_difficulty, --
			review_time_stability, --
			review_time_retrievability, --
			review_time_score, --
			new_difficulty, --
			new_stability,
			new_interval_r90,
			scheduled_for
		);

    RETURN scheduled_for;
END;
$$;


ALTER FUNCTION "public"."record_review_and_schedule"("user_card_id" "uuid", "review_time_retrievability" numeric, "review_time_score" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."friend_request_action" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "uid_by" "uuid" NOT NULL,
    "uid_for" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "action_type" "public"."friend_request_response",
    "uid_less" "uuid",
    "uid_more" "uuid"
);


ALTER TABLE "public"."friend_request_action" OWNER TO "postgres";


COMMENT ON COLUMN "public"."friend_request_action"."uid_less" IS 'The lesser of the two UIDs (to prevent cases where B-A duplicates A-B)';



COMMENT ON COLUMN "public"."friend_request_action"."uid_more" IS 'The greater of the two UIDs (to prevent cases where B-A duplicates A-B)';



CREATE OR REPLACE VIEW "public"."friend_summary" WITH ("security_invoker"='true') AS
 SELECT DISTINCT ON ("a"."uid_less", "a"."uid_more") "a"."uid_less",
    "a"."uid_more",
        CASE
            WHEN ("a"."action_type" = 'accept'::"public"."friend_request_response") THEN 'friends'::"text"
            WHEN ("a"."action_type" = 'invite'::"public"."friend_request_response") THEN 'pending'::"text"
            WHEN ("a"."action_type" = ANY (ARRAY['decline'::"public"."friend_request_response", 'cancel'::"public"."friend_request_response", 'remove'::"public"."friend_request_response"])) THEN 'unconnected'::"text"
            ELSE NULL::"text"
        END AS "status",
    "a"."created_at" AS "most_recent_created_at",
    "a"."uid_by" AS "most_recent_uid_by",
    "a"."uid_for" AS "most_recent_uid_for",
    "a"."action_type" AS "most_recent_action_type"
   FROM "public"."friend_request_action" "a"
  ORDER BY "a"."uid_less", "a"."uid_more", "a"."created_at" DESC;


ALTER TABLE "public"."friend_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."language" (
    "name" "text" NOT NULL,
    "lang" character varying NOT NULL,
    "alias_of" character varying
);


ALTER TABLE "public"."language" OWNER TO "postgres";


COMMENT ON TABLE "public"."language" IS 'The languages that people are trying to learn';



CREATE TABLE IF NOT EXISTS "public"."phrase" (
    "text" "text" NOT NULL,
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "added_by" "uuid" DEFAULT "auth"."uid"(),
    "lang" character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."phrase" OWNER TO "postgres";


COMMENT ON COLUMN "public"."phrase"."added_by" IS 'User who added this card';



COMMENT ON COLUMN "public"."phrase"."lang" IS 'The 3-letter code for the language (iso-369-3)';



CREATE TABLE IF NOT EXISTS "public"."user_deck" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "uid" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "lang" character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "learning_goal" "public"."learning_goal" DEFAULT 'moving'::"public"."learning_goal" NOT NULL,
    "archived" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."user_deck" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_deck" IS 'A set of cards in one language which user intends to learn @graphql({"name": "UserDeck"})';



COMMENT ON COLUMN "public"."user_deck"."uid" IS 'The owner user''s ID';



COMMENT ON COLUMN "public"."user_deck"."lang" IS 'The 3-letter code for the language (iso-369-3)';



COMMENT ON COLUMN "public"."user_deck"."created_at" IS 'the moment the deck was created';



COMMENT ON COLUMN "public"."user_deck"."learning_goal" IS 'why are you learning this language?';



COMMENT ON COLUMN "public"."user_deck"."archived" IS 'is the deck archived or active';



CREATE OR REPLACE VIEW "public"."language_plus" AS
 WITH "first" AS (
         SELECT "l"."lang",
            "l"."name",
            "l"."alias_of",
            ( SELECT "count"(DISTINCT "d"."uid") AS "count"
                   FROM "public"."user_deck" "d"
                  WHERE (("l"."lang")::"text" = ("d"."lang")::"text")) AS "learners",
            ( SELECT "count"(DISTINCT "p"."id") AS "count"
                   FROM "public"."phrase" "p"
                  WHERE (("l"."lang")::"text" = ("p"."lang")::"text")) AS "phrases_to_learn"
           FROM "public"."language" "l"
          GROUP BY "l"."lang", "l"."name", "l"."alias_of"
        ), "second" AS (
         SELECT "first"."lang",
            "first"."name",
            "first"."alias_of",
            "first"."learners",
            "first"."phrases_to_learn",
            ("first"."learners" * "first"."phrases_to_learn") AS "display_score"
           FROM "first"
          ORDER BY ("first"."learners" * "first"."phrases_to_learn") DESC
        )
 SELECT "second"."lang",
    "second"."name",
    "second"."alias_of",
    "second"."learners",
    "second"."phrases_to_learn",
    "rank"() OVER (ORDER BY "second"."display_score" DESC) AS "rank",
    "rank"() OVER (ORDER BY "second"."display_score" DESC, "second"."name") AS "display_order"
   FROM "second";


ALTER TABLE "public"."language_plus" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."phrase_relation" (
    "from_phrase_id" "uuid",
    "to_phrase_id" "uuid",
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "added_by" "uuid" DEFAULT "auth"."uid"()
);


ALTER TABLE "public"."phrase_relation" OWNER TO "postgres";


COMMENT ON COLUMN "public"."phrase_relation"."added_by" IS 'User who added this association';



CREATE OR REPLACE VIEW "public"."phrase_plus" AS
 SELECT "p"."text",
    "p"."id",
    "p"."added_by",
    "p"."lang",
    "p"."created_at",
    ARRAY( SELECT
                CASE
                    WHEN ("r"."to_phrase_id" = "p"."id") THEN "r"."from_phrase_id"
                    ELSE "r"."to_phrase_id"
                END AS "to_phrase_id"
           FROM "public"."phrase_relation" "r"
          WHERE (("p"."id" = "r"."to_phrase_id") OR ("p"."id" = "r"."from_phrase_id"))) AS "relation_pids"
   FROM "public"."phrase" "p";


ALTER TABLE "public"."phrase_plus" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."phrase_translation" (
    "text" "text" NOT NULL,
    "literal" "text",
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "phrase_id" "uuid" NOT NULL,
    "added_by" "uuid" DEFAULT "auth"."uid"(),
    "lang" character varying NOT NULL
);


ALTER TABLE "public"."phrase_translation" OWNER TO "postgres";


COMMENT ON TABLE "public"."phrase_translation" IS 'A translation of one phrase into another language';



COMMENT ON COLUMN "public"."phrase_translation"."added_by" IS 'User who added this translation';



COMMENT ON COLUMN "public"."phrase_translation"."lang" IS 'The 3-letter code for the language (iso-369-3)';



CREATE TABLE IF NOT EXISTS "public"."user_profile" (
    "uid" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "username" "text",
    "avatar_url" "text",
    "updated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "languages_spoken" character varying[] DEFAULT '{}'::character varying[] NOT NULL,
    "language_primary" "text" DEFAULT 'EN'::"text" NOT NULL,
    CONSTRAINT "username_length" CHECK (("char_length"("username") >= 3))
);


ALTER TABLE "public"."user_profile" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_profile"."uid" IS 'Primary key (same as auth.users.id and uid())';



CREATE OR REPLACE VIEW "public"."public_profile" AS
 SELECT "user_profile"."uid",
    "user_profile"."username",
    "user_profile"."avatar_url"
   FROM "public"."user_profile";


ALTER TABLE "public"."public_profile" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_card" (
    "uid" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "phrase_id" "uuid" NOT NULL,
    "user_deck_id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" "public"."card_status" DEFAULT 'active'::"public"."card_status"
);


ALTER TABLE "public"."user_card" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_card" IS 'Which card is in which deck, and its status';



COMMENT ON COLUMN "public"."user_card"."uid" IS 'The owner user''s ID';



COMMENT ON COLUMN "public"."user_card"."user_deck_id" IS 'Foreign key to the user_deck item to which this card belongs';



CREATE OR REPLACE VIEW "public"."user_card_plus" WITH ("security_invoker"='true') AS
 SELECT "deck"."lang",
    "card"."id",
    "card"."uid",
    "card"."status",
    "card"."phrase_id",
    "card"."user_deck_id",
    "card"."created_at",
    "card"."updated_at"
   FROM ("public"."user_card" "card"
     JOIN "public"."user_deck" "deck" ON (("deck"."id" = "card"."user_deck_id")));


ALTER TABLE "public"."user_card_plus" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_card_scheduled" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scheduled_for" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_card_id" "uuid" NOT NULL,
    "uid" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "new_difficulty" numeric DEFAULT '3'::numeric NOT NULL,
    "new_stability" numeric,
    "review_time_difficulty" numeric,
    "review_time_stability" numeric,
    "review_time_score" smallint,
    "new_interval_r90" numeric DEFAULT '1'::numeric NOT NULL,
    "review_time_retrievability" numeric,
    "last_user_card_schedule_id" "uuid",
    CONSTRAINT "user_card_scheduled_interval_r90_check" CHECK (("new_interval_r90" > (0)::numeric)),
    CONSTRAINT "user_card_scheduled_review_time_score_check" CHECK (("review_time_score" = ANY (ARRAY[1, 2, 3, 4])))
);


ALTER TABLE "public"."user_card_scheduled" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_card_scheduled" IS 'A record for each time a user_card is due to be reviewed';



COMMENT ON COLUMN "public"."user_card_scheduled"."new_interval_r90" IS 'days till the predicted interval till the Retrievability will be 0.90';



CREATE OR REPLACE VIEW "public"."user_card_pick_new_active" WITH ("security_invoker"='true') AS
 SELECT NULL::"uuid" AS "last_user_card_schedule_id",
    "card"."id" AS "user_card_id",
    NULL::numeric AS "review_time_difficulty",
    NULL::numeric AS "review_time_stability",
    NULL::timestamp with time zone AS "last_scheduled_for",
    NULL::numeric AS "last_scheduled_interval",
    NULL::numeric AS "overdue_days",
    NULL::double precision AS "overdue_percent"
   FROM ("public"."user_card_plus" "card"
     LEFT JOIN "public"."user_card_scheduled" "reviews" ON (("reviews"."user_card_id" = "card"."id")))
  WHERE (("reviews"."id" IS NULL) AND ("card"."status" = 'active'::"public"."card_status"))
  ORDER BY ("random"())
 LIMIT 15;


ALTER TABLE "public"."user_card_pick_new_active" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_card_review" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "uid" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "score" smallint,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "phrase_id" "uuid" NOT NULL
);


ALTER TABLE "public"."user_card_review" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_card_review" IS 'Each time a user reviews a card';



COMMENT ON COLUMN "public"."user_card_review"."updated_at" IS 'Should mirror created_at unless someone updates their card review score mid-session.';



CREATE OR REPLACE VIEW "public"."user_card_review_plus" WITH ("security_invoker"='true') AS
 SELECT "r"."id",
    "r"."created_at",
    "r"."phrase_id",
    "r"."score",
    "d"."lang"
   FROM (("public"."user_card_review" "r"
     JOIN "public"."user_card" "c" ON (("r"."phrase_id" = "c"."phrase_id")))
     JOIN "public"."user_deck" "d" ON (("c"."user_deck_id" = "d"."id")));


ALTER TABLE "public"."user_card_review_plus" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_card_scheduled_today" WITH ("security_invoker"='true') AS
 SELECT "record"."id" AS "last_user_card_schedule_id",
    "record"."user_card_id",
    "record"."new_difficulty" AS "review_time_difficulty",
    "record"."new_stability" AS "review_time_stability",
    "record"."scheduled_for" AS "last_scheduled_for",
    "record"."new_interval_r90" AS "last_scheduled_interval",
    ((((EXTRACT(epoch FROM CURRENT_TIMESTAMP) - EXTRACT(epoch FROM "record"."scheduled_for")) / 60.0) / 60.0) / 24.0) AS "overdue_days",
    ((((((EXTRACT(epoch FROM CURRENT_TIMESTAMP) - EXTRACT(epoch FROM "record"."scheduled_for")))::double precision / (60.0)::double precision) / (60.0)::double precision) / (24.0)::double precision) / ("record"."new_interval_r90")::double precision) AS "overdue_percent"
   FROM ("public"."user_card_scheduled" "record"
     LEFT JOIN "public"."user_card_scheduled" "future" ON (("future"."last_user_card_schedule_id" = "record"."id")))
  WHERE (("future"."id" IS NULL) AND ("record"."scheduled_for" < CURRENT_TIMESTAMP));


ALTER TABLE "public"."user_card_scheduled_today" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_card_review_today" WITH ("security_invoker"='true') AS
 WITH "first" AS (
         SELECT "user_card_scheduled_today"."last_user_card_schedule_id",
            "user_card_scheduled_today"."user_card_id",
            "user_card_scheduled_today"."review_time_difficulty",
            "user_card_scheduled_today"."review_time_stability",
            "user_card_scheduled_today"."last_scheduled_for",
            "user_card_scheduled_today"."last_scheduled_interval",
            "user_card_scheduled_today"."overdue_days",
            "user_card_scheduled_today"."overdue_percent"
           FROM "public"."user_card_scheduled_today"
        UNION ALL
         SELECT "user_card_pick_new_active"."last_user_card_schedule_id",
            "user_card_pick_new_active"."user_card_id",
            "user_card_pick_new_active"."review_time_difficulty",
            "user_card_pick_new_active"."review_time_stability",
            "user_card_pick_new_active"."last_scheduled_for",
            "user_card_pick_new_active"."last_scheduled_interval",
            "user_card_pick_new_active"."overdue_days",
            "user_card_pick_new_active"."overdue_percent"
           FROM "public"."user_card_pick_new_active"
        )
 SELECT "first"."last_user_card_schedule_id",
    "first"."user_card_id",
    "first"."review_time_difficulty",
    "first"."review_time_stability",
    "first"."last_scheduled_for",
    "first"."last_scheduled_interval",
    "first"."overdue_days",
    "first"."overdue_percent",
    "card"."lang",
    "card"."phrase_id"
   FROM ("first"
     JOIN "public"."user_card_plus" "card" ON (("first"."user_card_id" = "card"."id")))
  WHERE ("card"."status" = 'active'::"public"."card_status")
  ORDER BY ("random"());


ALTER TABLE "public"."user_card_review_today" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_deck_plus" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::"uuid" AS "uid",
    NULL::character varying AS "lang",
    NULL::"public"."learning_goal" AS "learning_goal",
    NULL::boolean AS "archived",
    NULL::"text" AS "language",
    NULL::timestamp with time zone AS "created_at",
    NULL::bigint AS "cards_learned",
    NULL::bigint AS "cards_active",
    NULL::bigint AS "cards_skipped",
    NULL::bigint AS "lang_total_phrases",
    NULL::timestamp with time zone AS "most_recent_review_at",
    NULL::bigint AS "count_reviews_7d",
    NULL::bigint AS "count_reviews_7d_positive";


ALTER TABLE "public"."user_deck_plus" OWNER TO "postgres";


ALTER TABLE ONLY "public"."phrase"
    ADD CONSTRAINT "card_phrase_id_int_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."phrase"
    ADD CONSTRAINT "card_phrase_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phrase_relation"
    ADD CONSTRAINT "card_see_also_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phrase_relation"
    ADD CONSTRAINT "card_see_also_uuid_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."phrase_translation"
    ADD CONSTRAINT "card_translation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phrase_translation"
    ADD CONSTRAINT "card_translation_uuid_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."user_card"
    ADD CONSTRAINT "ensure_phrases_unique_within_deck" UNIQUE ("user_deck_id", "phrase_id");



ALTER TABLE ONLY "public"."friend_request_action"
    ADD CONSTRAINT "friend_request_action_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."language"
    ADD CONSTRAINT "language_code2_key" UNIQUE ("lang");



ALTER TABLE ONLY "public"."language"
    ADD CONSTRAINT "language_pkey" PRIMARY KEY ("lang");



ALTER TABLE ONLY "public"."user_deck"
    ADD CONSTRAINT "one_deck_per_language_per_user" UNIQUE ("uid", "lang");



ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "profile_old_id_key" UNIQUE ("uid");



ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("uid");



ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."user_card_review"
    ADD CONSTRAINT "user_card_review_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_card_scheduled"
    ADD CONSTRAINT "user_card_scheduled_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_card"
    ADD CONSTRAINT "user_deck_card_membership_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_card"
    ADD CONSTRAINT "user_deck_card_membership_uuid_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."user_deck"
    ADD CONSTRAINT "user_deck_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_deck"
    ADD CONSTRAINT "user_deck_uuid_key" UNIQUE ("id");



CREATE UNIQUE INDEX "unique_text_phrase_lang" ON "public"."phrase_translation" USING "btree" ("text", "lang", "phrase_id");



CREATE OR REPLACE VIEW "public"."user_deck_plus" WITH ("security_invoker"='true') AS
 SELECT "d"."id",
    "d"."uid",
    "d"."lang",
    "d"."learning_goal",
    "d"."archived",
    ( SELECT "l"."name"
           FROM "public"."language" "l"
          WHERE (("l"."lang")::"text" = ("d"."lang")::"text")
         LIMIT 1) AS "language",
    "d"."created_at",
    "count"(*) FILTER (WHERE ("c"."status" = 'learned'::"public"."card_status")) AS "cards_learned",
    "count"(*) FILTER (WHERE ("c"."status" = 'active'::"public"."card_status")) AS "cards_active",
    "count"(*) FILTER (WHERE ("c"."status" = 'skipped'::"public"."card_status")) AS "cards_skipped",
    ( SELECT "count"(*) AS "count"
           FROM "public"."phrase" "p"
          WHERE (("p"."lang")::"text" = ("d"."lang")::"text")) AS "lang_total_phrases",
    ( SELECT "max"("c"."updated_at") AS "max"
           FROM "public"."user_card_review_plus" "r"
          WHERE (("r"."lang")::"text" = ("d"."lang")::"text")
         LIMIT 1) AS "most_recent_review_at",
    ( SELECT "count"(*) AS "count"
           FROM "public"."user_card_review_plus" "r"
          WHERE ((("r"."lang")::"text" = ("d"."lang")::"text") AND ("r"."created_at" > ("now"() - '7 days'::interval)))
         LIMIT 1) AS "count_reviews_7d",
    ( SELECT "count"(*) AS "count"
           FROM "public"."user_card_review_plus" "r"
          WHERE ((("r"."lang")::"text" = ("d"."lang")::"text") AND ("r"."created_at" > ("now"() - '7 days'::interval)) AND ("r"."score" > 0))
         LIMIT 1) AS "count_reviews_7d_positive"
   FROM ("public"."user_deck" "d"
     LEFT JOIN "public"."user_card" "c" ON (("d"."id" = "c"."user_deck_id")))
  GROUP BY "d"."id", "d"."lang", "d"."created_at"
  ORDER BY ( SELECT "max"("c"."updated_at") AS "max"
           FROM "public"."user_card_review_plus" "r"
          WHERE (("r"."lang")::"text" = ("d"."lang")::"text")
         LIMIT 1) DESC NULLS LAST, "d"."created_at" DESC;



ALTER TABLE ONLY "public"."friend_request_action"
    ADD CONSTRAINT "friend_request_action_uid_by_fkey" FOREIGN KEY ("uid_by") REFERENCES "public"."user_profile"("uid") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friend_request_action"
    ADD CONSTRAINT "friend_request_action_uid_for_fkey" FOREIGN KEY ("uid_for") REFERENCES "public"."user_profile"("uid") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friend_request_action"
    ADD CONSTRAINT "friend_request_action_uid_less_fkey" FOREIGN KEY ("uid_less") REFERENCES "public"."user_profile"("uid") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friend_request_action"
    ADD CONSTRAINT "friend_request_action_uid_more_fkey" FOREIGN KEY ("uid_more") REFERENCES "public"."user_profile"("uid") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."phrase"
    ADD CONSTRAINT "phrase_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "public"."user_profile"("uid") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."phrase"
    ADD CONSTRAINT "phrase_lang_fkey" FOREIGN KEY ("lang") REFERENCES "public"."language"("lang");



ALTER TABLE ONLY "public"."phrase_relation"
    ADD CONSTRAINT "phrase_see_also_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "public"."user_profile"("uid") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."phrase_relation"
    ADD CONSTRAINT "phrase_see_also_from_phrase_id_fkey" FOREIGN KEY ("from_phrase_id") REFERENCES "public"."phrase"("id");



ALTER TABLE ONLY "public"."phrase_relation"
    ADD CONSTRAINT "phrase_see_also_to_phrase_id_fkey" FOREIGN KEY ("to_phrase_id") REFERENCES "public"."phrase"("id");



ALTER TABLE ONLY "public"."phrase_translation"
    ADD CONSTRAINT "phrase_translation_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "public"."user_profile"("uid") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."phrase_translation"
    ADD CONSTRAINT "phrase_translation_lang_fkey" FOREIGN KEY ("lang") REFERENCES "public"."language"("lang");



ALTER TABLE ONLY "public"."phrase_translation"
    ADD CONSTRAINT "phrase_translation_phrase_id_fkey" FOREIGN KEY ("phrase_id") REFERENCES "public"."phrase"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_card"
    ADD CONSTRAINT "user_card_phrase_id_fkey" FOREIGN KEY ("phrase_id") REFERENCES "public"."phrase"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_card_review"
    ADD CONSTRAINT "user_card_review_phrase_id_fkey" FOREIGN KEY ("phrase_id") REFERENCES "public"."phrase"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_card_review"
    ADD CONSTRAINT "user_card_review_uid_fkey" FOREIGN KEY ("uid") REFERENCES "public"."user_profile"("uid") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_card_scheduled"
    ADD CONSTRAINT "user_card_scheduled_uid_fkey" FOREIGN KEY ("uid") REFERENCES "public"."user_profile"("uid") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_card_scheduled"
    ADD CONSTRAINT "user_card_scheduled_user_card_id_fkey" FOREIGN KEY ("user_card_id") REFERENCES "public"."user_card"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_card"
    ADD CONSTRAINT "user_card_uid_fkey" FOREIGN KEY ("uid") REFERENCES "public"."user_profile"("uid") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_card"
    ADD CONSTRAINT "user_card_user_deck_id_fkey" FOREIGN KEY ("user_deck_id") REFERENCES "public"."user_deck"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_deck"
    ADD CONSTRAINT "user_deck_lang_fkey" FOREIGN KEY ("lang") REFERENCES "public"."language"("lang");



ALTER TABLE ONLY "public"."user_deck"
    ADD CONSTRAINT "user_deck_uid_fkey" FOREIGN KEY ("uid") REFERENCES "public"."user_profile"("uid") ON UPDATE CASCADE ON DELETE CASCADE;



CREATE POLICY "Anyone can add cards" ON "public"."phrase" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable all actions for users based on uid" ON "public"."user_card_scheduled" TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "uid")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "uid"));



CREATE POLICY "Enable read access for all users" ON "public"."language" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."phrase" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."phrase_relation" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."phrase_translation" FOR SELECT USING (true);



CREATE POLICY "Enable users to view their own data only" ON "public"."friend_request_action" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "uid_by") OR (( SELECT "auth"."uid"() AS "uid") = "uid_for")));



CREATE POLICY "Logged in users can add see_also's" ON "public"."phrase_relation" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Logged in users can add translations" ON "public"."phrase_translation" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Only this user can access and update" ON "public"."user_card_review" USING (("auth"."uid"() = "uid")) WITH CHECK (("auth"."uid"() = "uid"));



CREATE POLICY "Policy with table joins" ON "public"."friend_request_action" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "uid_by") AND (((( SELECT "auth"."uid"() AS "uid") = "uid_less") AND ("uid_for" = "uid_more")) OR ((( SELECT "auth"."uid"() AS "uid") = "uid_more") AND ("uid_for" = "uid_less")))));



CREATE POLICY "User can view and update their own profile" ON "public"."user_profile" TO "authenticated" USING (("uid" = "auth"."uid"())) WITH CHECK (("uid" = "auth"."uid"()));



CREATE POLICY "User data only for this user" ON "public"."user_card" USING (("auth"."uid"() = "uid")) WITH CHECK (("auth"."uid"() = "uid"));



CREATE POLICY "User data only for this user" ON "public"."user_deck" USING (("auth"."uid"() = "uid")) WITH CHECK (("auth"."uid"() = "uid"));



ALTER TABLE "public"."friend_request_action" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."language" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."phrase" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."phrase_relation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."phrase_translation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_card" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_card_review" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_card_scheduled" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_deck" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profile" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





























































































































































































































































































































































































GRANT ALL ON FUNCTION "public"."add_phrase_translation_card"("text" "text", "lang" "text", "translation_text" "text", "translation_lang" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_phrase_translation_card"("text" "text", "lang" "text", "translation_text" "text", "translation_lang" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_phrase_translation_card"("text" "text", "lang" "text", "translation_text" "text", "translation_lang" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."error_example"() TO "anon";
GRANT ALL ON FUNCTION "public"."error_example"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."error_example"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fsrs_clamp_d"("difficulty" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."fsrs_clamp_d"("difficulty" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fsrs_clamp_d"("difficulty" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."fsrs_d_0"("score" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fsrs_d_0"("score" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fsrs_d_0"("score" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fsrs_delta_d"("score" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fsrs_delta_d"("score" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fsrs_delta_d"("score" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fsrs_delta_d"("score" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."fsrs_delta_d"("score" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fsrs_delta_d"("score" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."fsrs_difficulty"("difficulty" numeric, "score" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fsrs_difficulty"("difficulty" numeric, "score" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fsrs_difficulty"("difficulty" numeric, "score" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fsrs_difficulty"("difficulty" numeric, "score" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."fsrs_difficulty"("difficulty" numeric, "score" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fsrs_difficulty"("difficulty" numeric, "score" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."fsrs_dp"("difficulty" numeric, "score" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fsrs_dp"("difficulty" numeric, "score" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fsrs_dp"("difficulty" numeric, "score" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fsrs_dp"("difficulty" numeric, "score" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."fsrs_dp"("difficulty" numeric, "score" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fsrs_dp"("difficulty" numeric, "score" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."fsrs_interval"("desired_retrievability" numeric, "stability" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."fsrs_interval"("desired_retrievability" numeric, "stability" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fsrs_interval"("desired_retrievability" numeric, "stability" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."fsrs_retrievability"("time_in_days" numeric, "stability" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."fsrs_retrievability"("time_in_days" numeric, "stability" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fsrs_retrievability"("time_in_days" numeric, "stability" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."fsrs_s_0"("score" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fsrs_s_0"("score" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fsrs_s_0"("score" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fsrs_s_0"("score" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."fsrs_s_0"("score" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fsrs_s_0"("score" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."fsrs_s_fail"("difficulty" numeric, "stability" numeric, "review_time_retrievability" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."fsrs_s_fail"("difficulty" numeric, "stability" numeric, "review_time_retrievability" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fsrs_s_fail"("difficulty" numeric, "stability" numeric, "review_time_retrievability" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."fsrs_s_success"("difficulty" numeric, "stability" numeric, "review_time_retrievability" numeric, "score" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fsrs_s_success"("difficulty" numeric, "stability" numeric, "review_time_retrievability" numeric, "score" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fsrs_s_success"("difficulty" numeric, "stability" numeric, "review_time_retrievability" numeric, "score" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fsrs_stability"("difficulty" numeric, "stability" numeric, "review_time_retrievability" numeric, "score" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fsrs_stability"("difficulty" numeric, "stability" numeric, "review_time_retrievability" numeric, "score" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fsrs_stability"("difficulty" numeric, "stability" numeric, "review_time_retrievability" numeric, "score" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fsrs_stability"("difficulty" numeric, "stability" numeric, "review_time_retrievability" numeric, "score" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."fsrs_stability"("difficulty" numeric, "stability" numeric, "review_time_retrievability" numeric, "score" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fsrs_stability"("difficulty" numeric, "stability" numeric, "review_time_retrievability" numeric, "score" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."record_review_and_schedule"("user_card_id" "uuid", "review_time_retrievability" numeric, "review_time_score" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."record_review_and_schedule"("user_card_id" "uuid", "review_time_retrievability" numeric, "review_time_score" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_review_and_schedule"("user_card_id" "uuid", "review_time_retrievability" numeric, "review_time_score" integer) TO "service_role";





















GRANT ALL ON TABLE "public"."friend_request_action" TO "anon";
GRANT ALL ON TABLE "public"."friend_request_action" TO "authenticated";
GRANT ALL ON TABLE "public"."friend_request_action" TO "service_role";



GRANT ALL ON TABLE "public"."friend_summary" TO "anon";
GRANT ALL ON TABLE "public"."friend_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."friend_summary" TO "service_role";



GRANT ALL ON TABLE "public"."language" TO "anon";
GRANT ALL ON TABLE "public"."language" TO "authenticated";
GRANT ALL ON TABLE "public"."language" TO "service_role";



GRANT ALL ON TABLE "public"."phrase" TO "anon";
GRANT ALL ON TABLE "public"."phrase" TO "authenticated";
GRANT ALL ON TABLE "public"."phrase" TO "service_role";



GRANT ALL ON TABLE "public"."user_deck" TO "anon";
GRANT ALL ON TABLE "public"."user_deck" TO "authenticated";
GRANT ALL ON TABLE "public"."user_deck" TO "service_role";



GRANT ALL ON TABLE "public"."language_plus" TO "anon";
GRANT ALL ON TABLE "public"."language_plus" TO "authenticated";
GRANT ALL ON TABLE "public"."language_plus" TO "service_role";



GRANT ALL ON TABLE "public"."phrase_relation" TO "anon";
GRANT ALL ON TABLE "public"."phrase_relation" TO "authenticated";
GRANT ALL ON TABLE "public"."phrase_relation" TO "service_role";



GRANT ALL ON TABLE "public"."phrase_plus" TO "anon";
GRANT ALL ON TABLE "public"."phrase_plus" TO "authenticated";
GRANT ALL ON TABLE "public"."phrase_plus" TO "service_role";



GRANT ALL ON TABLE "public"."phrase_translation" TO "anon";
GRANT ALL ON TABLE "public"."phrase_translation" TO "authenticated";
GRANT ALL ON TABLE "public"."phrase_translation" TO "service_role";



GRANT ALL ON TABLE "public"."user_profile" TO "anon";
GRANT ALL ON TABLE "public"."user_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profile" TO "service_role";



GRANT ALL ON TABLE "public"."public_profile" TO "anon";
GRANT ALL ON TABLE "public"."public_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."public_profile" TO "service_role";



GRANT ALL ON TABLE "public"."user_card" TO "anon";
GRANT ALL ON TABLE "public"."user_card" TO "authenticated";
GRANT ALL ON TABLE "public"."user_card" TO "service_role";



GRANT ALL ON TABLE "public"."user_card_plus" TO "anon";
GRANT ALL ON TABLE "public"."user_card_plus" TO "authenticated";
GRANT ALL ON TABLE "public"."user_card_plus" TO "service_role";



GRANT ALL ON TABLE "public"."user_card_scheduled" TO "anon";
GRANT ALL ON TABLE "public"."user_card_scheduled" TO "authenticated";
GRANT ALL ON TABLE "public"."user_card_scheduled" TO "service_role";



GRANT ALL ON TABLE "public"."user_card_pick_new_active" TO "anon";
GRANT ALL ON TABLE "public"."user_card_pick_new_active" TO "authenticated";
GRANT ALL ON TABLE "public"."user_card_pick_new_active" TO "service_role";



GRANT ALL ON TABLE "public"."user_card_review" TO "anon";
GRANT ALL ON TABLE "public"."user_card_review" TO "authenticated";
GRANT ALL ON TABLE "public"."user_card_review" TO "service_role";



GRANT ALL ON TABLE "public"."user_card_review_plus" TO "anon";
GRANT ALL ON TABLE "public"."user_card_review_plus" TO "authenticated";
GRANT ALL ON TABLE "public"."user_card_review_plus" TO "service_role";



GRANT ALL ON TABLE "public"."user_card_scheduled_today" TO "anon";
GRANT ALL ON TABLE "public"."user_card_scheduled_today" TO "authenticated";
GRANT ALL ON TABLE "public"."user_card_scheduled_today" TO "service_role";



GRANT ALL ON TABLE "public"."user_card_review_today" TO "anon";
GRANT ALL ON TABLE "public"."user_card_review_today" TO "authenticated";
GRANT ALL ON TABLE "public"."user_card_review_today" TO "service_role";



GRANT ALL ON TABLE "public"."user_deck_plus" TO "anon";
GRANT ALL ON TABLE "public"."user_deck_plus" TO "authenticated";
GRANT ALL ON TABLE "public"."user_deck_plus" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
