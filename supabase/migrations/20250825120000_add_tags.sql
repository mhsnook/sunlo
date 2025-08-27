create table if not exists
	"public"."tag" (
		"id" "uuid" default "gen_random_uuid" () not null,
		"created_at" timestamp with time zone default "now" () not null,
		"name" "text" not null,
		"lang" character varying not null,
		"added_by" "uuid" default "auth"."uid" ()
	);

alter table "public"."tag" owner to "postgres";

alter table only "public"."tag"
add constraint "tag_pkey" primary key ("id");

alter table only "public"."tag"
add constraint "tag_name_lang_key" unique ("name", "lang");

alter table only "public"."tag"
add constraint "tag_added_by_fkey" foreign key ("added_by") references "public"."user_profile" ("uid") on delete set null;

alter table only "public"."tag"
add constraint "tag_lang_fkey" foreign key ("lang") references "public"."language" ("lang") on update cascade on delete cascade;

alter table "public"."tag" enable row level security;

create policy "Enable read access for all users" on "public"."tag" for
select
	using (true);

create policy "Users can insert tags" on "public"."tag" for insert
with
	check (("auth"."role" () = 'authenticated'::"text"));

grant all on table "public"."tag" to "anon";

grant all on table "public"."tag" to "authenticated";

grant all on table "public"."tag" to "service_role";

create table if not exists
	"public"."phrase_tag" (
		"phrase_id" "uuid" not null,
		"tag_id" "uuid" not null,
		"created_at" timestamp with time zone default "now" () not null,
		"added_by" "uuid" default "auth"."uid" ()
	);

alter table "public"."phrase_tag" owner to "postgres";

alter table only "public"."phrase_tag"
add constraint "phrase_tag_pkey" primary key ("phrase_id", "tag_id");

alter table only "public"."phrase_tag"
add constraint "phrase_tag_phrase_id_fkey" foreign key ("phrase_id") references "public"."phrase" ("id") on delete cascade;

alter table only "public"."phrase_tag"
add constraint "phrase_tag_tag_id_fkey" foreign key ("tag_id") references "public"."tag" ("id") on delete cascade;

alter table only "public"."phrase_tag"
add constraint "phrase_tag_added_by_fkey" foreign key ("added_by") references "public"."user_profile" ("uid") on delete set null;

alter table "public"."phrase_tag" enable row level security;

create policy "Enable read access for all users" on "public"."phrase_tag" for
select
	using (true);

create policy "Users can link tags to phrases" on "public"."phrase_tag" for insert
with
	check (("auth"."role" () = 'authenticated'::"text"));

grant all on table "public"."phrase_tag" to "anon";

grant all on table "public"."phrase_tag" to "authenticated";

grant all on table "public"."phrase_tag" to "service_role";

create
or replace function "public"."add_tags_to_phrase" (
	"p_phrase_id" "uuid",
	"p_lang" character varying,
	"p_tags" "text" []
) returns "void" language "plpgsql" as $body$
DECLARE
    tag_name text;
    v_tag_id uuid;
BEGIN
    FOREACH tag_name IN ARRAY p_tags
    LOOP
        -- Upsert tag and get its ID, avoiding RLS issues with ON CONFLICT DO UPDATE
        WITH new_tag AS (
            INSERT INTO public.tag (name, lang, added_by)
            VALUES (tag_name, p_lang, auth.uid())
            ON CONFLICT (name, lang) DO NOTHING
            RETURNING id
        )
        SELECT id INTO v_tag_id FROM new_tag;

        -- If the insert did nothing (because the tag already existed), select the existing tag's ID.
        IF v_tag_id IS NULL THEN
            SELECT id INTO v_tag_id FROM public.tag WHERE name = tag_name AND lang = p_lang;
        END IF;

        -- Associate tag with phrase
        INSERT INTO public.phrase_tag (phrase_id, tag_id, added_by)
        VALUES (p_phrase_id, v_tag_id, auth.uid())
        ON CONFLICT (phrase_id, tag_id) DO NOTHING;
    END LOOP;
END;
$body$;

alter function "public"."add_tags_to_phrase" (
	"p_phrase_id" "uuid",
	"p_lang" character varying,
	"p_tags" "text" []
) owner to "postgres";

grant all on function "public"."add_tags_to_phrase" (
	"p_phrase_id" "uuid",
	"p_lang" character varying,
	"p_tags" "text" []
) to "authenticated";

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
			"r1"."created_at",
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
			"r"."created_at" as "recentest_review_at"
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
			"p"."text"
	)
select
	"results"."id",
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