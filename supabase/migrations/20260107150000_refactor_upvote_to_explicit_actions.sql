-- Refactor upvote functions from toggle to explicit add/remove actions
-- This prevents client/server sync issues
-- Drop old toggle functions
drop function if exists public.toggle_phrase_playlist_upvote (uuid);

drop function if exists public.toggle_phrase_request_upvote (uuid);

drop function if exists public.toggle_comment_upvote (uuid);

-- Playlist upvote with explicit action
create or replace function public.set_phrase_playlist_upvote (
	p_playlist_id uuid,
	p_action text -- 'add' or 'remove'
) returns json language plpgsql as $function$
DECLARE
  v_user_uid uuid := auth.uid();
  v_upvote_exists boolean;
  v_actual_action text;
BEGIN
  -- Check if upvote exists
  SELECT EXISTS(
    SELECT 1 FROM phrase_playlist_upvote
    WHERE playlist_id = p_playlist_id AND uid = v_user_uid
  ) INTO v_upvote_exists;

  IF p_action = 'add' THEN
    IF NOT v_upvote_exists THEN
      -- Add upvote
      INSERT INTO phrase_playlist_upvote (playlist_id, uid)
      VALUES (p_playlist_id, v_user_uid);
      v_actual_action := 'added';
    ELSE
      -- Already exists, no change
      v_actual_action := 'no_change';
    END IF;
  ELSIF p_action = 'remove' THEN
    IF v_upvote_exists THEN
      -- Remove upvote
      DELETE FROM phrase_playlist_upvote
      WHERE playlist_id = p_playlist_id AND uid = v_user_uid;
      v_actual_action := 'removed';
    ELSE
      -- Doesn't exist, no change
      v_actual_action := 'no_change';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid action: %. Must be "add" or "remove"', p_action;
  END IF;

  RETURN json_build_object(
    'playlist_id', p_playlist_id,
    'action', v_actual_action
  );
END;
$function$;

-- Request upvote with explicit action
create or replace function public.set_phrase_request_upvote (
	p_request_id uuid,
	p_action text -- 'add' or 'remove'
) returns json language plpgsql as $function$
DECLARE
  v_user_uid uuid := auth.uid();
  v_upvote_exists boolean;
  v_actual_action text;
BEGIN
  -- Check if upvote exists
  SELECT EXISTS(
    SELECT 1 FROM phrase_request_upvote
    WHERE request_id = p_request_id AND uid = v_user_uid
  ) INTO v_upvote_exists;

  IF p_action = 'add' THEN
    IF NOT v_upvote_exists THEN
      -- Add upvote
      INSERT INTO phrase_request_upvote (request_id, uid)
      VALUES (p_request_id, v_user_uid);
      v_actual_action := 'added';
    ELSE
      -- Already exists, no change
      v_actual_action := 'no_change';
    END IF;
  ELSIF p_action = 'remove' THEN
    IF v_upvote_exists THEN
      -- Remove upvote
      DELETE FROM phrase_request_upvote
      WHERE request_id = p_request_id AND uid = v_user_uid;
      v_actual_action := 'removed';
    ELSE
      -- Doesn't exist, no change
      v_actual_action := 'no_change';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid action: %. Must be "add" or "remove"', p_action;
  END IF;

  RETURN json_build_object(
    'request_id', p_request_id,
    'action', v_actual_action
  );
END;
$function$;

-- Comment upvote with explicit action
create or replace function public.set_comment_upvote (
	p_comment_id uuid,
	p_action text -- 'add' or 'remove'
) returns json language plpgsql as $function$
DECLARE
  v_user_uid uuid := auth.uid();
  v_upvote_exists boolean;
  v_actual_action text;
BEGIN
  -- Check if upvote exists
  SELECT EXISTS(
    SELECT 1 FROM comment_upvote
    WHERE comment_id = p_comment_id AND uid = v_user_uid
  ) INTO v_upvote_exists;

  IF p_action = 'add' THEN
    IF NOT v_upvote_exists THEN
      -- Add upvote
      INSERT INTO comment_upvote (comment_id, uid)
      VALUES (p_comment_id, v_user_uid);
      v_actual_action := 'added';
    ELSE
      -- Already exists, no change
      v_actual_action := 'no_change';
    END IF;
  ELSIF p_action = 'remove' THEN
    IF v_upvote_exists THEN
      -- Remove upvote
      DELETE FROM comment_upvote
      WHERE comment_id = p_comment_id AND uid = v_user_uid;
      v_actual_action := 'removed';
    ELSE
      -- Doesn't exist, no change
      v_actual_action := 'no_change';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid action: %. Must be "add" or "remove"', p_action;
  END IF;

  RETURN json_build_object(
    'comment_id', p_comment_id,
    'action', v_actual_action
  );
END;
$function$;

-- Grant execute permissions
grant
execute on function public.set_phrase_playlist_upvote to authenticated;

grant
execute on function public.set_phrase_request_upvote to authenticated;

grant
execute on function public.set_comment_upvote to authenticated;
