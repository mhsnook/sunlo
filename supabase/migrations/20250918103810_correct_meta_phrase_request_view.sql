create or replace view "public"."meta_phrase_request" as  SELECT pr.id,
    pr.created_at,
    pr.requester_uid,
    pr.lang,
    pr.prompt,
    pr.status,
    pr.fulfilled_at,
    jsonb_build_object('uid', pp.uid, 'username', pp.username, 'avatar_path', pp.avatar_path) AS requester,
    jsonb_agg(mpi.*) FILTER (WHERE (mpi.id IS NOT NULL)) AS phrases
   FROM ((phrase_request pr
     LEFT JOIN public_profile pp ON ((pr.requester_uid = pp.uid)))
     LEFT JOIN meta_phrase_info mpi ON ((pr.id = mpi.request_id)))
  GROUP BY pr.id, pr.created_at, pr.requester_uid, pr.lang, pr.prompt, pr.status, pr.fulfilled_at, pp.uid, pp.username, pp.avatar_path;

