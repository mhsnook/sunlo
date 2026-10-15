CREATE OR REPLACE FUNCTION public.notify_on_phrase_reference()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
declare
  v_phrase_owner uuid;
begin
  select added_by into v_phrase_owner from phrase where id = NEW.phrase_id;

  if v_phrase_owner is not null and v_phrase_owner <> NEW.uid then
    insert into notification (uid, type, actor_uid, phrase_id, request_id, comment_id)
    values (v_phrase_owner, 'phrase_referenced', NEW.uid, NEW.phrase_id, NEW.request_id, NEW.comment_id);
  end if;

  return NEW;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."notify_on_phrase_reference"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."notify_on_phrase_reference"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."notify_on_phrase_reference"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."notify_on_phrase_reference"() TO "postgres";
