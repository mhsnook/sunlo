CREATE OR REPLACE FUNCTION public.trigger_refresh_search_text_index()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
begin
	if exists (
		select 1 from pg_matviews
		where matviewname = 'search_text_index' and ispopulated
	) then
		refresh materialized view concurrently search_text_index;
	else
		refresh materialized view search_text_index;
	end if;
	return null;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."trigger_refresh_search_text_index"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."trigger_refresh_search_text_index"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."trigger_refresh_search_text_index"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."trigger_refresh_search_text_index"() TO "postgres";
