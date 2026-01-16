-- Migration: Add only_reverse field to phrase table
-- Feature S: Reverse Reviews
-- This is a phrase-level setting indicating that only reverse reviews
-- (showing translation, recalling phrase) make sense for this phrase
-- e.g., numbers, days of the week - where seeing the target language is obvious
--
-- 1. Add only_reverse column to phrase table
alter table "public"."phrase"
add column if not exists "only_reverse" boolean not null default false;

comment on column "public"."phrase"."only_reverse" is 'When true, this phrase should only be reviewed in reverse direction (translation -> phrase). Useful for phrases like numbers where the target language is obvious but recalling it is the challenge.';

-- 2. Update the input type to include only_reverse
drop type if exists public.phrase_with_translations_input cascade;

drop type if exists public.translation_input cascade;

create type public.translation_input as (lang character(3), text text);

create type public.phrase_with_translations_input as (
	phrase_text text,
	translations public.translation_input[],
	only_reverse boolean
);

-- 3. Recreate the bulk_add_phrases function with only_reverse support
create or replace function "public"."bulk_add_phrases" (
	"p_lang" character,
	"p_phrases" "public"."phrase_with_translations_input" [],
	"p_user_id" "uuid"
) returns "jsonb" language "plpgsql" as $$
declare
    phrase_item public.phrase_with_translations_input;
    new_phrase public.phrase;
    new_translation public.phrase_translation;
    new_phrases public.phrase[] := '{}';
    new_translations public.phrase_translation[] := '{}';
begin
    foreach phrase_item in array p_phrases
    loop
        -- Insert the phrase with only_reverse flag
        insert into public.phrase (lang, text, added_by, only_reverse)
        values (p_lang, phrase_item.phrase_text, p_user_id, coalesce(phrase_item.only_reverse, false))
        returning * into new_phrase;

        new_phrases := array_append(new_phrases, new_phrase);

        -- Insert all translations for the new phrase
        if array_length(phrase_item.translations, 1) > 0 then
            for i in 1..array_length(phrase_item.translations, 1)
            loop
                insert into public.phrase_translation (phrase_id, lang, text)
                values (new_phrase.id, (phrase_item.translations[i]).lang, (phrase_item.translations[i]).text)
                returning * into new_translation;

                new_translations := array_append(new_translations, new_translation);
            end loop;
        end if;

    end loop;
    return jsonb_build_object(
      'phrases', to_jsonb(new_phrases),
      'translations', to_jsonb(new_translations)
    );
end;
$$;

-- 4. Update add_phrase_translation_card RPC to support only_reverse
-- Drop old function signature first to avoid overloaded functions
drop function if exists public.add_phrase_translation_card (text, text, text, text, text, text, boolean);

create or replace function "public"."add_phrase_translation_card" (
	"phrase_text" "text",
	"phrase_lang" "text",
	"translation_text" "text",
	"translation_lang" "text",
	"phrase_text_script" "text" default null::"text",
	"translation_text_script" "text" default null::"text",
	"create_card" boolean default true,
	"phrase_only_reverse" boolean default false
) returns "json" language "plpgsql" as $$
DECLARE
    new_phrase public.phrase;
    new_translation public.phrase_translation;
    new_card public.user_card;

BEGIN
    -- Insert a new phrase with only_reverse flag
    INSERT INTO public.phrase (text, lang, text_script, only_reverse)
    VALUES (phrase_text, phrase_lang, phrase_text_script, phrase_only_reverse)
    RETURNING * INTO new_phrase;

    -- Insert the translation for the new phrase
    INSERT INTO public.phrase_translation (phrase_id, text, lang, text_script)
    VALUES (new_phrase.id, translation_text, translation_lang, translation_text_script)
    RETURNING * INTO new_translation;

    -- Only insert a new user card if create_card is true
    IF create_card THEN
        INSERT INTO public.user_card (phrase_id, status, lang)
        VALUES (new_phrase.id, 'active', phrase_lang)
        RETURNING * INTO new_card;
    END IF;

    RETURN json_build_object('phrase', row_to_json(new_phrase), 'translation', row_to_json(new_translation), 'card', row_to_json(new_card));
END;
$$;
