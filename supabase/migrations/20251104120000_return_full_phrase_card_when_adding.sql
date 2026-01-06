drop function "public"."add_phrase_translation_card" (
	"phrase_text" "text",
	"phrase_lang" "text",
	"translation_text" "text",
	"translation_lang" "text",
	"phrase_text_script" "text",
	"translation_text_script" "text"
);

create or replace function "public"."add_phrase_translation_card" (
	"phrase_text" "text",
	"phrase_lang" "text",
	"translation_text" "text",
	"translation_lang" "text",
	"phrase_text_script" "text" default null::"text",
	"translation_text_script" "text" default null::"text"
) returns "json" language "plpgsql" as $$
DECLARE
    new_phrase public.phrase;
    new_translation public.phrase_translation;
    new_card public.user_card;

BEGIN
    -- Insert a new phrase and get the id
    INSERT INTO public.phrase (text, lang, text_script)
    VALUES (phrase_text, phrase_lang, phrase_text_script)
    RETURNING * INTO new_phrase;

    -- Insert the translation for the new phrase
    INSERT INTO public.phrase_translation (phrase_id, text, lang, text_script)
    VALUES (new_phrase.id, translation_text, translation_lang, translation_text_script)
    RETURNING * INTO new_translation;

    -- Insert a new user card for the authenticated user
    INSERT INTO public.user_card (phrase_id, status, lang)
    VALUES (new_phrase.id, 'active', phrase_lang)
    RETURNING * INTO new_card;

    RETURN json_build_object('phrase', row_to_json(new_phrase), 'translation', row_to_json(new_translation), 'card', row_to_json(new_card));
END;
$$;
