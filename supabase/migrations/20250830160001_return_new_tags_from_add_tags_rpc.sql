drop function "public"."add_tags_to_phrase";

create or replace function "public"."add_tags_to_phrase" (
	"p_phrase_id" "uuid",
	"p_lang" character varying,
	"p_tags" "text" []
) returns setof "public"."tag" language "plpgsql" as $$
DECLARE
    tag_name text;
    v_tag_id uuid;
    new_tag_record public.tag;
BEGIN
    FOREACH tag_name IN ARRAY p_tags
    LOOP
        -- Upsert tag and get its ID. If a new tag is created, it will be returned.
        WITH new_tag AS (
            INSERT INTO public.tag (name, lang, added_by)
            VALUES (tag_name, p_lang, auth.uid())
            ON CONFLICT (name, lang) DO NOTHING
            RETURNING *
        )
        SELECT * INTO new_tag_record FROM new_tag;

        -- If a new tag was created, add it to our return set and get its ID.
        IF new_tag_record.id IS NOT NULL THEN
            v_tag_id := new_tag_record.id;
            RETURN NEXT new_tag_record;
        ELSE
            -- If the insert did nothing (because the tag already existed), select the existing tag's ID.
            SELECT id INTO v_tag_id FROM public.tag WHERE name = tag_name AND lang = p_lang;
        END IF;

        -- Associate tag with phrase
        INSERT INTO public.phrase_tag (phrase_id, tag_id, added_by)
        VALUES (p_phrase_id, v_tag_id, auth.uid())
        ON CONFLICT (phrase_id, tag_id) DO NOTHING;
    END LOOP;
END;
$$;
