-- Add review_answer_mode to user_profile and user_deck
-- Allows users to choose between 4 answer buttons (again/hard/good/easy)
-- or 2 simplified buttons (no/yes). Cascades from profile to deck.
alter table "public"."user_profile"
add column "review_answer_mode" text default '4-buttons'::text;

alter table "public"."user_profile"
add constraint "user_profile_review_answer_mode_check" check (review_answer_mode in ('4-buttons', '2-buttons'));

alter table "public"."user_deck"
add column "review_answer_mode" text default null;

alter table "public"."user_deck"
add constraint "user_deck_review_answer_mode_check" check (
	review_answer_mode is null
	or review_answer_mode in ('4-buttons', '2-buttons')
);

-- Recreate user_deck_plus view to include the new columns
drop view if exists "public"."user_deck_plus";

create or replace view "public"."user_deck_plus"
with
	("security_invoker" = 'true') as
select
	"d"."uid",
	"d"."lang",
	"d"."learning_goal",
	"d"."archived",
	"d"."daily_review_goal",
	"d"."preferred_translation_lang",
	"d"."review_answer_mode",
	(
		select
			"l"."name"
		from
			"public"."language" "l"
		where
			(("l"."lang")::"text" = ("d"."lang")::"text")
		limit
			1
	) as "language",
	"d"."created_at",
	"count" (*) filter (
		where
			("c"."status" = 'learned'::"public"."card_status")
	) as "cards_learned",
	"count" (*) filter (
		where
			("c"."status" = 'active'::"public"."card_status")
	) as "cards_active",
	"count" (*) filter (
		where
			("c"."status" = 'skipped'::"public"."card_status")
	) as "cards_skipped",
	(
		select
			"count" (*) as "count"
		from
			"public"."phrase" "p"
		where
			(("p"."lang")::"text" = ("d"."lang")::"text")
	) as "lang_total_phrases",
	(
		select
			"max" ("r"."created_at") as "max"
		from
			"public"."user_card_review" "r"
		where
			(
				(("r"."lang")::"text" = ("d"."lang")::"text")
				and ("r"."uid" = "d"."uid")
			)
		limit
			1
	) as "most_recent_review_at",
	(
		select
			"count" (*) as "count"
		from
			"public"."user_card_review" "r"
		where
			(
				(("r"."lang")::"text" = ("d"."lang")::"text")
				and ("r"."uid" = "d"."uid")
				and ("r"."created_at" > ("now" () - '7 days'::interval))
			)
		limit
			1
	) as "count_reviews_7d",
	(
		select
			"count" (*) as "count"
		from
			"public"."user_card_review" "r"
		where
			(
				(("r"."lang")::"text" = ("d"."lang")::"text")
				and ("r"."uid" = "d"."uid")
				and ("r"."created_at" > ("now" () - '7 days'::interval))
				and ("r"."score" >= 2)
			)
		limit
			1
	) as "count_reviews_7d_positive"
from
	(
		"public"."user_deck" "d"
		left join "public"."user_card" "c" on (
			(
				(("d"."lang")::"text" = ("c"."lang")::"text")
				and ("d"."uid" = "c"."uid")
			)
		)
	)
group by
	"d"."uid",
	"d"."lang",
	"d"."learning_goal",
	"d"."archived",
	"d"."daily_review_goal",
	"d"."preferred_translation_lang",
	"d"."review_answer_mode",
	"d"."created_at"
order by
	(
		select
			"count" (*) as "count"
		from
			"public"."user_card_review" "r"
		where
			(
				(("r"."lang")::"text" = ("d"."lang")::"text")
				and ("r"."uid" = "d"."uid")
				and ("r"."created_at" > ("now" () - '7 days'::interval))
			)
		limit
			1
	) desc nulls last,
	"d"."created_at" desc;
