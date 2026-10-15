CREATE OR REPLACE FUNCTION public.create_comment_with_phrases (
  p_request_id        uuid,
  p_content           text,
  p_parent_comment_id uuid   DEFAULT NULL::uuid,
  p_phrase_ids        uuid[] DEFAULT ARRAY[]::uuid[]
)
  RETURNS json
  LANGUAGE plpgsql
  AS $function$
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

GRANT EXECUTE ON FUNCTION "public"."create_comment_with_phrases"(uuid, text, uuid, uuid[]) TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."create_comment_with_phrases"(uuid, text, uuid, uuid[]) TO "service_role";

REVOKE ALL ON FUNCTION "public"."create_comment_with_phrases"(uuid, text, uuid, uuid[]) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."create_comment_with_phrases"(uuid, text, uuid, uuid[]) TO "postgres";
