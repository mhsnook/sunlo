alter table "public"."user_card_review"
add column "lang" character varying;

update public.user_card_review r
set
	lang = c.lang
from
	public.user_card c
where
	r.user_card_id = c.id;

alter table "public"."user_card_review"
alter column "lang"
set not null;

alter table "public"."user_card_review"
add column "phrase_id" uuid;

alter table "public"."user_card_review"
add constraint "user_card_review_phrase_id_fkey" foreign key (phrase_id) references phrase (id) on update cascade on delete set null not valid;

update public.user_card_review r
set
	phrase_id = c.phrase_id
from
	public.user_card c
where
	c.id = r.user_card_id;

alter table "public"."user_card_review" validate constraint "user_card_review_phrase_id_fkey";
