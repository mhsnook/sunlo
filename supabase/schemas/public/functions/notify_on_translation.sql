CREATE OR REPLACE FUNCTION public.notify_on_translation()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
declare
  v_phrase_owner uuid;
begin
  select added_by into v_phrase_owner from phrase where id = NEW.phrase_id;

  if v_phrase_owner is not null and v_phrase_owner <> NEW.added_by then
    insert into notification (uid, type, actor_uid, phrase_id)
    values (v_phrase_owner, 'phrase_translated', NEW.added_by, NEW.phrase_id);
  end if;

  return NEW;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."notify_on_translation"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."notify_on_translation"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."notify_on_translation"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."notify_on_translation"() TO "postgres";
