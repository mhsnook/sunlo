drop view "public"."meta_phrase_info";

create or replace view
	"public"."meta_phrase_info" as
with
	"recent_review" as (
		select
			"r1"."id",
			"r1"."uid",
			"r1"."phrase_id",
			"r1"."lang",
			"r1"."score",
			"r1"."difficulty",
			"r1"."stability",
			"r1"."review_time_retrievability",
			"r1"."created_at" as "recentest_review_at",
			"r1"."updated_at"
		from
			(
				"public"."user_card_review" "r1"
				left join "public"."user_card_review" "r2" on (
					(
						("r1"."uid" = "r2"."uid")
						and ("r1"."phrase_id" = "r2"."phrase_id")
						and ("r1"."created_at" < "r2"."created_at")
					)
				)
			)
		where
			("r2"."created_at" is null)
	),
	"card_with_recentest_review" as (
		select distinct
			"c"."phrase_id",
			"c"."status",
			"r"."difficulty",
			"r"."stability",
			"r"."recentest_review_at"
		from
			(
				"public"."user_card" "c"
				join "recent_review" "r" on (
					(
						("c"."phrase_id" = "r"."phrase_id")
						and ("c"."uid" = "r"."uid")
					)
				)
			)
	),
	"results" as (
		select
			"p"."id",
			"p"."created_at",
			"p"."added_by",
			"p"."request_id",
			"p"."lang",
			"p"."text",
			"avg" ("c"."difficulty") as "avg_difficulty",
			"avg" ("c"."stability") as "avg_stability",
			"count" (distinct "c"."phrase_id") as "count_cards",
			"sum" (
				case
					when ("c"."status" = 'active'::"public"."card_status") then 1
					else 0
				end
			) as "count_active",
			"sum" (
				case
					when ("c"."status" = 'learned'::"public"."card_status") then 1
					else 0
				end
			) as "count_learned",
			"sum" (
				case
					when ("c"."status" = 'skipped'::"public"."card_status") then 1
					else 0
				end
			) as "count_skipped",
			"json_agg" (
				distinct "jsonb_build_object" ('id', "t"."id", 'name', "t"."name")
			) filter (
				where
					("t"."id" is not null)
			) as "tags"
		from
			(
				(
					(
						"public"."phrase" "p"
						left join "card_with_recentest_review" "c" on (("c"."phrase_id" = "p"."id"))
					)
					left join "public"."phrase_tag" "pt" on (("pt"."phrase_id" = "p"."id"))
				)
				left join "public"."tag" "t" on (("t"."id" = "pt"."tag_id"))
			)
		group by
			"p"."id",
			"p"."lang",
			"p"."text",
			"p"."created_at",
			"p"."added_by",
			"p"."request_id"
	)
select
	"results"."id",
	"results"."added_by",
	"results"."request_id",
	"results"."created_at",
	"results"."lang",
	"results"."text",
	"results"."avg_difficulty",
	"results"."avg_stability",
	"results"."count_cards",
	"results"."count_active",
	"results"."count_learned",
	"results"."count_skipped",
	case
		when ("results"."count_cards" = 0) then null::numeric
		else "round" (
			(("results"."count_active" / "results"."count_cards"))::numeric,
			2
		)
	end as "percent_active",
	case
		when ("results"."count_cards" = 0) then null::numeric
		else "round" (
			(("results"."count_learned" / "results"."count_cards"))::numeric,
			2
		)
	end as "percent_learned",
	case
		when ("results"."count_cards" = 0) then null::numeric
		else "round" (
			(("results"."count_skipped" / "results"."count_cards"))::numeric,
			2
		)
	end as "percent_skipped",
	"rank" () over (
		partition by
			"results"."lang"
		order by
			"results"."avg_difficulty"
	) as "rank_least_difficult",
	"rank" () over (
		partition by
			"results"."lang"
		order by
			"results"."avg_stability" desc nulls last
	) as "rank_most_stable",
	"rank" () over (
		partition by
			"results"."lang"
		order by
			case
				when ("results"."count_cards" > 0) then (
					("results"."count_skipped")::numeric / ("results"."count_cards")::numeric
				)
				else null::numeric
			end
	) as "rank_least_skipped",
	"rank" () over (
		partition by
			"results"."lang"
		order by
			case
				when ("results"."count_cards" > 0) then (
					("results"."count_learned")::numeric / ("results"."count_cards")::numeric
				)
				else null::numeric
			end desc nulls last
	) as "rank_most_learned",
	"rank" () over (
		partition by
			"results"."lang"
		order by
			"results"."created_at" desc
	) as "rank_newest",
	"results"."tags"
from
	"results";