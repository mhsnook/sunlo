-- Convert meta_language from a regular view to a materialized view.
-- The view aggregates learner and phrase counts across the entire database,
-- running for every client on app load. Language counts change only when
-- users add/remove decks or phrases are added, making materialization appropriate.
-- 1. Helper function to refresh the materialized view
create or replace function "public"."refresh_meta_language" () returns "void" language "plpgsql" security definer as $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'meta_language' AND ispopulated) THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY meta_language;
  ELSE
    REFRESH MATERIALIZED VIEW meta_language;
  END IF;
END;
$$;

alter function "public"."refresh_meta_language" () owner to "postgres";

-- 2. Trigger function called on user_deck and phrase changes
create or replace function "public"."trigger_refresh_meta_language" () returns "trigger" language "plpgsql" security definer as $$
BEGIN
  PERFORM refresh_meta_language();
  RETURN NULL;
END;
$$;

alter function "public"."trigger_refresh_meta_language" () owner to "postgres";

-- 3. Drop the regular view and recreate as a materialized view
drop view "public"."meta_language";

create materialized view "public"."meta_language" as
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
	"second"
with
	data;

alter table "public"."meta_language" owner to "postgres";

-- 4. Unique index required for CONCURRENTLY refresh
create unique index "idx_meta_language_lang" on "public"."meta_language" using "btree" ("lang");

-- 5. Triggers: refresh when learner counts or phrase counts change
create or replace trigger "refresh_meta_language_on_deck_change"
after insert
or delete on "public"."user_deck" for each statement
execute function "public"."trigger_refresh_meta_language" ();

create or replace trigger "refresh_meta_language_on_phrase_change"
after insert
or delete on "public"."phrase" for each statement
execute function "public"."trigger_refresh_meta_language" ();

-- 6. Grants (same as the regular view had)
grant all on function "public"."refresh_meta_language" () to "anon";

grant all on function "public"."refresh_meta_language" () to "authenticated";

grant all on function "public"."refresh_meta_language" () to "service_role";

grant all on function "public"."trigger_refresh_meta_language" () to "anon";

grant all on function "public"."trigger_refresh_meta_language" () to "authenticated";

grant all on function "public"."trigger_refresh_meta_language" () to "service_role";

grant all on table "public"."meta_language" to "anon";

grant all on table "public"."meta_language" to "authenticated";

grant all on table "public"."meta_language" to "service_role";
