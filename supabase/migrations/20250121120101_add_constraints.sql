alter table "public"."user_card_scheduled"
alter column "new_difficulty"
drop default;

alter table "public"."user_card_scheduled"
alter column "new_stability"
set not null;

alter table "public"."user_card_scheduled"
alter column "review_time_score"
set not null;

create unique index uid_card on public.user_card using btree (uid, phrase_id);

create unique index uid_deck on public.user_deck using btree (uid, lang);
