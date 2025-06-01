alter table "public"."user_card"
drop constraint "ensure_phrases_unique_within_deck";

alter table "public"."user_card"
drop constraint "user_card_user_deck_id_fkey";

alter table "public"."user_card_review"
drop constraint "user_card_review_user_card_id_fkey";

alter table "public"."user_card_review"
drop constraint "user_card_review_user_deck_id_fkey";

drop function if exists "public"."insert_user_card_review" (
	user_card_id uuid,
	score integer,
	day_session text,
	desired_retention numeric
);

drop view if exists "public"."phrase_plus";

drop view if exists "public"."meta_phrase_info";

drop view if exists "public"."user_card_plus";

drop view if exists "public"."user_deck_plus";

drop index if exists "public"."ensure_phrases_unique_within_deck";

alter table "public"."user_card"
drop column "user_deck_id";

alter table "public"."user_card_review"
drop column "user_card_id";

alter table "public"."user_card_review"
drop column "user_deck_id";

alter table "public"."user_card_review"
alter column "phrase_id"
set not null;

alter table "public"."user_card"
add constraint "user_card_lang_uid_fkey" foreign key (lang, uid) references user_deck (lang, uid) not valid;

alter table "public"."user_card" validate constraint "user_card_lang_uid_fkey";

alter table "public"."user_card_review"
add constraint "user_card_review_lang_uid_fkey" foreign key (lang, uid) references user_deck (lang, uid) not valid;

alter table "public"."user_card_review" validate constraint "user_card_review_lang_uid_fkey";

alter table "public"."user_card_review"
add constraint "user_card_review_phrase_id_uid_fkey" foreign key (phrase_id, uid) references user_card (phrase_id, uid) not valid;

alter table "public"."user_card_review" validate constraint "user_card_review_phrase_id_uid_fkey";