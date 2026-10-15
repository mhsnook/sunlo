CREATE OR REPLACE FUNCTION public.refresh_meta_language()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'meta_language' AND ispopulated) THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY meta_language;
  ELSE
    REFRESH MATERIALIZED VIEW meta_language;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."refresh_meta_language"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."refresh_meta_language"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."refresh_meta_language"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."refresh_meta_language"() TO "postgres";
