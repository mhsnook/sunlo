-- Migration: Admin phrase archive support
-- Allows staff/admin users to archive phrases (soft delete)
-- Admin status is determined by auth.jwt()->'app_metadata'->>'is_admin' = 'true'
-- Set via Supabase dashboard or admin API: supabase.auth.admin.updateUserById(uid, { app_metadata: { is_admin: true } })
-- 1. Helper function to check if current user is admin
create or replace function public.is_admin () returns boolean language sql stable security definer as $$
  select coalesce(
    (auth.jwt()->'app_metadata'->>'is_admin')::boolean,
    false
  );
$$;

-- 2. Add archived column to phrase table
alter table "public"."phrase"
add column if not exists "archived" boolean not null default false;

-- 3. Update phrase read policy to filter archived phrases for non-admins
drop policy if exists "Enable read access for all users" on "public"."phrase";

create policy "Enable read access for all users" on "public"."phrase" as permissive for
select
	to public using (
		archived = false
		or public.is_admin ()
	);

-- 4. Add admin update policy on phrase table
drop policy if exists "Admins can update phrases" on "public"."phrase";

create policy "Admins can update phrases" on "public"."phrase"
for update
	to "authenticated" using (public.is_admin ())
with
	check (public.is_admin ());

-- 5. Add admin delete policy on phrase_tag (to clean up tags when archiving)
drop policy if exists "Admins can delete phrase tags" on "public"."phrase_tag";

create policy "Admins can delete phrase tags" on "public"."phrase_tag" for delete to "authenticated" using (public.is_admin ());

-- 6. Create RPC to archive a phrase (sets archived on phrase + all its translations)
create or replace function public.admin_archive_phrase (p_phrase_id uuid) returns void language plpgsql security definer as $$
begin
  -- Check admin status
  if not public.is_admin() then
    raise exception 'Unauthorized: admin access required';
  end if;

  -- Archive the phrase
  update public.phrase
  set archived = true
  where id = p_phrase_id;

  -- Archive all translations for this phrase
  update public.phrase_translation
  set archived = true
  where phrase_id = p_phrase_id;
end;
$$;

-- 7. Create RPC to unarchive a phrase (in case of mistakes)
create or replace function public.admin_unarchive_phrase (p_phrase_id uuid) returns void language plpgsql security definer as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: admin access required';
  end if;

  update public.phrase
  set archived = false
  where id = p_phrase_id;

  -- Unarchive translations too
  update public.phrase_translation
  set archived = false
  where phrase_id = p_phrase_id;
end;
$$;

-- 8. Update phrase_meta view to include archived column
-- Must drop dependent views first, then recreate
drop view if exists public.feed_activities;

drop view if exists public.phrase_meta;

create view public.phrase_meta as
with
	"tags" as (
		select
			pt.phrase_id as "t_phrase_id",
			json_agg(distinct jsonb_build_object('id', tag.id, 'name', tag.name)) filter (
				where
					tag.id is not null
			)::"jsonb" as "tags"
		from
			public.phrase_tag "pt"
			left join public.tag as "tag" on (tag.id = pt.tag_id)
		group by
			t_phrase_id
	)
select
	phrase.id,
	phrase.lang,
	phrase.text,
	phrase.created_at,
	phrase.added_by,
	phrase.only_reverse,
	phrase.archived,
	coalesce(stats.count_learners, 0::bigint) as "count_learners",
	stats.avg_difficulty,
	stats.avg_stability,
	coalesce(tags.tags, '[]'::"jsonb") as "tags"
from
	public.phrase "phrase"
	left join public.phrase_stats "stats" on (stats.phrase_id = phrase.id)
	left join tags on (tags.t_phrase_id = phrase.id);

-- 9. Recreate feed_activities view (same logic as before, plus archived filter on phrases)
create or replace view "public"."feed_activities" as
select
	"pr"."id",
	'request'::"text" as "type",
	"pr"."created_at",
	"pr"."lang",
	"pr"."requester_uid" as "uid",
	coalesce("pr"."upvote_count", 0) as "popularity",
	"jsonb_build_object" ('prompt', "pr"."prompt", 'upvote_count', "pr"."upvote_count") as "payload"
from
	"public"."phrase_request" "pr"
where
	("pr"."deleted" = false)
union all
select
	"pp"."id",
	'playlist'::"text" as "type",
	"pp"."created_at",
	"pp"."lang",
	"pp"."uid",
	coalesce("pp"."upvote_count", 0) as "popularity",
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
	("pp"."deleted" = false)
union all
select distinct
	on ("p"."id") "p"."id",
	'phrase'::"text" as "type",
	"p"."created_at",
	"p"."lang",
	"p"."added_by" as "uid",
	coalesce("ps"."count_learners", (0)::bigint) as "popularity",
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
				(coalesce("ps"."count_learners", (0)::bigint))::integer
			)
			else null::"jsonb"
		end
	) as "payload"
from
	(
		(
			(
				(
					"public"."phrase" "p"
					left join "public"."phrase_stats" "ps" on (("ps"."phrase_id" = "p"."id"))
				)
				left join "public"."comment_phrase_link" "cpl" on (("p"."id" = "cpl"."phrase_id"))
			)
			left join "public"."playlist_phrase_link" "ppl" on (("p"."id" = "ppl"."phrase_id"))
		)
		left join "public"."phrase_playlist" "playlist" on (("ppl"."playlist_id" = "playlist"."id"))
	)
where
	(
		("p"."added_by" is not null)
		and ("p"."archived" = false)
		and ("cpl"."id" is null)
		and ("ppl"."id" is null)
	);
