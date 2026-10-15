CREATE OR REPLACE FUNCTION public.trigger_refresh_meta_language()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
  PERFORM refresh_meta_language();
  RETURN NULL;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."trigger_refresh_meta_language"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."trigger_refresh_meta_language"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."trigger_refresh_meta_language"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."trigger_refresh_meta_language"() TO "postgres";
