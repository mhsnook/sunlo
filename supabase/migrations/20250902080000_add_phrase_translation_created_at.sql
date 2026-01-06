alter table "public"."phrase_translation"
add column "created_at" timestamp with time zone not null default now();
