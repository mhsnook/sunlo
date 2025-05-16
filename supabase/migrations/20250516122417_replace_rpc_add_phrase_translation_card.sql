drop function if exists "public"."add_phrase_translation_card" (
	text text,
	lang text,
	translation_text text,
	translation_lang text
);

set
	check_function_bodies = off;

create
or replace function public.add_phrase_translation_card (
	phrase_text text,
	phrase_lang text,
	translation_text text,
	translation_lang text,
	phrase_text_script text default null::text,
	translation_text_script text default null::text
) returns uuid language plpgsql as $function$
DECLARE
    new_phrase_id uuid;
    user_deck_id uuid;
BEGIN
    -- get the deck ID
    SELECT id into user_deck_id FROM user_deck AS d
    WHERE d.lang = add_phrase_translation_card.lang AND d.uid = auth.uid()
    LIMIT 1;

    -- Insert a new phrase and get the id
    INSERT INTO phrase (text, lang, text_script)
    VALUES (phrase_text, phrase_lang, phrase_text_script)
    RETURNING id INTO new_phrase_id;

    -- Insert the translation for the new phrase
    INSERT INTO phrase_translation (phrase_id, text, lang, text_script)
    VALUES (new_phrase_id, translation_text, translation_lang, translation_text_script);

    -- Insert a new user card for the authenticated user
    INSERT INTO user_card (phrase_id, status, user_deck_id)
    VALUES (new_phrase_id, 'active', user_deck_id);

    RETURN new_phrase_id;
END;
$function$;