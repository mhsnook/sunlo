drop function if exists public.bulk_add_phrases;

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
        -- Insert the phrase and get the whole new record.
        insert into public.phrase (lang, text, added_by)
        values (p_lang, phrase_item.phrase_text, p_user_id)
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

drop type if exists public.phrase_with_translations_output;

drop type if exists public.translation_output;
