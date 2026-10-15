CREATE OR REPLACE FUNCTION public.auto_upvote_new_request()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  INSERT INTO phrase_request_upvote (request_id, uid)
  VALUES (NEW.id, NEW.requester_uid)
  ON CONFLICT DO NOTHING;
  RETURN NULL;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."auto_upvote_new_request"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."auto_upvote_new_request"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."auto_upvote_new_request"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."auto_upvote_new_request"() TO "postgres";
