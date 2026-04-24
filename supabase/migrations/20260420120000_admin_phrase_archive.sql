-- Migration: Admin content management
--
-- 1. admin_user table — only the service role can insert/delete rows
-- 2. is_admin() helper queries admin_user instead of JWT metadata
-- 3. archived column on phrase table
-- 4. RLS policies for admin CRUD on phrases, translations, requests, and tags
-- 5. Updated views (phrase_meta, feed_activities) to respect archived flag
-- ── 1. admin_user table ──────────────────────────────────────────────
create table if not exists public.admin_user (
	uid uuid primary key references auth.users (id) on delete cascade,
	created_at timestamptz not null default now()
);

alter table public.admin_user enable row level security;

create policy "Users can read own admin status" on public.admin_user for
select
	to authenticated using (auth.uid () = uid);

revoke all on public.admin_user
from
	anon;

revoke all on public.admin_user
from
	authenticated;

grant
select
	on public.admin_user to authenticated;

-- ── 2. is_admin() ───────────────────────────────────────────────────
create or replace function public.is_admin () returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.admin_user where uid = auth.uid()
  );
$$;

-- ── 3. archived column on phrase ────────────────────────────────────
alter table "public"."phrase"
add column if not exists "archived" boolean not null default false;

-- ── 4. RLS policies ────────────────────────────────────────────────
-- Phrase: non-admins cannot see archived phrases
drop policy if exists "Enable read access for all users" on "public"."phrase";

create policy "Enable read access for all users" on "public"."phrase" as permissive for
select
	to public using (
		case
			when not archived then true
			else public.is_admin ()
		end
	);

-- Phrase: admins can update any phrase
drop policy if exists "Admins can update phrases" on "public"."phrase";

create policy "Admins can update phrases" on "public"."phrase"
for update
	to "authenticated" using (public.is_admin ())
with
	check (public.is_admin ());

-- Phrase tags: admins can delete any phrase tag
drop policy if exists "Admins can delete phrase tags" on "public"."phrase_tag";

create policy "Admins can delete phrase tags" on "public"."phrase_tag" for delete to "authenticated" using (public.is_admin ());

-- Translations: admins can update any translation
create policy "Admins can update translations" on "public"."phrase_translation"
for update
	to "authenticated" using (public.is_admin ())
with
	check (public.is_admin ());

-- Translations: admins can see archived translations
drop policy if exists "Enable read access for all users" on "public"."phrase_translation";

create policy "Enable read access for all users" on "public"."phrase_translation" as permissive for
select
	to public using (
		case
			when not archived then true
			when added_by = (
				select
					auth.uid ()
			) then true
			else public.is_admin ()
		end
	);

-- Requests: admins can update any request
create policy "Admins can update requests" on "public"."phrase_request"
for update
	to "authenticated" using (public.is_admin ())
with
	check (public.is_admin ());

-- ── 5. Updated views ───────────────────────────────────────────────
drop view if exists public.feed_activities;

drop view if exists public.phrase_meta;

create view public.phrase_meta as
with
	"tags" as (
		select
			"pt"."phrase_id" as "t_phrase_id",
			(
				"json_agg" (
					distinct "jsonb_build_object" ('id', "tag"."id", 'name', "tag"."name")
				) filter (
					where
						("tag"."id" is not null)
				)
			)::"jsonb" as "tags"
		from
			(
				"public"."phrase_tag" "pt"
				left join "public"."tag" "tag" on (("tag"."id" = "pt"."tag_id"))
			)
		group by
			"pt"."phrase_id"
	)
select
	"phrase"."id",
	"phrase"."lang",
	"phrase"."text",
	"phrase"."created_at",
	"phrase"."added_by",
	"phrase"."only_reverse",
	"phrase"."archived",
	coalesce("stats"."count_learners", (0)::bigint) as "count_learners",
	"stats"."avg_difficulty",
	"stats"."avg_stability",
	coalesce("tags"."tags", '[]'::"jsonb") as "tags"
from
	(
		(
			"public"."phrase" "phrase"
			left join "public"."phrase_stats" "stats" on (("stats"."phrase_id" = "phrase"."id"))
		)
		left join "tags" on (("tags"."t_phrase_id" = "phrase"."id"))
	);

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
