-- Add voting on answer card linkages (comment_phrase_link)
-- Users can endorse specific phrase cards within comment threads
-- Different from comment upvotes; this votes on the card-answer relevance
-- Add upvote_count to comment_phrase_link
alter table "public"."comment_phrase_link"
add column "upvote_count" integer not null default 0;

-- Create the upvote table
create table "public"."comment_phrase_link_upvote" (
	"link_id" uuid not null,
	"uid" uuid not null default auth.uid (),
	"created_at" timestamp with time zone not null default now()
);

alter table "public"."comment_phrase_link_upvote" enable row level security;

create unique index comment_phrase_link_upvote_pkey on public.comment_phrase_link_upvote using btree (link_id, uid);

create index idx_link_upvote_link on public.comment_phrase_link_upvote using btree (link_id);

create index idx_link_upvote_user on public.comment_phrase_link_upvote using btree (uid);

alter table "public"."comment_phrase_link_upvote"
add constraint "comment_phrase_link_upvote_pkey" primary key using index "comment_phrase_link_upvote_pkey";

alter table "public"."comment_phrase_link_upvote"
add constraint "comment_phrase_link_upvote_link_id_fkey" foreign key (link_id) references public.comment_phrase_link (id) on delete cascade not valid;

alter table "public"."comment_phrase_link_upvote" validate constraint "comment_phrase_link_upvote_link_id_fkey";

alter table "public"."comment_phrase_link_upvote"
add constraint "comment_phrase_link_upvote_uid_fkey" foreign key (uid) references public.user_profile (uid) on delete cascade not valid;

alter table "public"."comment_phrase_link_upvote" validate constraint "comment_phrase_link_upvote_uid_fkey";

-- Grants
grant references on table "public"."comment_phrase_link_upvote" to "anon";

grant delete on table "public"."comment_phrase_link_upvote" to "authenticated";

grant insert on table "public"."comment_phrase_link_upvote" to "authenticated";

grant references on table "public"."comment_phrase_link_upvote" to "authenticated";

grant
select
	on table "public"."comment_phrase_link_upvote" to "authenticated";

grant trigger on table "public"."comment_phrase_link_upvote" to "authenticated";

grant
truncate on table "public"."comment_phrase_link_upvote" to "authenticated";

grant
update on table "public"."comment_phrase_link_upvote" to "authenticated";

grant delete on table "public"."comment_phrase_link_upvote" to "service_role";

grant insert on table "public"."comment_phrase_link_upvote" to "service_role";

grant references on table "public"."comment_phrase_link_upvote" to "service_role";

grant
select
	on table "public"."comment_phrase_link_upvote" to "service_role";

grant trigger on table "public"."comment_phrase_link_upvote" to "service_role";

grant
truncate on table "public"."comment_phrase_link_upvote" to "service_role";

grant
update on table "public"."comment_phrase_link_upvote" to "service_role";

-- RLS policies
create policy "Enable users to view their own data only" on "public"."comment_phrase_link_upvote" as permissive for
select
	to authenticated using (
		(
			(
				select
					auth.uid () as uid
			) = uid
		)
	);

create policy "Users can create upvotes" on "public"."comment_phrase_link_upvote" as permissive for insert to authenticated
with
	check ((uid = auth.uid ()));

create policy "Users can delete own upvotes" on "public"."comment_phrase_link_upvote" as permissive for delete to authenticated using ((uid = auth.uid ()));

-- Trigger to update denormalized count
create or replace function public.update_link_upvote_count () returns trigger language plpgsql security definer as $$
begin
  if (TG_OP = 'INSERT') then
    update comment_phrase_link
    set upvote_count = upvote_count + 1
    where id = NEW.link_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update comment_phrase_link
    set upvote_count = upvote_count - 1
    where id = OLD.link_id;
    return OLD;
  end if;
  return null;
end;
$$;

create trigger tr_update_link_upvote_count
after insert
or delete on public.comment_phrase_link_upvote for each row
execute function public.update_link_upvote_count ();

-- RPC with explicit action (matching existing pattern)
create or replace function public.set_link_upvote (
	p_link_id uuid,
	p_action text -- 'add' or 'remove'
) returns json language plpgsql as $$
DECLARE
  v_user_uid uuid := auth.uid();
  v_upvote_exists boolean;
  v_actual_action text;
BEGIN
  -- Check if upvote exists
  SELECT EXISTS(
    SELECT 1 FROM comment_phrase_link_upvote
    WHERE link_id = p_link_id AND uid = v_user_uid
  ) INTO v_upvote_exists;

  IF p_action = 'add' THEN
    IF NOT v_upvote_exists THEN
      INSERT INTO comment_phrase_link_upvote (link_id, uid)
      VALUES (p_link_id, v_user_uid);
      v_actual_action := 'added';
    ELSE
      v_actual_action := 'no_change';
    END IF;
  ELSIF p_action = 'remove' THEN
    IF v_upvote_exists THEN
      DELETE FROM comment_phrase_link_upvote
      WHERE link_id = p_link_id AND uid = v_user_uid;
      v_actual_action := 'removed';
    ELSE
      v_actual_action := 'no_change';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid action: %. Must be "add" or "remove"', p_action;
  END IF;

  RETURN json_build_object(
    'link_id', p_link_id,
    'action', v_actual_action
  );
END;
$$;

grant
execute on function public.set_link_upvote to authenticated;

-- Add link upvotes to the recount function
create or replace function public.recount_all_upvotes () returns void language plpgsql security definer as $$
DECLARE
  v_since timestamptz := now() - interval '2 days';
BEGIN
  -- Recount phrase_request upvotes (only recently active)
  UPDATE phrase_request pr
  SET upvote_count = sub.cnt
  FROM (
    SELECT pru.request_id, count(*) as cnt
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
    SELECT ppu.playlist_id, count(*) as cnt
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
    SELECT cu.comment_id, count(*) as cnt
    FROM comment_upvote cu
    WHERE cu.comment_id IN (
      SELECT DISTINCT comment_id FROM comment_upvote
      WHERE created_at >= v_since
    )
    GROUP BY cu.comment_id
  ) sub
  WHERE rc.id = sub.comment_id
    AND rc.upvote_count IS DISTINCT FROM sub.cnt;

  -- Recount comment_phrase_link upvotes (only recently active)
  UPDATE comment_phrase_link cpl
  SET upvote_count = sub.cnt
  FROM (
    SELECT cplu.link_id, count(*) as cnt
    FROM comment_phrase_link_upvote cplu
    WHERE cplu.link_id IN (
      SELECT DISTINCT link_id FROM comment_phrase_link_upvote
      WHERE created_at >= v_since
    )
    GROUP BY cplu.link_id
  ) sub
  WHERE cpl.id = sub.link_id
    AND cpl.upvote_count IS DISTINCT FROM sub.cnt;
END;
$$;
