-- Add preferred_translation_lang column to user_deck table
-- NULL means use profile default, explicit value overrides
alter table "public"."user_deck"
add column "preferred_translation_lang" varchar(3) default null;
