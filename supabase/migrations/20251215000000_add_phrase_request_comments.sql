-- Create phrase request comment tables and functions
-- UPDATED: Single table for both top-level comments and replies

-- 1. Create comment table (unified for both top-level and replies)
create table if not exists
	"public"."request_comment" (
		"id" "uuid" default "gen_random_uuid" () not null,
		"request_id" "uuid" not null,
		"parent_comment_id" "uuid",
		"commenter_uid" "uuid" not null,
		"content" "text" not null,
		"created_at" timestamp with time zone default "now" () not null,
		"updated_at" timestamp with time zone default "now" () not null,
		"upvote_count" integer default 0 not null,
		constraint "request_comment_pkey" primary key ("id"),
		constraint "request_comment_request_id_fkey" foreign key ("request_id") references "public"."phrase_request" ("id") on delete cascade,
		constraint "request_comment_parent_comment_id_fkey" foreign key ("parent_comment_id") references "public"."request_comment" ("id") on delete cascade,
		constraint "request_comment_commenter_uid_fkey" foreign key ("commenter_uid") references "public"."user_profile" ("uid") on delete cascade
	);

create index if not exists "idx_comment_request_id" on "public"."request_comment" ("request_id");
create index if not exists "idx_comment_parent" on "public"."request_comment" ("parent_comment_id");
create index if not exists "idx_comment_upvotes" on "public"."request_comment" ("request_id", "upvote_count" desc);
create index if not exists "idx_comment_created_at" on "public"."request_comment" ("parent_comment_id", "created_at" asc);

create table if not exists
	"public"."comment_phrase" (
		"id" "uuid" default "gen_random_uuid" () not null,
		"request_id" "uuid" not null,
		"comment_id" "uuid" not null,
		"phrase_id" "uuid" not null,
		"created_at" timestamp with time zone default "now" () not null,
		constraint "comment_phrase_pkey" primary key ("id"),
		constraint "comment_phrase_request_id_fkey" foreign key ("request_id") references "public"."phrase_request" ("id") on delete cascade,
		constraint "comment_phrase_comment_id_fkey" foreign key ("comment_id") references "public"."request_comment" ("id") on delete cascade,
		constraint "comment_phrase_phrase_id_fkey" foreign key ("phrase_id") references "public"."phrase" ("id") on delete cascade
	);

create index if not exists "idx_comment_phrase_request" on "public"."comment_phrase" ("request_id");
create index if not exists "idx_comment_phrase_comment" on "public"."comment_phrase" ("comment_id");
create index if not exists "idx_comment_phrase_phrase" on "public"."comment_phrase" ("phrase_id");

create table if not exists
	"public"."comment_upvote" (
		"id" "uuid" default "gen_random_uuid" () not null,
		"comment_id" "uuid" not null,
		"uid" "uuid" not null,
		"created_at" timestamp with time zone default "now" () not null,
		constraint "comment_upvote_pkey" primary key ("id"),
		constraint "comment_upvote_comment_id_fkey" foreign key ("comment_id") references "public"."request_comment" ("id") on delete cascade,
		constraint "comment_upvote_uid_fkey" foreign key ("uid") references "public"."user_profile" ("uid") on delete cascade,
		constraint "unique_user_comment_upvote" unique ("comment_id", "uid")
	);

create index if not exists "idx_upvote_comment" on "public"."comment_upvote" ("comment_id");
create index if not exists "idx_upvote_user" on "public"."comment_upvote" ("uid");

-- 2. Enable RLS
alter table "public"."request_comment" enable row level security;
alter table "public"."comment_phrase" enable row level security;
alter table "public"."comment_upvote" enable row level security;

-- 3. RLS Policies
create policy "Enable read access for all users" on "public"."request_comment" for select using (true);
create policy "Enable read access for all users" on "public"."comment_phrase" for select using (true);
create policy "Enable read access for all users" on "public"."comment_upvote" for select using (true);

create policy "Users can create comments" on "public"."request_comment" for insert to "authenticated"
with check ("commenter_uid" = "auth"."uid" ());

create policy "Users can update own comments" on "public"."request_comment" for update to "authenticated"
using ("commenter_uid" = "auth"."uid" ());

create policy "Users can delete own comments" on "public"."request_comment" for delete to "authenticated"
using ("commenter_uid" = "auth"."uid" ());

create policy "Users can create upvotes" on "public"."comment_upvote" for insert to "authenticated"
with check ("uid" = "auth"."uid" ());

create policy "Users can delete own upvotes" on "public"."comment_upvote" for delete to "authenticated"
using ("uid" = "auth"."uid" ());

-- 4. Grants
grant select on table "public"."request_comment" to "anon";
grant select on table "public"."request_comment" to "authenticated";

grant select on table "public"."comment_phrase" to "anon";
grant select on table "public"."comment_phrase" to "authenticated";

grant select on table "public"."comment_upvote" to "anon";
grant select on table "public"."comment_upvote" to "authenticated";

-- 5. RPC Functions

-- Create comment with phrases
create or replace function "public"."create_comment_with_phrases" (
	"p_request_id" "uuid",
	"p_content" "text",
	"p_parent_comment_id" "uuid" default null,
	"p_phrase_ids" "uuid"[] default array[]::uuid[]
) returns json language "plpgsql" as $$
DECLARE
  v_comment_id uuid;
  v_new_comment request_comment;
  v_phrase_id uuid;
BEGIN
  -- Validate that either content or phrases are provided
  IF (p_content IS NULL OR trim(p_content) = '') AND (p_phrase_ids IS NULL OR array_length(p_phrase_ids, 1) IS NULL) THEN
    RAISE EXCEPTION 'Comment must have either content or attached phrases';
  END IF;

  -- Insert the comment (works for both top-level and replies)
  INSERT INTO request_comment (request_id, parent_comment_id, commenter_uid, content)
  VALUES (p_request_id, p_parent_comment_id, auth.uid(), p_content)
  RETURNING * INTO v_new_comment;

  v_comment_id := v_new_comment.id;

  -- Link phrases to comment (max 4)
  IF p_phrase_ids IS NOT NULL AND array_length(p_phrase_ids, 1) > 0 THEN
    IF array_length(p_phrase_ids, 1) > 4 THEN
      RAISE EXCEPTION 'Cannot attach more than 4 phrases to a comment';
    END IF;

    FOREACH v_phrase_id IN ARRAY p_phrase_ids
    LOOP
      INSERT INTO comment_phrase (request_id, comment_id, phrase_id)
      VALUES (p_request_id, v_comment_id, v_phrase_id);
    END LOOP;
  END IF;

  -- Return the comment
  RETURN row_to_json(v_new_comment);
END;
$$;

-- Toggle comment upvote
create or replace function "public"."toggle_comment_upvote" (
	"p_comment_id" "uuid"
) returns json language "plpgsql" as $$
DECLARE
  v_user_uid uuid := auth.uid();
  v_upvote_exists boolean;
  v_new_count integer;
BEGIN
  -- Check if upvote exists
  SELECT EXISTS(
    SELECT 1 FROM comment_upvote
    WHERE comment_id = p_comment_id AND uid = v_user_uid
  ) INTO v_upvote_exists;

  IF v_upvote_exists THEN
    -- Remove upvote
    DELETE FROM comment_upvote
    WHERE comment_id = p_comment_id AND uid = v_user_uid;

    -- Decrement count
    UPDATE request_comment
    SET upvote_count = upvote_count - 1
    WHERE id = p_comment_id
    RETURNING upvote_count INTO v_new_count;
  ELSE
    -- Add upvote
    INSERT INTO comment_upvote (comment_id, uid)
    VALUES (p_comment_id, v_user_uid);

    -- Increment count
    UPDATE request_comment
    SET upvote_count = upvote_count + 1
    WHERE id = p_comment_id
    RETURNING upvote_count INTO v_new_count;
  END IF;

  RETURN json_build_object(
    'comment_id', p_comment_id,
    'is_upvoted', NOT v_upvote_exists,
    'upvote_count', v_new_count
  );
END;
$$;

-- Update comment
create or replace function "public"."update_comment" (
	"p_comment_id" "uuid",
	"p_content" "text"
) returns json language "plpgsql" as $$
DECLARE
  v_updated_comment request_comment;
BEGIN
  UPDATE request_comment
  SET content = p_content, updated_at = now()
  WHERE id = p_comment_id AND commenter_uid = auth.uid()
  RETURNING * INTO v_updated_comment;

  IF v_updated_comment.id IS NULL THEN
    RAISE EXCEPTION 'Comment not found or user not authorized to update.';
  END IF;

  RETURN row_to_json(v_updated_comment);
END;
$$;

-- Delete comment
create or replace function "public"."delete_comment" (
	"p_comment_id" "uuid"
) returns void language "plpgsql" as $$
BEGIN
  DELETE FROM request_comment
  WHERE id = p_comment_id AND commenter_uid = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comment not found or user not authorized to delete.';
  END IF;
END;
$$;

-- 6. Drop and recreate views that depend on phrase.request_id

-- Drop meta_phrase_request (depends on meta_phrase_info)
drop view if exists "public"."meta_phrase_request";

-- Drop meta_phrase_info (depends on phrase.request_id)
drop view if exists "public"."meta_phrase_info";

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
			"p"."lang",
			"p"."text",
			"avg" ("c"."difficulty") as "avg_difficulty",
			"jsonb_build_object" (
				'uid',
				"pp"."uid",
				'username',
				"pp"."username",
				'avatar_path',
				"pp"."avatar_path"
			) as "added_by_profile",
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
					left join "public"."public_profile" "pp" on (("p"."added_by" = "pp"."uid"))
				)
				left join "public"."tag" "t" on (("t"."id" = "pt"."tag_id"))
			)
		group by
			"pp"."uid",
			"pp"."username",
			"pp"."avatar_path",
			"p"."id",
			"p"."lang",
			"p"."text",
			"p"."created_at",
			"p"."added_by"
	)
select
	"results"."id",
	"results"."added_by",
	"results"."created_at",
	"results"."lang",
	"results"."text",
	"results"."added_by_profile",
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

-- 7. Migrate existing data --
-- Create comments for existing phrases with request_id
INSERT INTO request_comment (request_id, parent_comment_id, commenter_uid, content, created_at, upvote_count)
SELECT DISTINCT
  p.request_id,
  NULL::uuid, -- top-level comment
  p.added_by,
  '', -- empty content
  MIN(p.created_at), -- use earliest phrase's timestamp
  0 -- initial upvote count
FROM phrase p
WHERE p.request_id IS NOT NULL
GROUP BY p.request_id, p.added_by;

-- Link phrases to their comments via comment_phrase
INSERT INTO comment_phrase (request_id, comment_id, phrase_id, created_at)
SELECT
  c.request_id,
  c.id,
  p.id,
  p.created_at
FROM phrase p
JOIN request_comment c ON c.request_id = p.request_id AND c.commenter_uid = p.added_by
WHERE p.request_id IS NOT NULL;

-- Drop the old column and constraint
ALTER TABLE phrase DROP CONSTRAINT IF EXISTS phrase_request_id_fkey;
ALTER TABLE phrase DROP COLUMN IF EXISTS request_id;

-- 8. Recreate meta_phrase_request view to return phrase IDs instead of full objects
create or replace view
	"public"."meta_phrase_request" as
select
	"pr"."id",
	"pr"."created_at",
	"pr"."requester_uid",
	"pr"."lang",
	"pr"."prompt",
	"pr"."status",
	"pr"."fulfilled_at",
	"jsonb_build_object" (
		'uid',
		"pp"."uid",
		'username',
		"pp"."username",
		'avatar_path',
		"pp"."avatar_path"
	) as "profile",
	(
		select array_agg(distinct cp.phrase_id)
		from comment_phrase cp
		where cp.request_id = pr.id
	) as "phrase_ids"
from
	"public"."phrase_request" "pr"
	left join "public"."user_profile" "pp" on ("pr"."requester_uid" = "pp"."uid");
