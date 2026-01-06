create or replace view "public"."user_deck_plus"
with
	("security_invoker" = 'true') as
select
	"d"."uid",
	"d"."lang",
	"d"."learning_goal",
	"d"."archived",
	"d"."daily_review_goal",
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
