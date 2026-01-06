alter table "public"."user_card"
drop constraint "ensure_phrases_unique_within_deck";

alter table "public"."user_card"
drop constraint "user_card_user_deck_id_fkey";

alter table "public"."user_card_review"
drop constraint "user_card_review_user_card_id_fkey";

alter table "public"."user_card_review"
drop constraint "user_card_review_user_deck_id_fkey";

drop view if exists "public"."phrase_plus";

drop view if exists "public"."meta_phrase_info";

drop view if exists "public"."user_card_plus";

drop view if exists "public"."user_deck_plus";

drop index if exists "public"."ensure_phrases_unique_within_deck";

alter table "public"."user_card"
drop column "user_deck_id";

create unique index user_card_uid_phrase_id_key on public.user_card using btree (uid, phrase_id);

alter table "public"."user_card"
add constraint "user_card_uid_phrase_id_key" unique using index "user_card_uid_phrase_id_key";

alter table "public"."user_card_review"
drop column "user_card_id";

alter table "public"."user_card_review"
drop column "user_deck_id";

alter table "public"."user_card_review"
alter column "phrase_id"
set not null;

alter table "public"."user_card"
add constraint "user_card_lang_uid_fkey" foreign key (uid, lang) references user_deck (uid, lang) not valid;

alter table "public"."user_card" validate constraint "user_card_lang_uid_fkey";

alter table "public"."user_card_review"
add constraint "user_card_review_lang_uid_fkey" foreign key (uid, lang) references user_deck (uid, lang) not valid;

alter table "public"."user_card_review" validate constraint "user_card_review_lang_uid_fkey";

alter table "public"."user_card_review"
add constraint "user_card_review_phrase_id_uid_fkey" foreign key (uid, phrase_id) references user_card (uid, phrase_id) not valid;

alter table "public"."user_card_review" validate constraint "user_card_review_phrase_id_uid_fkey";
