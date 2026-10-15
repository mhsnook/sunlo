CREATE OR REPLACE FUNCTION public.create_orphan_message()
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
declare
  new_id uuid;
begin
  insert into public.message default values returning id into new_id;
  return new_id;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."create_orphan_message"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."create_orphan_message"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."create_orphan_message"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."create_orphan_message"() TO "postgres";
