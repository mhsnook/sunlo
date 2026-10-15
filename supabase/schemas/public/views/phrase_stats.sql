CREATE VIEW "public"."phrase_stats" AS  WITH latest_reviews AS (
         SELECT DISTINCT ON (rev.uid, rev.phrase_id) rev.uid,
            rev.phrase_id,
            rev.difficulty,
            rev.stability
           FROM public.user_card_review rev
          WHERE (rev.stage = ANY (ARRAY[1, 2]))
          ORDER BY rev.uid, rev.phrase_id, rev.created_at DESC
        )
 SELECT card.phrase_id,
    count(*) AS count_learners,
    avg(lr.difficulty) AS avg_difficulty,
    avg(lr.stability) AS avg_stability
   FROM (public.user_card card
     LEFT JOIN latest_reviews lr ON (((lr.phrase_id = card.phrase_id) AND (lr.uid = card.uid))))
  WHERE (card.status = ANY (ARRAY['active'::public.card_status, 'learned'::public.card_status]))
  GROUP BY card.phrase_id;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_stats" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_stats" TO "service_role";

REVOKE ALL ON TABLE "public"."phrase_stats" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_stats" TO "postgres";
