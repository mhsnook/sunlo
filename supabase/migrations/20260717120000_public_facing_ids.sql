-- Public-facing short IDs for route-addressable entities.
--
-- Every table keeps its uuid `id` as the primary key / join key / client-minted
-- optimistic token. This migration adds an ADDITIVE `public_id`: a short,
-- non-enumerable, random base62 handle used only in URLs. Nothing FKs to it.
--
-- Only entities that a user navigates TO by id get one:
--   phrase, phrase_request, phrase_playlist, request_comment (the `?focus=`
--   deep-link on the request thread).
-- Link tables, upvotes, translations, cards, notifications etc. are never
-- addressed on their own, so they keep uuid-only.
-- gen_public_id(size) — random base62 token from pgcrypto's gen_random_bytes.
-- VOLATILE (default) so it produces a fresh value per row when used as a
-- column DEFAULT or in a set-based backfill UPDATE. This is obfuscation, not
-- security: RLS remains the access-control boundary. ~59 bits of entropy at
-- the default length; the unique index is the collision backstop.
create or replace function "public"."gen_public_id" ("size" integer default 10) returns "text" language "plpgsql" as $$
declare
  alphabet text := '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  bytes bytea := extensions.gen_random_bytes(size);
  result text := '';
  i int;
begin
  for i in 0 .. size - 1 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % 62) + 1, 1);
  end loop;
  return result;
end;
$$;

alter function "public"."gen_public_id" ("size" integer) owner to "postgres";

-- Add the column to each addressable table: nullable first, backfill existing
-- rows with distinct values, then lock down with a default + not-null + unique
-- index. Wrapped in a helper loop to keep the four tables in lockstep.
do $$
declare
  tbl text;
begin
  foreach tbl in array array['phrase', 'phrase_request', 'phrase_playlist', 'request_comment']
  loop
    execute format('alter table public.%I add column if not exists public_id text', tbl);
    execute format('update public.%I set public_id = public.gen_public_id() where public_id is null', tbl);
    execute format('alter table public.%I alter column public_id set default public.gen_public_id()', tbl);
    execute format('alter table public.%I alter column public_id set not null', tbl);
    execute format('create unique index if not exists %I on public.%I (public_id)', tbl || '_public_id_key', tbl);
  end loop;
end;
$$;

-- Expose public_id on the phrase_meta view (phrasesCollection reads this view,
-- not the base table). CREATE OR REPLACE keeps the existing column order and
-- appends the new column at the end, as required.
create or replace view "public"."phrase_meta"
with
	("security_invoker" = 'true') as
with
	"tags" as (
		select
			"pt"."phrase_id" as "t_phrase_id",
			(
				"json_agg" (distinct "jsonb_build_object" ('id', "tag"."id", 'name', "tag"."name")) filter (
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
	coalesce("tags"."tags", '[]'::"jsonb") as "tags",
	"phrase"."updated_at",
	"phrase"."public_id"
from
	(
		(
			"public"."phrase" "phrase"
			left join "public"."phrase_stats" "stats" on (("stats"."phrase_id" = "phrase"."id"))
		)
		left join "tags" on (("tags"."t_phrase_id" = "phrase"."id"))
	);

-- Expose public_id on the feed_activities view so both feed renderers can link
-- to each activity's entity by its handle instead of resolving the uuid
-- client-side. Appended as the last column of each UNION branch (public_id of
-- the branch's own entity), as CREATE OR REPLACE requires.
create or replace view "public"."feed_activities" as
select
	"pr"."id",
	'request'::"text" as "type",
	"pr"."created_at",
	"pr"."lang",
	"pr"."requester_uid" as "uid",
	coalesce("pr"."upvote_count", 0) as "popularity",
	"jsonb_build_object" ('prompt', "pr"."prompt", 'upvote_count', "pr"."upvote_count") as "payload",
	"pr"."public_id"
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
	) as "payload",
	"pp"."public_id"
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
			when ("cpl"."request_id" is not null) then "jsonb_build_object" ('type', 'request', 'id', "cpl"."request_id", 'comment_id', "cpl"."comment_id")
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
	) as "payload",
	"p"."public_id"
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
