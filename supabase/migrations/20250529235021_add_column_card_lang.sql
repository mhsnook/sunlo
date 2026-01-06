alter table "public"."user_card"
add column "lang" character varying;

update "public"."user_card" c
set
	lang = p.lang
from
	"public"."phrase" p
where
	c.phrase_id = p.id;

alter table "public"."user_card"
add constraint "user_card_lang_fkey" foreign key (lang) references language (lang) on update cascade on delete cascade not valid;

alter table "public"."user_card" validate constraint "user_card_lang_fkey";

drop view public.user_card_plus;

create or replace view public.user_card_plus
with
	(security_invoker = true) as
select
	card.lang,
	card.id,
	card.uid,
	card.status,
	card.phrase_id,
	card.created_at,
	card.updated_at,
	review.created_at as last_reviewed_at,
	review.difficulty,
	review.stability,
	current_timestamp as "current_timestamp",
	fsrs_retrievability (
		extract(
			epoch
			from
				current_timestamp - review.created_at
		) / 3600::numeric / 24::numeric,
		review.stability
	) as retrievability_now
from
	user_card card
	left join (
		select
			rev.id,
			rev.uid,
			rev.user_card_id,
			rev.score,
			rev.difficulty,
			rev.stability,
			rev.review_time_retrievability,
			rev.created_at,
			rev.updated_at
		from
			user_card_review rev
			left join user_card_review rev2 on rev.user_card_id = rev2.user_card_id
			and rev.created_at < rev2.created_at
		where
			rev2.created_at is null
	) review on card.id = review.user_card_id;

drop function "public"."add_phrase_translation_card";

create or replace function "public"."add_phrase_translation_card" (
	"phrase_text" "text",
	"phrase_lang" "text",
	"translation_text" "text",
	"translation_lang" "text",
	"phrase_text_script" "text" default null::"text",
	"translation_text_script" "text" default null::"text"
) returns "uuid" language "plpgsql" as $$
DECLARE
    new_phrase_id uuid;

BEGIN
    -- Insert a new phrase and get the id
    INSERT INTO public.phrase (text, lang, text_script)
    VALUES (phrase_text, phrase_lang, phrase_text_script)
    RETURNING id INTO new_phrase_id;

    -- Insert the translation for the new phrase
    INSERT INTO public.phrase_translation (phrase_id, text, lang, text_script)
    VALUES (new_phrase_id, translation_text, translation_lang, translation_text_script);

    -- Insert a new user card for the authenticated user
    INSERT INTO public.user_card (phrase_id, status, lang)
    VALUES (new_phrase_id, 'active', phrase_lang);

    RETURN new_phrase_id;
END;
$$;
