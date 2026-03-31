-- Auto-like: creators automatically upvote their own content
-- Recount function: recount_all_upvotes() for periodic correction
-- ============================================================
-- Auto-like for requests (trigger)
-- ============================================================
create or replace function public.auto_upvote_new_request () returns trigger language plpgsql as $$
BEGIN
  INSERT INTO phrase_request_upvote (request_id, uid)
  VALUES (NEW.id, NEW.requester_uid)
  ON CONFLICT DO NOTHING;
  RETURN NULL;
END;
$$;

create trigger on_phrase_request_auto_upvote
after insert on public.phrase_request for each row
execute function public.auto_upvote_new_request ();

-- ============================================================
-- Auto-like for playlists (update RPC)
-- ============================================================
drop function if exists public.create_playlist_with_links (text, text, text, text, text, jsonb);

create or replace function public.create_playlist_with_links (
	lang text,
	title text,
	description text default null,
	href text default null,
	cover_image_path text default null,
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
$$;

alter function public.create_playlist_with_links (text, text, text, text, text, jsonb) owner to postgres;

grant
execute on function public.create_playlist_with_links (text, text, text, text, text, jsonb) to authenticated;

-- ============================================================
-- Auto-like for comments (update RPC)
-- ============================================================
create or replace function public.create_comment_with_phrases (
	p_request_id uuid,
	p_content text,
	p_parent_comment_id uuid default null::uuid,
	p_phrase_ids uuid[] default array[]::uuid[]
) returns json language plpgsql as $function$
DECLARE
  v_comment_id uuid;
  v_new_comment request_comment;
BEGIN
  -- Validate that either content or phrases are provided
  IF (p_content IS NULL OR trim(p_content) = '') AND (p_phrase_ids IS NULL OR array_length(p_phrase_ids, 1) IS NULL) THEN
    RAISE EXCEPTION 'Comment must have either content or attached phrases';
  END IF;

  -- Insert the comment (works for both top-level and replies)
  INSERT INTO request_comment (request_id, parent_comment_id, content)
  VALUES (p_request_id, p_parent_comment_id, p_content)
  RETURNING * INTO v_new_comment;

  v_comment_id := v_new_comment.id;

  -- Auto-upvote by creator
  INSERT INTO comment_upvote (comment_id, uid)
  VALUES (v_comment_id, auth.uid())
  ON CONFLICT DO NOTHING;

  -- Re-read to get updated upvote_count after trigger fires
  SELECT * INTO v_new_comment FROM request_comment WHERE id = v_comment_id;

  -- Link phrases to comment (max 4)
  IF p_phrase_ids IS NOT NULL AND array_length(p_phrase_ids, 1) > 0 THEN
    IF array_length(p_phrase_ids, 1) > 4 THEN
      RAISE EXCEPTION 'Cannot attach more than 4 phrases to a comment';
    END IF;

    INSERT INTO comment_phrase_link (request_id, comment_id, phrase_id)
    SELECT p_request_id, v_comment_id, unnest(p_phrase_ids);
  END IF;

  -- Return the comment and links
  RETURN json_build_object(
    'request_comment', row_to_json(v_new_comment),
    'comment_phrase_links', (
      SELECT coalesce(json_agg(l), '[]'::json)
      FROM comment_phrase_link l
      WHERE l.comment_id = v_comment_id
    )
  );
END;
$function$;

-- ============================================================
-- One-time backfill: auto-like existing content by its creator
-- ============================================================
-- Requests: each requester upvotes their own request
insert into
	phrase_request_upvote (request_id, uid)
select
	id,
	requester_uid
from
	phrase_request
on conflict do nothing;

-- Playlists: each creator upvotes their own playlist
insert into
	phrase_playlist_upvote (playlist_id, uid)
select
	id,
	uid
from
	phrase_playlist
on conflict do nothing;

-- Comments: each author upvotes their own comment
insert into
	comment_upvote (comment_id, uid)
select
	id,
	uid
from
	request_comment
on conflict do nothing;

-- Recount all upvote_count columns to reflect the backfill
update phrase_request pr
set
	upvote_count = sub.cnt
from
	(
		select
			request_id,
			count(*) as cnt
		from
			phrase_request_upvote
		group by
			request_id
	) sub
where
	pr.id = sub.request_id
	and pr.upvote_count is distinct from sub.cnt;

update phrase_playlist pp
set
	upvote_count = sub.cnt
from
	(
		select
			playlist_id,
			count(*) as cnt
		from
			phrase_playlist_upvote
		group by
			playlist_id
	) sub
where
	pp.id = sub.playlist_id
	and pp.upvote_count is distinct from sub.cnt;

update request_comment rc
set
	upvote_count = sub.cnt
from
	(
		select
			comment_id,
			count(*) as cnt
		from
			comment_upvote
		group by
			comment_id
	) sub
where
	rc.id = sub.comment_id
	and rc.upvote_count is distinct from sub.cnt;

-- ============================================================
-- Recount function + pg_cron daily schedule
-- ============================================================
create or replace function public.recount_all_upvotes () returns void language plpgsql security definer as $$
DECLARE
  v_since timestamptz := now() - interval '2 days';
BEGIN
  -- Only recount items that had upvote activity in the last 2 days.
  -- The "IS DISTINCT FROM" check avoids locking rows already correct.

  -- Recount phrase_request upvotes (only recently active)
  UPDATE phrase_request pr
  SET upvote_count = sub.cnt
  FROM (
    SELECT pru.request_id, count(*) as cnt
    FROM phrase_request_upvote pru
    WHERE pru.request_id IN (
      SELECT DISTINCT request_id FROM phrase_request_upvote
      WHERE created_at >= v_since
    )
    GROUP BY pru.request_id
  ) sub
  WHERE pr.id = sub.request_id
    AND pr.upvote_count IS DISTINCT FROM sub.cnt;

  -- Recount phrase_playlist upvotes (only recently active)
  UPDATE phrase_playlist pp
  SET upvote_count = sub.cnt
  FROM (
    SELECT ppu.playlist_id, count(*) as cnt
    FROM phrase_playlist_upvote ppu
    WHERE ppu.playlist_id IN (
      SELECT DISTINCT playlist_id FROM phrase_playlist_upvote
      WHERE created_at >= v_since
    )
    GROUP BY ppu.playlist_id
  ) sub
  WHERE pp.id = sub.playlist_id
    AND pp.upvote_count IS DISTINCT FROM sub.cnt;

  -- Recount comment upvotes (only recently active)
  UPDATE request_comment rc
  SET upvote_count = sub.cnt
  FROM (
    SELECT cu.comment_id, count(*) as cnt
    FROM comment_upvote cu
    WHERE cu.comment_id IN (
      SELECT DISTINCT comment_id FROM comment_upvote
      WHERE created_at >= v_since
    )
    GROUP BY cu.comment_id
  ) sub
  WHERE rc.id = sub.comment_id
    AND rc.upvote_count IS DISTINCT FROM sub.cnt;
END;
$$;

-- Enable pg_cron extension (available in Supabase)
create extension if not exists pg_cron
with
	schema pg_catalog;

-- Schedule daily recount at 4:00 AM UTC
select
	cron.schedule (
		'recount-all-upvotes',
		'0 4 * * *',
		'select public.recount_all_upvotes()'
	);
