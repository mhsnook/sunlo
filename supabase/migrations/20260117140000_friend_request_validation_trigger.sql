-- BEFORE INSERT trigger to validate friend request actions
-- This ensures data integrity and consent while keeping the local-first insert pattern
-- RLS handles auth (who can insert), trigger handles business logic (what actions are valid)
create or replace function public.validate_friend_request_action () returns trigger language plpgsql security definer
set
	search_path = public as $$
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
$$;

-- Create the trigger
drop trigger if exists trigger_validate_friend_request_action on public.friend_request_action;

create trigger trigger_validate_friend_request_action before insert on public.friend_request_action for each row
execute function public.validate_friend_request_action ();

comment on function public.validate_friend_request_action is 'Validates friend request actions to ensure data integrity and consent.
   Handles mutual invite scenario (both users invite = auto-accept).
   Prevents invalid state transitions like accepting your own request.';
