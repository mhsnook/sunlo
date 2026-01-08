-- Add upvote_count to phrase_playlist (if not exists)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'phrase_playlist'
    and column_name = 'upvote_count'
  ) then
    alter table "public"."phrase_playlist"
    add column "upvote_count" integer not null default 0;
  end if;
end $$;

-- Create phrase_playlist_upvote table (if not exists)
create table if not exists "public"."phrase_playlist_upvote" (
	"playlist_id" uuid not null,
	"uid" uuid not null default auth.uid (),
	"created_at" timestamp with time zone not null default now()
);

alter table "public"."phrase_playlist_upvote" enable row level security;

-- Trigger to update upvote count
create or replace function public.update_phrase_playlist_upvote_count () returns trigger language plpgsql security definer as $function$
begin
  if (TG_OP = 'INSERT') then
    update phrase_playlist
    set upvote_count = upvote_count + 1
    where id = NEW.playlist_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update phrase_playlist
    set upvote_count = upvote_count - 1
    where id = OLD.playlist_id;
    return OLD;
  end if;
  return null;
end;
$function$;

drop trigger if exists on_phrase_playlist_upvote_added on public.phrase_playlist_upvote;

create trigger on_phrase_playlist_upvote_added
after insert on public.phrase_playlist_upvote for each row
execute function public.update_phrase_playlist_upvote_count ();

drop trigger if exists on_phrase_playlist_upvote_removed on public.phrase_playlist_upvote;

create trigger on_phrase_playlist_upvote_removed
after delete on public.phrase_playlist_upvote for each row
execute function public.update_phrase_playlist_upvote_count ();

-- Toggle function
create or replace function public.toggle_phrase_playlist_upvote (p_playlist_id uuid) returns json language plpgsql as $function$
DECLARE
  v_user_uid uuid := auth.uid();
  v_upvote_exists boolean;
BEGIN
  -- Check if upvote exists
  SELECT EXISTS(
    SELECT 1 FROM phrase_playlist_upvote
    WHERE playlist_id = p_playlist_id AND uid = v_user_uid
  ) INTO v_upvote_exists;

  IF v_upvote_exists THEN
    -- Remove upvote
    DELETE FROM phrase_playlist_upvote
    WHERE playlist_id = p_playlist_id AND uid = v_user_uid;

    RETURN json_build_object(
      'playlist_id', p_playlist_id,
      'action', 'removed'
    );
  ELSE
    -- Add upvote
    INSERT INTO phrase_playlist_upvote (playlist_id, uid)
    VALUES (p_playlist_id, v_user_uid);

    RETURN json_build_object(
      'playlist_id', p_playlist_id,
      'action', 'added'
    );
  END IF;
END;
$function$;

-- Policies
drop policy if exists "Enable users to view their own upvotes" on "public"."phrase_playlist_upvote";

create policy "Enable users to view their own upvotes" on "public"."phrase_playlist_upvote" as permissive for
select
	to authenticated using (uid = auth.uid ());

drop policy if exists "Users can create upvotes" on "public"."phrase_playlist_upvote";

create policy "Users can create upvotes" on "public"."phrase_playlist_upvote" as permissive for insert to authenticated
with
	check ((uid = auth.uid ()));

drop policy if exists "Users can delete own upvotes" on "public"."phrase_playlist_upvote";

create policy "Users can delete own upvotes" on "public"."phrase_playlist_upvote" as permissive for delete to authenticated using ((uid = auth.uid ()));

-- Grants
grant
select
,
	insert,
	delete on table "public"."phrase_playlist_upvote" to "authenticated";

grant
execute on function public.toggle_phrase_playlist_upvote to authenticated;

-- Constraints/Indexes
do $$
begin
  -- Create unique index if it doesn't exist
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
    and tablename = 'phrase_playlist_upvote'
    and indexname = 'phrase_playlist_upvote_pkey'
  ) then
    create unique index phrase_playlist_upvote_pkey on public.phrase_playlist_upvote using btree (playlist_id, uid);
  end if;

  -- Add primary key constraint if it doesn't exist
  if not exists (
    select 1 from pg_constraint
    where conname = 'phrase_playlist_upvote_pkey'
  ) then
    alter table "public"."phrase_playlist_upvote"
    add constraint "phrase_playlist_upvote_pkey" primary key using index "phrase_playlist_upvote_pkey";
  end if;

  -- Add playlist_id foreign key if it doesn't exist
  if not exists (
    select 1 from pg_constraint
    where conname = 'phrase_playlist_upvote_playlist_id_fkey'
  ) then
    alter table "public"."phrase_playlist_upvote"
    add constraint "phrase_playlist_upvote_playlist_id_fkey" foreign key (playlist_id) references public.phrase_playlist (id) on delete cascade;
  end if;

  -- Add uid foreign key if it doesn't exist
  if not exists (
    select 1 from pg_constraint
    where conname = 'phrase_playlist_upvote_uid_fkey'
  ) then
    alter table "public"."phrase_playlist_upvote"
    add constraint "phrase_playlist_upvote_uid_fkey" foreign key (uid) references public.user_profile (uid) on delete cascade;
  end if;
end $$;

-- Update feed_activities view
create or replace view "public"."feed_activities" as
select
	"pr"."id",
	'request'::"text" as "type",
	"pr"."created_at",
	"pr"."lang",
	"pr"."requester_uid" as "uid",
	"jsonb_build_object" ('prompt', "pr"."prompt", 'upvote_count', "pr"."upvote_count") as "payload"
from
	"public"."phrase_request" "pr"
union all
select
	"pp"."id",
	'playlist'::"text" as "type",
	"pp"."created_at",
	"pp"."lang",
	"pp"."uid",
	"jsonb_build_object" (
		'title',
		"pp"."title",
		'description',
		"pp"."description",
		'upvote_count',
		"pp"."upvote_count",
		'phrase_count',
		(
			select
				"count" (*) as "count"
			from
				"public"."playlist_phrase_link"
			where
				("playlist_phrase_link"."playlist_id" = "pp"."id")
		)
	) as "payload"
from
	"public"."phrase_playlist" "pp"
union all
select distinct
	on ("p"."id") "p"."id",
	'phrase'::"text" as "type",
	"p"."created_at",
	"p"."lang",
	"p"."added_by" as "uid",
	"jsonb_build_object" (
		'text',
		"p"."text",
		'source',
		case
			when ("cpl"."request_id" is not null) then "jsonb_build_object" (
				'type',
				'request',
				'id',
				"cpl"."request_id",
				'comment_id',
				"cpl"."comment_id"
			)
			when ("ppl"."playlist_id" is not null) then "jsonb_build_object" (
				'type',
				'playlist',
				'id',
				"ppl"."playlist_id",
				'title',
				"playlist"."title",
				'follows',
				(("p"."count_active" + "p"."count_learned"))::integer
			)
			else null::"jsonb"
		end
	) as "payload"
from
	(
		(
			(
				"public"."meta_phrase_info" "p"
				left join "public"."comment_phrase_link" "cpl" on (("p"."id" = "cpl"."phrase_id"))
			)
			left join "public"."playlist_phrase_link" "ppl" on (("p"."id" = "ppl"."phrase_id"))
		)
		left join "public"."phrase_playlist" "playlist" on (("ppl"."playlist_id" = "playlist"."id"))
	)
where
	(
		("p"."added_by" is not null)
		and ("cpl"."id" is null)
		and ("ppl"."id" is null)
	);
