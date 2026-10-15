CREATE OR REPLACE FUNCTION public.recount_all_upvotes()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  v_since timestamptz := now() - interval '2 days';
BEGIN
  -- Only recount items that had upvote activity in the last 2 days.
  -- The "IS DISTINCT FROM" check avoids locking rows already correct.

  -- Recount phrase_request upvotes (only recently active)
  UPDATE phrase_request pr
  SET upvote_count = sub.cnt
  FROM (
    SELECT pru.request_id, count(*) filter (where pru.deleted = false) as cnt
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
    SELECT ppu.playlist_id, count(*) filter (where ppu.deleted = false) as cnt
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
    SELECT cu.comment_id, count(*) filter (where cu.deleted = false) as cnt
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."recount_all_upvotes"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."recount_all_upvotes"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."recount_all_upvotes"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."recount_all_upvotes"() TO "postgres";
