-- Fix count_learners: phrase_stats was querying user_card_plus (security_invoker=true)
-- which applies RLS and only counted the current user's cards. Each user saw
-- count_learners = 0 or 1 instead of the total across all learners.
-- Fix: query user_card + user_card_review directly (no security_invoker = runs as
-- postgres, bypasses RLS).

-- Drop dependents in order
drop materialized view if exists "public"."phrase_search_index";
drop view if exists "public"."feed_activities";
drop view if exists "public"."phrase_meta";
drop view if exists "public"."phrase_stats";

-- Recreate phrase_stats querying base tables directly (bypasses RLS)
create view "public"."phrase_stats" as
with
	"latest_reviews" as (
		select distinct on ("rev"."uid", "rev"."phrase_id")
			"rev"."uid",
			"rev"."phrase_id",
			"rev"."difficulty",
			"rev"."stability"
		from
			"public"."user_card_review" "rev"
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
	"public"."user_card" "card"
	left join "latest_reviews" "lr" on (
		("lr"."phrase_id" = "card"."phrase_id")
		and ("lr"."uid" = "card"."uid")
	)
where
	"card"."status" = any (
		array[
			'active'::"public"."card_status",
			'learned'::"public"."card_status"
		]
	)
group by
	"card"."phrase_id";

alter table "public"."phrase_stats" owner to "postgres";

-- Recreate phrase_meta (unchanged structure)
create view "public"."phrase_meta" as
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

alter table "public"."phrase_meta" owner to "postgres";

-- Recreate feed_activities (phrase branch uses phrase + phrase_stats directly)
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
				coalesce("ps"."count_learners", (0)::bigint)::integer
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
		and ("cpl"."id" is null)
		and ("ppl"."id" is null)
	);

alter table "public"."feed_activities" owner to "postgres";

-- Recreate phrase_search_index (unchanged structure)
create materialized view "public"."phrase_search_index" as
select
	"p"."id",
	"p"."lang",
	"p"."text",
	"p"."created_at",
	coalesce("ps"."count_learners", (0)::bigint) as "popularity",
	"lower" (
		(
			(
				(
					(coalesce("p"."text", ''::"text") || ' '::"text") || coalesce("string_agg" (distinct "t"."text", ' '::"text"), ''::"text")
				) || ' '::"text"
			) || coalesce("string_agg" (distinct "tag"."name", ' '::"text"), ''::"text")
		)
	) as "search_text"
from
	(
		(
			(
				(
					"public"."phrase" "p"
					left join "public"."phrase_translation" "t" on (
						(
							("t"."phrase_id" = "p"."id")
							and ("t"."archived" = false)
						)
					)
				)
				left join "public"."phrase_tag" "pt" on (("pt"."phrase_id" = "p"."id"))
			)
			left join "public"."tag" on (("tag"."id" = "pt"."tag_id"))
		)
		left join "public"."phrase_stats" "ps" on (("ps"."phrase_id" = "p"."id"))
	)
group by
	"p"."id",
	"ps"."count_learners"
with
	no data;

alter table "public"."phrase_search_index" owner to "postgres";

-- Recreate indexes (required for CONCURRENTLY refresh)
create unique index "idx_phrase_search_id" on "public"."phrase_search_index" using "btree" ("id");
create index "idx_phrase_search_cursor" on "public"."phrase_search_index" using "btree" ("created_at" desc, "id");
create index "idx_phrase_search_lang" on "public"."phrase_search_index" using "btree" ("lang");
create index "idx_phrase_search_popularity" on "public"."phrase_search_index" using "btree" ("popularity" desc);
create index "idx_phrase_search_trgm" on "public"."phrase_search_index" using "gin" ("search_text" "public"."gin_trgm_ops");
