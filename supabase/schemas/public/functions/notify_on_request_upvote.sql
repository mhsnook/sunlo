CREATE OR REPLACE FUNCTION public.notify_on_request_upvote()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
declare
  v_requester_uid uuid;
begin
  select requester_uid into v_requester_uid
    from phrase_request where id = NEW.request_id;

  if v_requester_uid is not null and v_requester_uid <> NEW.uid then
    insert into notification (uid, type, actor_uid, request_id)
    values (v_requester_uid, 'request_upvoted', NEW.uid, NEW.request_id);
  end if;

  return NEW;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."notify_on_request_upvote"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."notify_on_request_upvote"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."notify_on_request_upvote"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."notify_on_request_upvote"() TO "postgres";
