CREATE OR REPLACE FUNCTION public.notify_on_comment()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
declare
  v_requester_uid uuid;
  v_parent_uid uuid;
begin
  -- Notify request owner
  select requester_uid into v_requester_uid
    from phrase_request where id = NEW.request_id;

  if v_requester_uid is not null and v_requester_uid <> NEW.uid then
    insert into notification (uid, type, actor_uid, request_id, comment_id)
    values (v_requester_uid, 'request_commented', NEW.uid, NEW.request_id, NEW.id);
  end if;

  -- Notify parent comment author (if this is a reply)
  if NEW.parent_comment_id is not null then
    select uid into v_parent_uid
      from request_comment where id = NEW.parent_comment_id;

    -- Skip if parent author is same as request owner (already notified above)
    -- or same as comment author (self-reply)
    if v_parent_uid is not null
       and v_parent_uid <> NEW.uid
       and v_parent_uid is distinct from v_requester_uid then
      insert into notification (uid, type, actor_uid, request_id, comment_id)
      values (v_parent_uid, 'comment_replied', NEW.uid, NEW.request_id, NEW.id);
    end if;
  end if;

  return NEW;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."notify_on_comment"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."notify_on_comment"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."notify_on_comment"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."notify_on_comment"() TO "postgres";
