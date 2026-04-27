-- Fix phrase_meta view to use security_invoker = true.
--
-- Without this, queries through phrase_meta run as the view owner (postgres),
-- which bypasses RLS entirely. The RLS policy on the phrase table blocks
-- non-admins from reading archived phrases, but that policy was silently
-- skipped for anyone querying through this view.
drop view if exists public.phrase_meta;

create view public.phrase_meta
with
	(security_invoker = true) as
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

grant all on table "public"."phrase_meta" to "anon";

grant all on table "public"."phrase_meta" to "authenticated";

grant all on table "public"."phrase_meta" to "service_role";
