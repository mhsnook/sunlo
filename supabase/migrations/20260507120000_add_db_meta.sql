-- Dev-only datestamp metadata for seeding and dump tooling.
--
-- db_meta: lightweight key-value table used by scripts/dump-new-seeds.ts.
--   seed.sql writes seeded_at = now() on every db reset; the dump script uses
--   that value as the baseline for finding rows added since the last reset.
--
-- user_deck.updated_at: tracks when deck settings were last changed.
--   Backfilled to created_at so existing rows don't look like they were all
--   updated "just now" after the migration runs.
create table "public"."db_meta" ("key" text primary key, "value" text not null);

alter table "public"."user_deck"
add column "updated_at" timestamp with time zone default now() not null;

update "public"."user_deck"
set
	"updated_at" = "created_at";

create or replace function "public"."update_user_deck_updated_at" () returns "trigger" language "plpgsql" as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

create trigger update_user_deck_updated_at before
update on "public"."user_deck" for each row
execute function "public"."update_user_deck_updated_at" ();
