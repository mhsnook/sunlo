-- Migration: Remove SQL retrievability calculation
--
-- Retrievability is now calculated client-side only.
-- This simplifies the view and ensures a single source of truth.
--
-- The client uses the retrievability() function from src/lib/fsrs.ts
-- Drop views in dependency order
drop view if exists public.feed_activities;

drop view if exists public.phrase_meta;

drop view if exists public.user_card_plus;

-- Recreate user_card_plus WITHOUT retrievability calculation
-- Client will calculate from last_reviewed_at and stability
create or replace view "public"."user_card_plus"
with
	("security_invoker" = 'true') as
with
	"review" as (
		select
			"rev"."id",
			"rev"."uid",
			"rev"."score",
			"rev"."difficulty",
			"rev"."stability",
			"rev"."review_time_retrievability",
			"rev"."created_at",
			"rev"."updated_at",
			"rev"."day_session",
			"rev"."lang",
			"rev"."phrase_id"
		from
			(
				"public"."user_card_review" "rev"
				left join "public"."user_card_review" "rev2" on (
					(
						("rev"."phrase_id" = "rev2"."phrase_id")
						and ("rev"."uid" = "rev2"."uid")
						and ("rev"."created_at" < "rev2"."created_at")
					)
				)
			)
		where
			("rev2"."created_at" is null)
	)
select
	"card"."lang",
	"card"."id",
	"card"."uid",
	"card"."status",
	"card"."phrase_id",
	"card"."created_at",
	"card"."updated_at",
	"review"."created_at" as "last_reviewed_at",
	"review"."difficulty",
	"review"."stability"
from
	(
		"public"."user_card" "card"
		left join "review" on (
			("card"."phrase_id" = "review"."phrase_id")
			and ("card"."uid" = "review"."uid")
		)
	);

-- Recreate phrase_meta view (unchanged, doesn't use retrievability)
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
	),
	"cards" as (
		select
			card.phrase_id as "c_phrase_id",
			"count" (*) as "count_learners",
			"avg" (card.difficulty) as "avg_difficulty",
			"avg" (card.stability) as "avg_stability"
		from
			user_card_plus "card"
		where
			card.status in ('active', 'learned')
		group by
			c_phrase_id
	)
select
	phrase.id,
	phrase.lang,
	phrase.text,
	phrase.created_at,
	phrase.added_by,
	coalesce(cards.count_learners, 0) as "count_learners",
	cards.avg_difficulty,
	cards.avg_stability,
	coalesce(tags.tags, '[]'::"jsonb") as "tags"
from
	public.phrase "phrase"
	left join cards on (cards.c_phrase_id = phrase.id)
	left join tags on (tags.t_phrase_id = phrase.id);

-- Recreate feed_activities view (unchanged)
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
	("pr"."deleted" = false)
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
	("pp"."deleted" = false)
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
				(("p"."count_learners"))::integer
			)
			else null::"jsonb"
		end
	) as "payload"
from
	(
		(
			(
				"public"."phrase_meta" "p"
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
