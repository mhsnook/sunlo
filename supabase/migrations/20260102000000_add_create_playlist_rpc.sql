-- Create RPC function for creating playlists with phrase links
-- Modeled after create_comment_with_phrases
create or replace function public.create_playlist_with_links (
	lang text,
	title text,
	description text default null,
	href text default null,
	phrases jsonb default '[]'::jsonb -- [{phrase_id, href, order}]
) returns json language plpgsql as $$
DECLARE
  v_playlist_id uuid;
  v_new_playlist phrase_playlist;
  v_phrase_item jsonb;
  v_link_record playlist_phrase_link;
  v_links playlist_phrase_link[] := '{}';
BEGIN
  -- Insert the playlist
  INSERT INTO phrase_playlist (title, description, href, lang)
  VALUES (title, description, href, lang)
  RETURNING * INTO v_new_playlist;

  v_playlist_id := v_new_playlist.id;

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
$$;

alter function public.create_playlist_with_links (text, text, text, text, jsonb) owner to postgres;

-- Grant permissions
grant
execute on function public.create_playlist_with_links (text, text, text, text, jsonb) to authenticated;
