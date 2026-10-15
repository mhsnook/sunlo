CREATE OR REPLACE FUNCTION public.update_phrase_request_timestamp()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  NEW.updated_at = now();
  return NEW;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."update_phrase_request_timestamp"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."update_phrase_request_timestamp"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."update_phrase_request_timestamp"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."update_phrase_request_timestamp"() TO "postgres";
