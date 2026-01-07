-- Add deleted flag and updated_at to phrase_request
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'phrase_request'
    and column_name = 'deleted'
  ) then
    alter table "public"."phrase_request"
    add column "deleted" boolean not null default false;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'phrase_request'
    and column_name = 'updated_at'
  ) then
    alter table "public"."phrase_request"
    add column "updated_at" timestamp with time zone default now();
  end if;
end $$;

-- Add deleted flag and updated_at to phrase_playlist
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'phrase_playlist'
    and column_name = 'deleted'
  ) then
    alter table "public"."phrase_playlist"
    add column "deleted" boolean not null default false;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'phrase_playlist'
    and column_name = 'updated_at'
  ) then
    alter table "public"."phrase_playlist"
    add column "updated_at" timestamp with time zone default now();
  end if;
end $$;

-- Trigger to automatically update updated_at on phrase_request changes
create or replace function public.update_phrase_request_timestamp () returns trigger language plpgsql as $function$
begin
  NEW.updated_at = now();
  return NEW;
end;
$function$;

drop trigger if exists on_phrase_request_updated on public.phrase_request;

create trigger on_phrase_request_updated before
update on public.phrase_request for each row
execute function public.update_phrase_request_timestamp ();

-- Trigger to automatically update updated_at on phrase_playlist changes
create or replace function public.update_phrase_playlist_timestamp () returns trigger language plpgsql as $function$
begin
  NEW.updated_at = now();
  return NEW;
end;
$function$;

drop trigger if exists on_phrase_playlist_updated on public.phrase_playlist;

create trigger on_phrase_playlist_updated before
update on public.phrase_playlist for each row
execute function public.update_phrase_playlist_timestamp ();

-- Update the read policy to filter out deleted requests
-- Allow everyone to see non-deleted, and users to see their own even if deleted
drop policy if exists "Enable read access for all users" on "public"."phrase_request";

create policy "Enable read access for all users" on "public"."phrase_request" as permissive for
select
	to public using (
		deleted = false
		or requester_uid = auth.uid ()
	);

-- Update the update policy to allow soft deletes
drop policy if exists "Users can cancel their own requests" on "public"."phrase_request";

create policy "Users can update their own requests" on "public"."phrase_request"
for update
	to "authenticated" using (
		(
			"requester_uid" = "auth"."uid" ()
			and "deleted" = false
		)
	)
with
	check (("requester_uid" = "auth"."uid" ()));

-- Update the read policy to filter out deleted playlists
-- Allow everyone to see non-deleted, and users to see their own even if deleted
drop policy if exists "Enable read access for all users" on "public"."phrase_playlist";

create policy "Enable read access for all users" on "public"."phrase_playlist" as permissive for
select
	to public using (
		deleted = false
		or uid = auth.uid ()
	);

-- Update the update policy to allow soft deletes for playlists
drop policy if exists "Enable update for users based on uid" on "public"."phrase_playlist";

create policy "Users can update their own playlists" on "public"."phrase_playlist"
for update
	to "authenticated" using (
		(
			"uid" = "auth"."uid" ()
			and "deleted" = false
		)
	)
with
	check (("uid" = "auth"."uid" ()));

-- Update feed_activities view to filter out deleted items
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
where
	"pr"."deleted" = false
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
where
	"pp"."deleted" = false
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
