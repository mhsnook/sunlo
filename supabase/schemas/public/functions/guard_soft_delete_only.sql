CREATE OR REPLACE FUNCTION public.guard_soft_delete_only()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  if (to_jsonb(old) - 'deleted') is distinct from (to_jsonb(new) - 'deleted') then
    raise exception 'This row is immutable except for its deleted flag';
  end if;
  return new;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."guard_soft_delete_only"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."guard_soft_delete_only"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."guard_soft_delete_only"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."guard_soft_delete_only"() TO "postgres";
