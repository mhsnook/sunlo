-- Drop old function and types if they exist to avoid conflicts
drop function if exists public.bulk_add_phrases (
	p_lang character(3),
	p_phrases public.phrase_with_translations_input[]
);

drop type if exists public.phrase_with_translations_output;

drop type if exists public.translation_output;

drop type if exists public.phrase_with_translations_input;

drop type if exists public.translation_input;

-- A type for a single translation input
create type public.translation_input as (lang character(3), text text);

-- A type for a phrase with its translations input
create type public.phrase_with_translations_input as (phrase_text text, translations public.translation_input[]);

-- A type for a single translation output, now with an ID
create type public.translation_output as (id uuid, lang character(3), text text);

-- A type for a phrase with its translations output, with IDs
create type public.phrase_with_translations_output as (
	id uuid,
	lang character(3),
	text text,
	translations public.translation_output[]
);

-- The RPC function to bulk-add phrases and translations, now returning the created data
create
or replace function public.bulk_add_phrases (
	p_lang character(3),
	p_phrases public.phrase_with_translations_input[]
) returns setof public.phrase_with_translations_output language plpgsql as $$
declare
    phrase_item public.phrase_with_translations_input;
    translation_item public.translation_input;
    new_phrase_id uuid;
    new_translation_id uuid;
    result public.phrase_with_translations_output;
    translation_outputs public.translation_output[];
begin
    foreach phrase_item in array p_phrases
    loop
        -- Insert the phrase and get its ID.
        insert into public.phrase (lang, text)
        values (p_lang, phrase_item.phrase_text)
        returning id into new_phrase_id;

        -- Reset translations array for this phrase
        translation_outputs := '{}';

        -- Insert all translations for the new phrase
        if array_length(phrase_item.translations, 1) > 0 then
            foreach translation_item in array phrase_item.translations
            loop
                insert into public.phrase_translation (phrase_id, lang, text)
                values (new_phrase_id, translation_item.lang, translation_item.text)
                returning id into new_translation_id;

                -- Add the new translation to our output array
                translation_outputs := array_append(
                    translation_outputs,
                    (new_translation_id, translation_item.lang, translation_item.text)::public.translation_output
                );
            end loop;
        end if;

        -- Construct the result for the current phrase
        result := (
            new_phrase_id,
            p_lang,
            phrase_item.phrase_text,
            translation_outputs
        )::public.phrase_with_translations_output;

        return next result;
    end loop;
end;
$$;