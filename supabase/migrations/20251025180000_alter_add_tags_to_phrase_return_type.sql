drop function "public"."add_tags_to_phrase" (
	"p_phrase_id" "uuid",
	"p_lang" character varying,
	"p_tags" "text" []
);

create or replace function "public"."add_tags_to_phrase" (
	"p_phrase_id" "uuid",
	"p_lang" character varying,
	"p_tags" "text" []
) returns "jsonb" language "plpgsql" as $$
DECLARE
    tag_name text;
    v_tag_id uuid;
    new_tag_record public.tag;
    new_phrase_tag_record public.phrase_tag;
    created_tags jsonb[] := '{}';
    created_phrase_tags jsonb[] := '{}';
BEGIN
    FOREACH tag_name IN ARRAY p_tags
    LOOP
        -- Upsert tag and get its ID.
        WITH new_tag AS (
            INSERT INTO public.tag (name, lang, added_by)
            VALUES (tag_name, p_lang, auth.uid())
            ON CONFLICT (name, lang) DO NOTHING
            RETURNING *
        )
        SELECT * INTO new_tag_record FROM new_tag; -- Only populated if a new tag was created

        -- If a new tag was created, add it to our array and get its ID.
        IF new_tag_record.id IS NOT NULL THEN
            v_tag_id := new_tag_record.id;
            created_tags := array_append(created_tags, to_jsonb(new_tag_record));
        ELSE
            -- If the insert did nothing (because the tag already existed), select the existing tag's ID.
            SELECT id INTO v_tag_id FROM public.tag WHERE name = tag_name AND lang = p_lang;
        END IF;

        -- Associate tag with phrase
        WITH new_pt AS (
            INSERT INTO public.phrase_tag (phrase_id, tag_id, added_by)
            VALUES (p_phrase_id, v_tag_id, auth.uid())
            ON CONFLICT (phrase_id, tag_id) DO NOTHING
            RETURNING *
        )
        SELECT * INTO new_phrase_tag_record FROM new_pt; -- Only populated if a new association was created

        IF new_phrase_tag_record.phrase_id IS NOT NULL THEN
            created_phrase_tags := array_append(created_phrase_tags, to_jsonb(new_phrase_tag_record));
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'tags', created_tags,
        'phrase_tags', created_phrase_tags
    );
END;
$$;
