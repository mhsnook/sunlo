CREATE OR REPLACE FUNCTION public.validate_friend_request_action()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_current_status text;
  v_pending_by_me boolean;
begin
  -- Get current relationship state
  select
    status,
    (most_recent_uid_by = NEW.uid_by)
  into v_current_status, v_pending_by_me
  from friend_summary
  where uid_less = NEW.uid_less and uid_more = NEW.uid_more;

  -- Default if no relationship exists
  v_current_status := coalesce(v_current_status, 'unconnected');
  v_pending_by_me := coalesce(v_pending_by_me, false);

  -- Validate and potentially transform action based on current state
  case NEW.action_type
    when 'invite' then
      if v_current_status = 'friends' then
        raise exception 'Already friends';
      elsif v_current_status = 'pending' and v_pending_by_me then
        raise exception 'Friend request already sent';
      elsif v_current_status = 'pending' and not v_pending_by_me then
        -- Mutual invite: they already invited me, so my invite = mutual consent → accept
        NEW.action_type := 'accept';
      end if;

    when 'accept' then
      if v_current_status != 'pending' then
        raise exception 'Cannot accept: no pending friend request';
      elsif v_pending_by_me then
        raise exception 'Cannot accept your own friend request';
      end if;

    when 'decline' then
      if v_current_status != 'pending' then
        raise exception 'Cannot decline: no pending friend request';
      elsif v_pending_by_me then
        raise exception 'Cannot decline your own friend request (use cancel instead)';
      end if;

    when 'cancel' then
      if v_current_status != 'pending' then
        raise exception 'Cannot cancel: no pending friend request';
      elsif not v_pending_by_me then
        raise exception 'Cannot cancel a request you did not send (use decline instead)';
      end if;

    when 'remove' then
      if v_current_status != 'friends' then
        raise exception 'Cannot remove: not currently friends';
      end if;

    else
      raise exception 'Invalid action type: %', NEW.action_type;
  end case;

  return NEW;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."validate_friend_request_action"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."validate_friend_request_action"() TO "service_role";

COMMENT ON FUNCTION "public"."validate_friend_request_action"() IS 'Validates friend request actions to ensure data integrity and consent.
   Handles mutual invite scenario (both users invite = auto-accept).
   Prevents invalid state transitions like accepting your own request.';

REVOKE ALL ON FUNCTION "public"."validate_friend_request_action"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."validate_friend_request_action"() TO "postgres";
