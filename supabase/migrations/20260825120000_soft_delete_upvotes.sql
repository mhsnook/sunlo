-- Soft-delete upvotes: un-upvoting becomes an UPDATE, never a DELETE (#768).
--
-- Supabase realtime skips the RLS check on DELETE and broadcasts the replica
-- identity to every subscriber of the table. The replica identity of these
-- three tables is the composite PK, so a stranger's un-upvote frame carried a
-- key the client mapped onto its own row and dropped it. UPDATE frames are
-- RLS-scoped, so an un-upvote now reaches only the user who made it.
-- 1. The flag. An upvote row is created once and toggled from then on.
alter table public.comment_upvote
add column deleted boolean not null default false;

alter table public.phrase_playlist_upvote
add column deleted boolean not null default false;

alter table public.phrase_request_upvote
add column deleted boolean not null default false;

-- 2. Toggling needs an UPDATE policy, and an UPDATE policy opens a hole the
-- table never had: a client could repoint its own row at another comment,
-- playlist or request, which the count triggers below would not see. The guard
-- pins every column but `deleted`. It is generic over the three tables —
-- `to_jsonb(old) - 'deleted'` drops the flag and compares the rest.
create or replace function public.guard_upvote_update () returns trigger language plpgsql as $$
begin
  if (to_jsonb(old) - 'deleted') is distinct from (to_jsonb(new) - 'deleted') then
    raise exception 'An upvote row is immutable except for its deleted flag';
  end if;
  return new;
end;
$$;

alter function public.guard_upvote_update () owner to postgres;

create or replace trigger guard_comment_upvote_update
before update on public.comment_upvote for each row
execute function public.guard_upvote_update ();

create or replace trigger guard_phrase_playlist_upvote_update
before update on public.phrase_playlist_upvote for each row
execute function public.guard_upvote_update ();

create or replace trigger guard_phrase_request_upvote_update
before update on public.phrase_request_upvote for each row
execute function public.guard_upvote_update ();

create policy "Users can update own upvotes" on public.comment_upvote
for update
	to authenticated using (uid = auth.uid ())
with
	check (uid = auth.uid ());

create policy "Users can update own upvotes" on public.phrase_playlist_upvote
for update
	to authenticated using (uid = auth.uid ())
with
	check (uid = auth.uid ());

create policy "Users can update own upvotes" on public.phrase_request_upvote
for update
	to authenticated using (uid = auth.uid ())
with
	check (uid = auth.uid ());

-- 3. The denormalised counts. Each function now counts the `deleted` flag
-- rather than the row: an INSERT of a live row adds one, a flag flip adds or
-- subtracts one, and a hard DELETE subtracts one only if the row was live.
-- Hard deletes still arrive by FK cascade and from the test-scene cleanups.
create or replace function public.update_comment_upvote_count () returns trigger language plpgsql security definer as $$
begin
  if (TG_OP = 'INSERT' and NEW.deleted = false) then
    update request_comment
    set upvote_count = upvote_count + 1
    where id = NEW.comment_id;
  elsif (TG_OP = 'UPDATE' and OLD.deleted is distinct from NEW.deleted) then
    update request_comment
    set upvote_count = upvote_count + (case when NEW.deleted then -1 else 1 end)
    where id = NEW.comment_id;
  elsif (TG_OP = 'DELETE' and OLD.deleted = false) then
    update request_comment
    set upvote_count = upvote_count - 1
    where id = OLD.comment_id;
  end if;
  return null;
end;
$$;

create or replace function public.update_phrase_playlist_upvote_count () returns trigger language plpgsql security definer as $$
begin
  if (TG_OP = 'INSERT' and NEW.deleted = false) then
    update phrase_playlist
    set upvote_count = upvote_count + 1
    where id = NEW.playlist_id;
  elsif (TG_OP = 'UPDATE' and OLD.deleted is distinct from NEW.deleted) then
    update phrase_playlist
    set upvote_count = upvote_count + (case when NEW.deleted then -1 else 1 end)
    where id = NEW.playlist_id;
  elsif (TG_OP = 'DELETE' and OLD.deleted = false) then
    update phrase_playlist
    set upvote_count = upvote_count - 1
    where id = OLD.playlist_id;
  end if;
  return null;
end;
$$;

create or replace function public.update_phrase_request_upvote_count () returns trigger language plpgsql security definer as $$
begin
  if (TG_OP = 'INSERT' and NEW.deleted = false) then
    update phrase_request
    set upvote_count = upvote_count + 1
    where id = NEW.request_id;
  elsif (TG_OP = 'UPDATE' and OLD.deleted is distinct from NEW.deleted) then
    update phrase_request
    set upvote_count = upvote_count + (case when NEW.deleted then -1 else 1 end)
    where id = NEW.request_id;
  elsif (TG_OP = 'DELETE' and OLD.deleted = false) then
    update phrase_request
    set upvote_count = upvote_count - 1
    where id = OLD.request_id;
  end if;
  return null;
end;
$$;

-- One trigger per table now that one function handles all three operations.
-- The old pairs fired on insert and delete only.
drop trigger if exists tr_update_comment_upvote_count on public.comment_upvote;

drop trigger if exists on_phrase_playlist_upvote_added on public.phrase_playlist_upvote;

drop trigger if exists on_phrase_playlist_upvote_removed on public.phrase_playlist_upvote;

drop trigger if exists on_phrase_request_upvote_added on public.phrase_request_upvote;

drop trigger if exists on_phrase_request_upvote_removed on public.phrase_request_upvote;

create or replace trigger on_comment_upvote_changed
after insert or update or delete on public.comment_upvote for each row
execute function public.update_comment_upvote_count ();

create or replace trigger on_phrase_playlist_upvote_changed
after insert or update or delete on public.phrase_playlist_upvote for each row
execute function public.update_phrase_playlist_upvote_count ();

create or replace trigger on_phrase_request_upvote_changed
after insert or update or delete on public.phrase_request_upvote for each row
execute function public.update_phrase_request_upvote_count ();

-- 4. Notifications. Upvoting a request notified the requester; before this
-- migration a re-upvote was a fresh INSERT and notified them again. Keep that:
-- the second trigger fires on the flag going false, which is a re-upvote.
create or replace trigger trg_notify_on_request_upvote
after insert on public.phrase_request_upvote for each row when (new.deleted = false)
execute function public.notify_on_request_upvote ();

create or replace trigger trg_notify_on_request_reupvote
after update on public.phrase_request_upvote for each row when (
	old.deleted = true
	and new.deleted = false
)
execute function public.notify_on_request_upvote ();

-- 5. The nightly recount. Counting the flag rather than the row also fixes a
-- case the old query missed: an item whose upvotes are all gone kept its last
-- count, because it dropped out of the GROUP BY. A soft-deleted row stays in
-- the group and counts zero.
create or replace function public.recount_all_upvotes () returns void language plpgsql security definer as $$
DECLARE
  v_since timestamptz := now() - interval '2 days';
BEGIN
  -- Only recount items that had upvote activity in the last 2 days.
  -- The "IS DISTINCT FROM" check avoids locking rows already correct.

  -- Recount phrase_request upvotes (only recently active)
  UPDATE phrase_request pr
  SET upvote_count = sub.cnt
  FROM (
    SELECT pru.request_id, count(*) filter (where pru.deleted = false) as cnt
    FROM phrase_request_upvote pru
    WHERE pru.request_id IN (
      SELECT DISTINCT request_id FROM phrase_request_upvote
      WHERE created_at >= v_since
    )
    GROUP BY pru.request_id
  ) sub
  WHERE pr.id = sub.request_id
    AND pr.upvote_count IS DISTINCT FROM sub.cnt;

  -- Recount phrase_playlist upvotes (only recently active)
  UPDATE phrase_playlist pp
  SET upvote_count = sub.cnt
  FROM (
    SELECT ppu.playlist_id, count(*) filter (where ppu.deleted = false) as cnt
    FROM phrase_playlist_upvote ppu
    WHERE ppu.playlist_id IN (
      SELECT DISTINCT playlist_id FROM phrase_playlist_upvote
      WHERE created_at >= v_since
    )
    GROUP BY ppu.playlist_id
  ) sub
  WHERE pp.id = sub.playlist_id
    AND pp.upvote_count IS DISTINCT FROM sub.cnt;

  -- Recount comment upvotes (only recently active)
  UPDATE request_comment rc
  SET upvote_count = sub.cnt
  FROM (
    SELECT cu.comment_id, count(*) filter (where cu.deleted = false) as cnt
    FROM comment_upvote cu
    WHERE cu.comment_id IN (
      SELECT DISTINCT comment_id FROM comment_upvote
      WHERE created_at >= v_since
    )
    GROUP BY cu.comment_id
  ) sub
  WHERE rc.id = sub.comment_id
    AND rc.upvote_count IS DISTINCT FROM sub.cnt;
END;
$$;
