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
alter schema "public" owner to "postgres";

comment on schema "public" is '@graphql({"inflect_names": true})';

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

comment on type "public"."card_status" is 'card status is either active, learned or skipped';

create type "public"."friend_request_response" as enum('accept', 'decline', 'cancel', 'remove', 'invite');

alter type "public"."friend_request_response" owner to "postgres";

create type "public"."learning_goal" as enum('moving', 'family', 'visiting');

alter type "public"."learning_goal" owner to "postgres";

comment on type "public"."learning_goal" is 'why are you learning this language?';

create or replace function "public"."add_phrase_translation_card" (
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

create or replace function "public"."error_example" () returns "void" language "plpgsql" as $$
begin
  -- fails: cannot read from nonexistent table
  select * from table_that_does_not_exist;

  exception
      when others then
          raise exception 'An error occurred in function <function name>: %', sqlerrm;
end;
$$;

alter function "public"."error_example" () owner to "postgres";

create or replace function "public"."fsrs_clamp_d" ("difficulty" numeric) returns numeric language "plpgsql" as $$
BEGIN
    RETURN greatest(least(difficulty, 10.0), 1.0);
END;
$$;

alter function "public"."fsrs_clamp_d" ("difficulty" numeric) owner to "postgres";

create or replace function "public"."fsrs_d_0" ("score" integer) returns numeric language "plpgsql" as $$
DECLARE
    W_4 numeric := 7.1949;
    W_5 numeric := 0.5345;
BEGIN
    RETURN fsrs_clamp_d(
			W_4 - exp(W_5 * (score::numeric - 1.0)) + 1.0
		);
END;
$$;

alter function "public"."fsrs_d_0" ("score" integer) owner to "postgres";

create or replace function "public"."fsrs_delta_d" ("score" integer) returns numeric language "plpgsql" as $$
DECLARE
	W_6 numeric := 1.4604;
BEGIN
    RETURN -W_6 * (score::numeric - 3.0);
END;
$$;

alter function "public"."fsrs_delta_d" ("score" integer) owner to "postgres";

create or replace function "public"."fsrs_delta_d" ("score" numeric) returns numeric language "plpgsql" as $$
DECLARE
	W_6 numeric := 1.4604;
BEGIN
    RETURN -W_6 * (score - 3.0);
END;
$$;

alter function "public"."fsrs_delta_d" ("score" numeric) owner to "postgres";

create or replace function "public"."fsrs_difficulty" ("difficulty" numeric, "score" integer) returns numeric language "plpgsql" as $$
DECLARE
	W_7 numeric := 0.0046;
BEGIN
    RETURN fsrs_clamp_d(W_7 * fsrs_d_0(4) + (1.0 - W_7) * fsrs_dp(difficulty, score));
END;
$$;

alter function "public"."fsrs_difficulty" ("difficulty" numeric, "score" integer) owner to "postgres";

create or replace function "public"."fsrs_difficulty" ("difficulty" numeric, "score" numeric) returns numeric language "plpgsql" as $$
DECLARE
	W_7 numeric := 0.0046;
BEGIN
    RETURN fsrs_clamp_d(W_7 * fsrs_d_0(4) + (1.0 - W_7) * fsrs_dp(difficulty, score));
END;
$$;

alter function "public"."fsrs_difficulty" ("difficulty" numeric, "score" numeric) owner to "postgres";

create or replace function "public"."fsrs_dp" ("difficulty" numeric, "score" integer) returns numeric language "plpgsql" as $$
DECLARE
BEGIN
    RETURN difficulty + fsrs_delta_d(score) * ((10.0 - difficulty) / 9.0);
END;
$$;

alter function "public"."fsrs_dp" ("difficulty" numeric, "score" integer) owner to "postgres";

create or replace function "public"."fsrs_dp" ("difficulty" numeric, "score" numeric) returns numeric language "plpgsql" as $$
DECLARE
BEGIN
    RETURN difficulty + fsrs_delta_d(score) * ((10.0 - difficulty) / 9.0);
END;
$$;

alter function "public"."fsrs_dp" ("difficulty" numeric, "score" numeric) owner to "postgres";

create or replace function "public"."fsrs_interval" ("desired_retrievability" numeric, "stability" numeric) returns numeric language "plpgsql" as $$
DECLARE
    f numeric := 19.0 / 81.0;
    c numeric := -0.5;
BEGIN
    RETURN (stability / f) * ((desired_retrievability ^ (1.0 / c)) - 1.0);
END;
$$;

alter function "public"."fsrs_interval" ("desired_retrievability" numeric, "stability" numeric) owner to "postgres";

create or replace function "public"."fsrs_retrievability" ("time_in_days" numeric, "stability" numeric) returns numeric language "plpgsql" as $$
DECLARE
    f numeric := 19.0 / 81.0;
    c numeric := -0.5;
BEGIN
    RETURN (1.0 + f * (time_in_days / stability)) ^ c;
END;
$$;

alter function "public"."fsrs_retrievability" ("time_in_days" numeric, "stability" numeric) owner to "postgres";

create or replace function "public"."fsrs_s_0" ("score" integer) returns numeric language "plpgsql" as $$
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

alter function "public"."fsrs_s_0" ("score" integer) owner to "postgres";

create or replace function "public"."fsrs_s_0" ("score" numeric) returns numeric language "plpgsql" as $$
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

alter function "public"."fsrs_s_0" ("score" numeric) owner to "postgres";

create or replace function "public"."fsrs_s_fail" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric
) returns numeric language "plpgsql" as $$
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

alter function "public"."fsrs_s_fail" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric
) owner to "postgres";

create or replace function "public"."fsrs_s_success" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" integer
) returns numeric language "plpgsql" as $$
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

alter function "public"."fsrs_s_success" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" integer
) owner to "postgres";

create or replace function "public"."fsrs_stability" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" integer
) returns numeric language "plpgsql" as $$
BEGIN
    IF score = 1 THEN
		RETURN fsrs_s_fail(difficulty, stability, review_time_retrievability);
		ELSE RETURN fsrs_s_success(difficulty, stability, review_time_retrievability, score);
		END IF;
END;
$$;

alter function "public"."fsrs_stability" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" integer
) owner to "postgres";

create or replace function "public"."fsrs_stability" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" numeric
) returns numeric language "plpgsql" as $$
BEGIN
    IF score = 1 THEN
		RETURN fsrs_s_fail(difficulty, stability, review_time_retrievability);
		ELSE RETURN fsrs_s_success(difficulty, stability, review_time_retrievability, score);
		END IF;
END;
$$;

alter function "public"."fsrs_stability" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" numeric
) owner to "postgres";

create or replace function "public"."record_review_and_schedule" (
	"user_card_id" "uuid",
	"review_time_retrievability" numeric,
	"review_time_score" integer
) returns timestamp without time zone language "plpgsql" as $$
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

alter function "public"."record_review_and_schedule" (
	"user_card_id" "uuid",
	"review_time_retrievability" numeric,
	"review_time_score" integer
) owner to "postgres";

set
	default_tablespace = '';

set
	default_table_access_method = "heap";

create table if not exists "public"."friend_request_action" (
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

alter table "public"."friend_summary" owner to "postgres";

create table if not exists "public"."language" (
	"name" "text" not null,
	"lang" character varying not null,
	"alias_of" character varying
);

alter table "public"."language" owner to "postgres";

comment on table "public"."language" is 'The languages that people are trying to learn';

create table if not exists "public"."phrase" (
	"text" "text" not null,
	"id" "uuid" default "extensions"."uuid_generate_v4" () not null,
	"added_by" "uuid" default "auth"."uid" (),
	"lang" character varying not null,
	"created_at" timestamp with time zone default "now" ()
);

alter table "public"."phrase" owner to "postgres";

comment on column "public"."phrase"."added_by" is 'User who added this card';

comment on column "public"."phrase"."lang" is 'The 3-letter code for the language (iso-369-3)';

create table if not exists "public"."user_deck" (
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

alter table "public"."language_plus" owner to "postgres";

create table if not exists "public"."phrase_relation" (
	"from_phrase_id" "uuid",
	"to_phrase_id" "uuid",
	"id" "uuid" default "extensions"."uuid_generate_v4" () not null,
	"added_by" "uuid" default "auth"."uid" ()
);

alter table "public"."phrase_relation" owner to "postgres";

comment on column "public"."phrase_relation"."added_by" is 'User who added this association';

create or replace view "public"."phrase_plus" as
select
	"p"."text",
	"p"."id",
	"p"."added_by",
	"p"."lang",
	"p"."created_at",
	array(
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

create table if not exists "public"."phrase_translation" (
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

alter table "public"."user_profile" owner to "postgres";

comment on column "public"."user_profile"."uid" is 'Primary key (same as auth.users.id and uid())';

create or replace view "public"."public_profile" as
select
	"user_profile"."uid",
	"user_profile"."username",
	"user_profile"."avatar_url"
from
	"public"."user_profile";

alter table "public"."public_profile" owner to "postgres";

create table if not exists "public"."user_card" (
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

alter table "public"."user_card_plus" owner to "postgres";

create table if not exists "public"."user_card_scheduled" (
	"id" "uuid" default "gen_random_uuid" () not null,
	"created_at" timestamp with time zone default "now" () not null,
	"scheduled_for" timestamp with time zone default "now" () not null,
	"user_card_id" "uuid" not null,
	"uid" "uuid" default "auth"."uid" () not null,
	"new_difficulty" numeric default '3'::numeric not null,
	"new_stability" numeric,
	"review_time_difficulty" numeric,
	"review_time_stability" numeric,
	"review_time_score" smallint,
	"new_interval_r90" numeric default '1'::numeric not null,
	"review_time_retrievability" numeric,
	"last_user_card_schedule_id" "uuid",
	constraint "user_card_scheduled_interval_r90_check" check (("new_interval_r90" > (0)::numeric)),
	constraint "user_card_scheduled_review_time_score_check" check (("review_time_score" = any (array[1, 2, 3, 4])))
);

alter table "public"."user_card_scheduled" owner to "postgres";

comment on table "public"."user_card_scheduled" is 'A record for each time a user_card is due to be reviewed';

comment on column "public"."user_card_scheduled"."new_interval_r90" is 'days till the predicted interval till the Retrievability will be 0.90';

create or replace view "public"."user_card_pick_new_active"
with
	("security_invoker" = 'true') as
select
	null::"uuid" as "last_user_card_schedule_id",
	"card"."id" as "user_card_id",
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
		and ("card"."status" = 'active'::"public"."card_status")
	)
order by
	("random" ())
limit
	15;

alter table "public"."user_card_pick_new_active" owner to "postgres";

create table if not exists "public"."user_card_review" (
	"id" "uuid" default "gen_random_uuid" () not null,
	"created_at" timestamp with time zone default "now" () not null,
	"uid" "uuid" default "auth"."uid" () not null,
	"score" smallint,
	"updated_at" timestamp with time zone default "now" () not null,
	"phrase_id" "uuid" not null
);

alter table "public"."user_card_review" owner to "postgres";

comment on table "public"."user_card_review" is 'Each time a user reviews a card';

comment on column "public"."user_card_review"."updated_at" is 'Should mirror created_at unless someone updates their card review score mid-session.';

create or replace view "public"."user_card_review_plus"
with
	("security_invoker" = 'true') as
select
	"r"."id",
	"r"."created_at",
	"r"."phrase_id",
	"r"."score",
	"d"."lang"
from
	(
		(
			"public"."user_card_review" "r"
			join "public"."user_card" "c" on (("r"."phrase_id" = "c"."phrase_id"))
		)
		join "public"."user_deck" "d" on (("c"."user_deck_id" = "d"."id"))
	);

alter table "public"."user_card_review_plus" owner to "postgres";

create or replace view "public"."user_card_scheduled_today"
with
	("security_invoker" = 'true') as
select
	"record"."id" as "last_user_card_schedule_id",
	"record"."user_card_id",
	"record"."new_difficulty" as "review_time_difficulty",
	"record"."new_stability" as "review_time_stability",
	"record"."scheduled_for" as "last_scheduled_for",
	"record"."new_interval_r90" as "last_scheduled_interval",
	(
		(
			(
				(
					extract(
						epoch
						from
							current_timestamp
					) - extract(
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
							extract(
								epoch
								from
									current_timestamp
							) - extract(
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
	(
		"public"."user_card_scheduled" "record"
		left join "public"."user_card_scheduled" "future" on (("future"."last_user_card_schedule_id" = "record"."id"))
	)
where
	(
		("future"."id" is null)
		and ("record"."scheduled_for" < current_timestamp)
	);

alter table "public"."user_card_scheduled_today" owner to "postgres";

create or replace view "public"."user_card_review_today"
with
	("security_invoker" = 'true') as
with
	"first" as (
		select
			"user_card_scheduled_today"."last_user_card_schedule_id",
			"user_card_scheduled_today"."user_card_id",
			"user_card_scheduled_today"."review_time_difficulty",
			"user_card_scheduled_today"."review_time_stability",
			"user_card_scheduled_today"."last_scheduled_for",
			"user_card_scheduled_today"."last_scheduled_interval",
			"user_card_scheduled_today"."overdue_days",
			"user_card_scheduled_today"."overdue_percent"
		from
			"public"."user_card_scheduled_today"
		union all
		select
			"user_card_pick_new_active"."last_user_card_schedule_id",
			"user_card_pick_new_active"."user_card_id",
			"user_card_pick_new_active"."review_time_difficulty",
			"user_card_pick_new_active"."review_time_stability",
			"user_card_pick_new_active"."last_scheduled_for",
			"user_card_pick_new_active"."last_scheduled_interval",
			"user_card_pick_new_active"."overdue_days",
			"user_card_pick_new_active"."overdue_percent"
		from
			"public"."user_card_pick_new_active"
	)
select
	"first"."last_user_card_schedule_id",
	"first"."user_card_id",
	"first"."review_time_difficulty",
	"first"."review_time_stability",
	"first"."last_scheduled_for",
	"first"."last_scheduled_interval",
	"first"."overdue_days",
	"first"."overdue_percent",
	"card"."lang",
	"card"."phrase_id"
from
	(
		"first"
		join "public"."user_card_plus" "card" on (("first"."user_card_id" = "card"."id"))
	)
where
	("card"."status" = 'active'::"public"."card_status")
order by
	("random" ());

alter table "public"."user_card_review_today" owner to "postgres";

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

alter table "public"."user_deck_plus" owner to "postgres";

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
			"max" ("c"."updated_at") as "max"
		from
			"public"."user_card_review_plus" "r"
		where
			(("r"."lang")::"text" = ("d"."lang")::"text")
		limit
			1
	) as "most_recent_review_at",
	(
		select
			"count" (*) as "count"
		from
			"public"."user_card_review_plus" "r"
		where
			(
				(("r"."lang")::"text" = ("d"."lang")::"text")
				and ("r"."created_at" > ("now" () - '7 days'::interval))
			)
		limit
			1
	) as "count_reviews_7d",
	(
		select
			"count" (*) as "count"
		from
			"public"."user_card_review_plus" "r"
		where
			(
				(("r"."lang")::"text" = ("d"."lang")::"text")
				and ("r"."created_at" > ("now" () - '7 days'::interval))
				and ("r"."score" > 0)
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
			"max" ("c"."updated_at") as "max"
		from
			"public"."user_card_review_plus" "r"
		where
			(("r"."lang")::"text" = ("d"."lang")::"text")
		limit
			1
	) desc nulls last,
	"d"."created_at" desc;

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
add constraint "user_card_review_phrase_id_fkey" foreign key ("phrase_id") references "public"."phrase" ("id") on update cascade on delete set null;

alter table only "public"."user_card_review"
add constraint "user_card_review_uid_fkey" foreign key ("uid") references "public"."user_profile" ("uid") on update cascade on delete cascade;

alter table only "public"."user_card_scheduled"
add constraint "user_card_scheduled_uid_fkey" foreign key ("uid") references "public"."user_profile" ("uid") on update cascade on delete cascade;

alter table only "public"."user_card_scheduled"
add constraint "user_card_scheduled_user_card_id_fkey" foreign key ("user_card_id") references "public"."user_card" ("id") on update cascade on delete cascade;

alter table only "public"."user_card"
add constraint "user_card_uid_fkey" foreign key ("uid") references "public"."user_profile" ("uid") on update cascade on delete cascade;

alter table only "public"."user_card"
add constraint "user_card_user_deck_id_fkey" foreign key ("user_deck_id") references "public"."user_deck" ("id") on delete cascade;

alter table only "public"."user_deck"
add constraint "user_deck_lang_fkey" foreign key ("lang") references "public"."language" ("lang");

alter table only "public"."user_deck"
add constraint "user_deck_uid_fkey" foreign key ("uid") references "public"."user_profile" ("uid") on update cascade on delete cascade;

create policy "Anyone can add cards" on "public"."phrase" for insert to "authenticated"
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

create policy "Logged in users can add see_also's" on "public"."phrase_relation" for insert to "authenticated"
with
	check (true);

create policy "Logged in users can add translations" on "public"."phrase_translation" for insert to "authenticated"
with
	check (true);

create policy "Only this user can access and update" on "public"."user_card_review" using (("auth"."uid" () = "uid"))
with
	check (("auth"."uid" () = "uid"));

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

alter table "public"."user_card_scheduled" enable row level security;

alter table "public"."user_deck" enable row level security;

alter table "public"."user_profile" enable row level security;

alter publication "supabase_realtime" owner to "postgres";

revoke usage on schema "public"
from
	public;

grant usage on schema "public" to "anon";

grant usage on schema "public" to "authenticated";

grant usage on schema "public" to "service_role";

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

grant all on function "public"."error_example" () to "anon";

grant all on function "public"."error_example" () to "authenticated";

grant all on function "public"."error_example" () to "service_role";

grant all on function "public"."fsrs_clamp_d" ("difficulty" numeric) to "anon";

grant all on function "public"."fsrs_clamp_d" ("difficulty" numeric) to "authenticated";

grant all on function "public"."fsrs_clamp_d" ("difficulty" numeric) to "service_role";

grant all on function "public"."fsrs_d_0" ("score" integer) to "anon";

grant all on function "public"."fsrs_d_0" ("score" integer) to "authenticated";

grant all on function "public"."fsrs_d_0" ("score" integer) to "service_role";

grant all on function "public"."fsrs_delta_d" ("score" integer) to "anon";

grant all on function "public"."fsrs_delta_d" ("score" integer) to "authenticated";

grant all on function "public"."fsrs_delta_d" ("score" integer) to "service_role";

grant all on function "public"."fsrs_delta_d" ("score" numeric) to "anon";

grant all on function "public"."fsrs_delta_d" ("score" numeric) to "authenticated";

grant all on function "public"."fsrs_delta_d" ("score" numeric) to "service_role";

grant all on function "public"."fsrs_difficulty" ("difficulty" numeric, "score" integer) to "anon";

grant all on function "public"."fsrs_difficulty" ("difficulty" numeric, "score" integer) to "authenticated";

grant all on function "public"."fsrs_difficulty" ("difficulty" numeric, "score" integer) to "service_role";

grant all on function "public"."fsrs_difficulty" ("difficulty" numeric, "score" numeric) to "anon";

grant all on function "public"."fsrs_difficulty" ("difficulty" numeric, "score" numeric) to "authenticated";

grant all on function "public"."fsrs_difficulty" ("difficulty" numeric, "score" numeric) to "service_role";

grant all on function "public"."fsrs_dp" ("difficulty" numeric, "score" integer) to "anon";

grant all on function "public"."fsrs_dp" ("difficulty" numeric, "score" integer) to "authenticated";

grant all on function "public"."fsrs_dp" ("difficulty" numeric, "score" integer) to "service_role";

grant all on function "public"."fsrs_dp" ("difficulty" numeric, "score" numeric) to "anon";

grant all on function "public"."fsrs_dp" ("difficulty" numeric, "score" numeric) to "authenticated";

grant all on function "public"."fsrs_dp" ("difficulty" numeric, "score" numeric) to "service_role";

grant all on function "public"."fsrs_interval" ("desired_retrievability" numeric, "stability" numeric) to "anon";

grant all on function "public"."fsrs_interval" ("desired_retrievability" numeric, "stability" numeric) to "authenticated";

grant all on function "public"."fsrs_interval" ("desired_retrievability" numeric, "stability" numeric) to "service_role";

grant all on function "public"."fsrs_retrievability" ("time_in_days" numeric, "stability" numeric) to "anon";

grant all on function "public"."fsrs_retrievability" ("time_in_days" numeric, "stability" numeric) to "authenticated";

grant all on function "public"."fsrs_retrievability" ("time_in_days" numeric, "stability" numeric) to "service_role";

grant all on function "public"."fsrs_s_0" ("score" integer) to "anon";

grant all on function "public"."fsrs_s_0" ("score" integer) to "authenticated";

grant all on function "public"."fsrs_s_0" ("score" integer) to "service_role";

grant all on function "public"."fsrs_s_0" ("score" numeric) to "anon";

grant all on function "public"."fsrs_s_0" ("score" numeric) to "authenticated";

grant all on function "public"."fsrs_s_0" ("score" numeric) to "service_role";

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

grant all on function "public"."fsrs_stability" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" numeric
) to "anon";

grant all on function "public"."fsrs_stability" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" numeric
) to "authenticated";

grant all on function "public"."fsrs_stability" (
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"score" numeric
) to "service_role";

grant all on function "public"."record_review_and_schedule" (
	"user_card_id" "uuid",
	"review_time_retrievability" numeric,
	"review_time_score" integer
) to "anon";

grant all on function "public"."record_review_and_schedule" (
	"user_card_id" "uuid",
	"review_time_retrievability" numeric,
	"review_time_score" integer
) to "authenticated";

grant all on function "public"."record_review_and_schedule" (
	"user_card_id" "uuid",
	"review_time_retrievability" numeric,
	"review_time_score" integer
) to "service_role";

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

grant all on table "public"."user_card_scheduled" to "anon";

grant all on table "public"."user_card_scheduled" to "authenticated";

grant all on table "public"."user_card_scheduled" to "service_role";

grant all on table "public"."user_card_pick_new_active" to "anon";

grant all on table "public"."user_card_pick_new_active" to "authenticated";

grant all on table "public"."user_card_pick_new_active" to "service_role";

grant all on table "public"."user_card_review" to "anon";

grant all on table "public"."user_card_review" to "authenticated";

grant all on table "public"."user_card_review" to "service_role";

grant all on table "public"."user_card_review_plus" to "anon";

grant all on table "public"."user_card_review_plus" to "authenticated";

grant all on table "public"."user_card_review_plus" to "service_role";

grant all on table "public"."user_card_scheduled_today" to "anon";

grant all on table "public"."user_card_scheduled_today" to "authenticated";

grant all on table "public"."user_card_scheduled_today" to "service_role";

grant all on table "public"."user_card_review_today" to "anon";

grant all on table "public"."user_card_review_today" to "authenticated";

grant all on table "public"."user_card_review_today" to "service_role";

grant all on table "public"."user_deck_plus" to "anon";

grant all on table "public"."user_deck_plus" to "authenticated";

grant all on table "public"."user_deck_plus" to "service_role";

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
