CREATE VIEW "public"."phrase_meta" WITH (security_invoker=true) AS  WITH tags AS (
         SELECT pt.phrase_id AS t_phrase_id,
            (json_agg(DISTINCT jsonb_build_object('id', tag.id, 'name', tag.name)) FILTER (WHERE (tag.id IS NOT NULL)))::jsonb AS tags
           FROM (public.phrase_tag pt
             LEFT JOIN public.tag tag ON ((tag.id = pt.tag_id)))
          WHERE (pt.deleted = false)
          GROUP BY pt.phrase_id
        )
 SELECT phrase.id,
    phrase.lang,
    phrase.text,
    phrase.created_at,
    phrase.added_by,
    phrase.only_reverse,
    phrase.archived,
    COALESCE(stats.count_learners, (0)::bigint) AS count_learners,
    stats.avg_difficulty,
    stats.avg_stability,
    COALESCE(tags.tags, '[]'::jsonb) AS tags,
    phrase.updated_at
   FROM ((public.phrase phrase
     LEFT JOIN public.phrase_stats stats ON ((stats.phrase_id = phrase.id)))
     LEFT JOIN tags ON ((tags.t_phrase_id = phrase.id)));

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_meta" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_meta" TO "service_role";

REVOKE ALL ON TABLE "public"."phrase_meta" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_meta" TO "postgres";
