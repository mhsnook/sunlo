CREATE OR REPLACE FUNCTION public.create_playlist_with_links (
  lang             text,
  title            text,
  description      text  DEFAULT NULL::text,
  href             text  DEFAULT NULL::text,
  cover_image_path text  DEFAULT NULL::text,
  phrases          jsonb DEFAULT '[]'::jsonb
)
  RETURNS json
  LANGUAGE plpgsql
  AS $function$
DECLARE
  v_playlist_id uuid;
  v_new_playlist phrase_playlist;
  v_phrase_item jsonb;
  v_link_record playlist_phrase_link;
  v_links playlist_phrase_link[] := '{}';
BEGIN
  -- Insert the playlist
  INSERT INTO phrase_playlist (title, description, href, cover_image_path, lang)
  VALUES (title, description, href, cover_image_path, lang)
  RETURNING * INTO v_new_playlist;

  v_playlist_id := v_new_playlist.id;

  -- Auto-upvote by creator
  INSERT INTO phrase_playlist_upvote (playlist_id, uid)
  VALUES (v_playlist_id, auth.uid())
  ON CONFLICT DO NOTHING;

  -- Re-read to get updated upvote_count after trigger fires
  SELECT * INTO v_new_playlist FROM phrase_playlist WHERE id = v_playlist_id;

  -- Insert phrase links
  IF phrases IS NOT NULL AND jsonb_array_length(phrases) > 0 THEN
    FOR v_phrase_item IN SELECT * FROM jsonb_array_elements(phrases)
    LOOP
      INSERT INTO playlist_phrase_link (
        playlist_id,
        phrase_id,
        href,
        "order"
      ) VALUES (
        v_playlist_id,
        (v_phrase_item->>'phrase_id')::uuid,
        v_phrase_item->>'href',
        (v_phrase_item->>'order')::double precision
      )
      RETURNING * INTO v_link_record;

      v_links := array_append(v_links, v_link_record);
    END LOOP;
  END IF;

  -- Return the playlist and links
  RETURN json_build_object(
    'playlist', row_to_json(v_new_playlist),
    'links', (
      SELECT coalesce(json_agg(l), '[]'::json)
      FROM unnest(v_links) AS l
    )
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."create_playlist_with_links"(text, text, text, text, text, jsonb) TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."create_playlist_with_links"(text, text, text, text, text, jsonb) TO "service_role";

REVOKE ALL ON FUNCTION "public"."create_playlist_with_links"(text, text, text, text, text, jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."create_playlist_with_links"(text, text, text, text, text, jsonb) TO "postgres";
