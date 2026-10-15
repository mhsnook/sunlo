CREATE OR REPLACE FUNCTION public.bump_phrase_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
	new.updated_at := clock_timestamp();
	return new;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."bump_phrase_updated_at"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."bump_phrase_updated_at"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."bump_phrase_updated_at"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."bump_phrase_updated_at"() TO "postgres";
