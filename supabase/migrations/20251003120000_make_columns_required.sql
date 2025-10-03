alter table "public"."phrase" alter column added_by set not null;

alter table "public"."phrase" alter column created_at set not null;

alter table "public"."phrase_relation" alter column added_by set not null;

alter table "public"."phrase_translation" alter column added_by set not null;

alter table "public"."phrase_tag" alter column added_by set not null;