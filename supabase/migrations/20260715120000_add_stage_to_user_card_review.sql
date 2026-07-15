-- Migration: add `stage` to user_card_review, go append-only, retire day_first_review
--
-- See issue #724. `day_first_review` conflated two facts — *where* in the
-- session a review happened, and *whether* FSRS should read it. We replace it
-- with `stage`, reusing the numbering from `user_deck_review_state.stage`:
--   1 = first review pass
--   2 = go-back pass (cards skipped in stage 1)
--   3 = again-round re-reviews (tracking-only; FSRS columns stay null)
-- Scheduling relevance becomes the predicate `stage in (1, 2)` instead of a flag.
--
-- Reviews become append-only: each again-tap is now its own row rather than
-- overwriting one row per card per day, so the count of retries is preserved.
-- Corrections in the scoring pass still update in place (client-side), with
-- `updated_at` as the tell.
-- 1. Add the column, nullable so the backfill can run.
alter table "public"."user_card_review"
add column "stage" smallint;

-- 2. Backfill from day_first_review: scoring reviews -> stage 1, re-reviews ->
--    stage 3. Historical go-back (stage 2) reviews are indistinguishable from
--    stage 1 here and backfill as 1 — harmless, both satisfy `stage in (1, 2)`.
update "public"."user_card_review"
set
	"stage" = case
		when "day_first_review" then 1
		else 3
	end;

-- 3. Lock it down: every row now has a stage, and only 1-3 are valid on a
--    review row (the session's stages 4/5 never write a review).
alter table "public"."user_card_review"
alter column "stage"
set not null;

alter table "public"."user_card_review"
add constraint "user_card_review_stage_check" check (("stage" = any (array[1, 2, 3])));

-- 4. Flip the server-side reader of per-card scheduling state. `user_card_plus`
--    picks each card's latest review to derive FSRS state (difficulty,
--    stability, last_reviewed_at, retrievability_now); the client's `cards`
--    collection reads from it. It must now pick the latest *scoring* review
--    (stage 1-2) so that append-only stage-3 rows — which carry null FSRS —
--    never mask a card's real scheduling state. Output columns are unchanged,
--    so `create or replace` is safe.
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
			"rev"."phrase_id",
			"rev"."direction"
		from
			(
				"public"."user_card_review" "rev"
				left join "public"."user_card_review" "rev2" on (
					(
						("rev"."phrase_id" = "rev2"."phrase_id")
						and ("rev"."uid" = "rev2"."uid")
						and ("rev"."direction" = "rev2"."direction")
						and ("rev"."created_at" < "rev2"."created_at")
						and ("rev2"."stage" = any (array[1, 2]))
					)
				)
			)
		where
			("rev2"."created_at" is null)
			and ("rev"."stage" = any (array[1, 2]))
	)
select
	"card"."lang",
	"card"."id",
	"card"."uid",
	"card"."status",
	"card"."phrase_id",
	"card"."direction",
	"card"."created_at",
	"card"."updated_at",
	"review"."created_at" as "last_reviewed_at",
	"review"."difficulty",
	"review"."stability",
	current_timestamp as "current_timestamp",
	nullif(
		"power" (
			(
				1.0 + (
					(
						(19.0 / 81.0) * (
							(
								extract(
									epoch
									from
										(current_timestamp - "review"."created_at")
								) / 3600.0
							) / 24.0
						)
					) / nullif("review"."stability", (0)::numeric)
				)
			),
			'-0.5'::numeric
		),
		'NaN'::numeric
	) as "retrievability_now"
from
	(
		"public"."user_card" "card"
		left join "review" on (
			(
				("card"."phrase_id" = "review"."phrase_id")
				and ("card"."uid" = "review"."uid")
				and ("card"."direction" = "review"."direction")
			)
		)
	);

-- 5. Same fix for `phrase_stats`, the community-difficulty view. Its
--    `latest_reviews` CTE takes each learner's most recent review to average
--    difficulty/stability across learners. It must skip again-round rows too,
--    or a learner mid-again-round would contribute null FSRS. Output columns
--    are unchanged, so dependent views survive `create or replace`.
create or replace view "public"."phrase_stats" as
with
	"latest_reviews" as (
		select distinct
			on ("rev"."uid", "rev"."phrase_id") "rev"."uid",
			"rev"."phrase_id",
			"rev"."difficulty",
			"rev"."stability"
		from
			"public"."user_card_review" "rev"
		where
			("rev"."stage" = any (array[1, 2]))
		order by
			"rev"."uid",
			"rev"."phrase_id",
			"rev"."created_at" desc
	)
select
	"card"."phrase_id",
	"count" (*) as "count_learners",
	"avg" ("lr"."difficulty") as "avg_difficulty",
	"avg" ("lr"."stability") as "avg_stability"
from
	(
		"public"."user_card" "card"
		left join "latest_reviews" "lr" on (
			(
				("lr"."phrase_id" = "card"."phrase_id")
				and ("lr"."uid" = "card"."uid")
			)
		)
	)
where
	("card"."status" = any (array['active'::"public"."card_status", 'learned'::"public"."card_status"]))
group by
	"card"."phrase_id";

-- 6. Retire day_first_review — no reader references it anymore.
alter table "public"."user_card_review"
drop column "day_first_review";
