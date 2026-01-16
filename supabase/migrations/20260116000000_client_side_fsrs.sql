-- Migration: Move FSRS calculations to client-side
--
-- This migration:
-- 1. Adds CHECK constraints for FSRS value validation
-- 2. Drops the PLv8 insert/update RPCs (clients use direct inserts now)
-- 3. Updates user_card_plus view to use pure SQL for retrievability calculation
-- 4. Drops all PLv8 FSRS helper functions
-- 5. Drops the PLv8 extension
--
-- The FSRS algorithm is now implemented in TypeScript at src/lib/fsrs.ts
-- Add missing CHECK constraints for FSRS values
-- (Some already exist: difficulty 0-10, score 1-4, stability >= 0)
-- Add max stability constraint (100 years = 36500 days)
alter table public.user_card_review
drop constraint if exists user_card_review_stability_max_check;

alter table public.user_card_review
add constraint user_card_review_stability_max_check check (stability <= 36500.0);

-- Add retrievability range constraint
alter table public.user_card_review
drop constraint if exists user_card_review_retrievability_check;

alter table public.user_card_review
add constraint user_card_review_retrievability_check check (
	review_time_retrievability is null
	or (
		review_time_retrievability >= 0.0
		and review_time_retrievability <= 1.0
	)
);

-- Update existing difficulty constraint to use correct range [1, 10] not [0, 10]
alter table public.user_card_review
drop constraint if exists user_card_review_difficulty_check;

alter table public.user_card_review
add constraint user_card_review_difficulty_check check (
	difficulty >= 1.0
	and difficulty <= 10.0
);

-- Drop the old PLv8 insert function (clients now use direct inserts)
drop function if exists "public"."insert_user_card_review" (
	"phrase_id" uuid,
	"lang" character varying,
	"score" integer,
	"day_session" text,
	"desired_retention" numeric
);

-- Drop the old PLv8 update function
drop function if exists "public"."update_user_card_review" ("review_id" uuid, "score" integer);

-- Drop views that depend on user_card_plus (in reverse dependency order)
drop view if exists public.feed_activities;

drop view if exists public.phrase_meta;

drop view if exists public.user_card_plus;

-- Recreate user_card_plus with pure SQL retrievability calculation
-- FSRS retrievability formula: (1 + f * (time_in_days / stability)) ^ c
-- where f = 19/81 ≈ 0.2345679 and c = -0.5
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
	"review"."stability",
	current_timestamp as "current_timestamp",
	-- Pure SQL retrievability calculation: (1 + f * (days / stability)) ^ c
	-- f = 19/81, c = -0.5
	nullif(
		power(
			1.0 + (19.0 / 81.0) * (
				extract(
					epoch
					from
						(current_timestamp - "review"."created_at")
				) / 3600.0 / 24.0
			) / nullif("review"."stability", 0),
			-0.5
		),
		'NaN'::numeric
	) as "retrievability_now"
from
	(
		"public"."user_card" "card"
		left join "review" on (
			("card"."phrase_id" = "review"."phrase_id")
			and ("card"."uid" = "review"."uid")
		)
	);

-- Recreate phrase_meta view
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

-- Recreate feed_activities view
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

-- Now we can safely drop all PLv8 FSRS helper functions
drop function if exists "public"."fsrs_clamp_d" (numeric);

drop function if exists "public"."fsrs_d_0" (integer);

drop function if exists "public"."fsrs_delta_d" (integer);

drop function if exists "public"."fsrs_dp" (numeric, integer);

drop function if exists "public"."fsrs_difficulty" (numeric, integer);

drop function if exists "public"."fsrs_interval" (numeric, numeric);

drop function if exists "public"."fsrs_retrievability" (numeric, numeric);

drop function if exists "public"."fsrs_s_0" (integer);

drop function if exists "public"."fsrs_s_fail" (numeric, numeric, numeric);

drop function if exists "public"."fsrs_s_success" (numeric, numeric, numeric, integer);

drop function if exists "public"."fsrs_stability" (numeric, numeric, numeric, integer);

drop function if exists "public"."fsrs_days_between" (timestamp, timestamp);

drop function if exists "public"."fsrs_days_between" (timestamptz, timestamptz);

drop function if exists "public"."record_review_and_schedule" (uuid, numeric, integer);

-- Drop the PLv8 extension (no longer needed)
drop extension if exists plv8;
