CREATE VIEW "public"."feed_activities" AS  SELECT pr.id,
    'request'::text AS type,
    pr.created_at,
    pr.lang,
    pr.requester_uid AS uid,
    COALESCE(pr.upvote_count, 0) AS popularity,
    jsonb_build_object('prompt', pr.prompt, 'upvote_count', pr.upvote_count) AS payload
   FROM public.phrase_request pr
  WHERE (pr.deleted = false)
UNION ALL
 SELECT pp.id,
    'playlist'::text AS type,
    pp.created_at,
    pp.lang,
    pp.uid,
    COALESCE(pp.upvote_count, 0) AS popularity,
    jsonb_build_object('title', pp.title, 'description', pp.description, 'upvote_count', pp.upvote_count, 'phrase_count', ( SELECT count(*) AS count
           FROM public.playlist_phrase_link
          WHERE ((playlist_phrase_link.playlist_id = pp.id) AND (playlist_phrase_link.deleted = false)))) AS payload
   FROM public.phrase_playlist pp
  WHERE (pp.deleted = false)
UNION ALL
 SELECT DISTINCT ON (p.id) p.id,
    'phrase'::text AS type,
    p.created_at,
    p.lang,
    p.added_by AS uid,
    COALESCE(ps.count_learners, (0)::bigint) AS popularity,
    jsonb_build_object('text', p.text, 'source',
        CASE
            WHEN (cpl.request_id IS NOT NULL) THEN jsonb_build_object('type', 'request', 'id', cpl.request_id, 'comment_id', cpl.comment_id)
            WHEN (ppl.playlist_id IS NOT NULL) THEN jsonb_build_object('type', 'playlist', 'id', ppl.playlist_id, 'title', playlist.title, 'follows', (COALESCE(ps.count_learners, (0)::bigint))::integer)
            ELSE NULL::jsonb
        END) AS payload
   FROM ((((public.phrase p
     LEFT JOIN public.phrase_stats ps ON ((ps.phrase_id = p.id)))
     LEFT JOIN public.comment_phrase_link cpl ON (((p.id = cpl.phrase_id) AND (cpl.deleted = false))))
     LEFT JOIN public.playlist_phrase_link ppl ON (((p.id = ppl.phrase_id) AND (ppl.deleted = false))))
     LEFT JOIN public.phrase_playlist playlist ON ((ppl.playlist_id = playlist.id)))
  WHERE ((p.added_by IS NOT NULL) AND (p.archived = false) AND (cpl.id IS NULL) AND (ppl.id IS NULL));

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."feed_activities" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."feed_activities" TO "service_role";

REVOKE ALL ON TABLE "public"."feed_activities" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."feed_activities" TO "postgres";
