CREATE OR REPLACE FUNCTION public.cascade_soft_delete_comment()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
begin
  update public.comment_phrase_link
  set deleted = true
  where comment_id = new.id and deleted = false;

  return null;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."cascade_soft_delete_comment"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."cascade_soft_delete_comment"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."cascade_soft_delete_comment"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."cascade_soft_delete_comment"() TO "postgres";
