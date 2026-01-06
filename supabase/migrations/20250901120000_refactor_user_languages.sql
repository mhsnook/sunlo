-- 1. Create the new enum type for language proficiency
create type public.language_proficiency as enum('fluent', 'proficient', 'beginner');

-- 2. Add the new languages_known column to user_profile
alter table public.user_profile
add column languages_known jsonb not null default '[]'::jsonb;

-- 3. Migrate data from old columns to the new one
do $$
DECLARE
    r record;
    lang_obj jsonb;
    lang_array jsonb;
    spoken_lang text;
BEGIN
    FOR r IN SELECT uid, language_primary, languages_spoken FROM public.user_profile
    LOOP
        lang_array := '[]'::jsonb;

        -- Add primary language
        IF r.language_primary IS NOT NULL AND r.language_primary <> '' THEN
            lang_obj := jsonb_build_object('lang', r.language_primary, 'level', 'fluent');
            lang_array := lang_array || lang_obj;
        END IF;

        -- Add other spoken languages
        IF array_length(r.languages_spoken, 1) > 0 THEN
            FOREACH spoken_lang IN ARRAY r.languages_spoken
            LOOP
                -- Only add if it's not the primary language
                IF spoken_lang <> r.language_primary THEN
                    lang_obj := jsonb_build_object('lang', spoken_lang, 'level', 'proficient');
                    lang_array := lang_array || lang_obj;
                END IF;
            END LOOP;
        END IF;

        UPDATE public.user_profile
        SET languages_known = lang_array
        WHERE uid = r.uid;
    END LOOP;
END;
$$;

-- 4. Drop the old columns
alter table public.user_profile
drop column if exists language_primary;

alter table public.user_profile
drop column if exists languages_spoken;
