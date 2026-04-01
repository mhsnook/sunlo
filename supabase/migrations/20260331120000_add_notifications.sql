-- Notification type enum
create type notification_type as enum(
	'request_commented',
	'comment_replied',
	'phrase_translated',
	'phrase_referenced',
	'request_upvoted',
	'change_suggested'
);

-- Notification table
create table notification (
	id uuid default gen_random_uuid() not null primary key,
	uid uuid not null references user_profile (uid) on delete cascade,
	type notification_type not null,
	actor_uid uuid not null references user_profile (uid) on delete cascade,
	request_id uuid references phrase_request (id) on delete cascade,
	comment_id uuid references request_comment (id) on delete cascade,
	phrase_id uuid references phrase (id) on delete cascade,
	read_at timestamp with time zone,
	created_at timestamp with time zone default now() not null,
	constraint notification_no_self_notify check (uid <> actor_uid)
);

create index idx_notification_uid_created on notification (uid, created_at desc);

create index idx_notification_uid_unread on notification (uid)
where
	read_at is null;

-- RLS
alter table notification enable row level security;

create policy "Users can read own notifications" on notification for
select
	using (uid = auth.uid ());

create policy "Users can update own notifications" on notification
for update
	using (uid = auth.uid ());

-- Grants
grant
select
,
update on notification to authenticated;

-- Enable realtime
alter publication supabase_realtime
add table notification;

----------------------------------------------------------------------
-- Trigger: request_comment INSERT -> request_commented + comment_replied
----------------------------------------------------------------------
create or replace function notify_on_comment () returns trigger language plpgsql security definer as $$
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
$$;

create trigger trg_notify_on_comment
after insert on request_comment for each row
execute function notify_on_comment ();

----------------------------------------------------------------------
-- Trigger: phrase_translation INSERT -> phrase_translated
----------------------------------------------------------------------
create or replace function notify_on_translation () returns trigger language plpgsql security definer as $$
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
$$;

create trigger trg_notify_on_translation
after insert on phrase_translation for each row
execute function notify_on_translation ();

----------------------------------------------------------------------
-- Trigger: comment_phrase_link INSERT -> phrase_referenced
----------------------------------------------------------------------
create or replace function notify_on_phrase_reference () returns trigger language plpgsql security definer as $$
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
$$;

create trigger trg_notify_on_phrase_reference
after insert on comment_phrase_link for each row
execute function notify_on_phrase_reference ();

----------------------------------------------------------------------
-- Trigger: phrase_request_upvote INSERT -> request_upvoted
----------------------------------------------------------------------
create or replace function notify_on_request_upvote () returns trigger language plpgsql security definer as $$
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
$$;

create trigger trg_notify_on_request_upvote
after insert on phrase_request_upvote for each row
execute function notify_on_request_upvote ();
