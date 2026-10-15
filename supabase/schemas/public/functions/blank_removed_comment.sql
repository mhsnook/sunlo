CREATE OR REPLACE FUNCTION public.blank_removed_comment()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  new.content = '';
  return new;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."blank_removed_comment"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."blank_removed_comment"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."blank_removed_comment"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."blank_removed_comment"() TO "postgres";
