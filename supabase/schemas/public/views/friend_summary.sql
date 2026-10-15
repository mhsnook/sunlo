CREATE VIEW "public"."friend_summary" WITH (security_invoker=true) AS  SELECT DISTINCT ON (a.uid_less, a.uid_more) a.uid_less,
    a.uid_more,
        CASE
            WHEN (a.action_type = 'accept'::public.friend_request_response) THEN 'friends'::text
            WHEN (a.action_type = 'invite'::public.friend_request_response) THEN 'pending'::text
            WHEN (a.action_type = ANY (ARRAY['decline'::public.friend_request_response, 'cancel'::public.friend_request_response, 'remove'::public.friend_request_response])) THEN 'unconnected'::text
            ELSE NULL::text
        END AS status,
    a.created_at AS most_recent_created_at,
    a.uid_by AS most_recent_uid_by,
    a.uid_for AS most_recent_uid_for,
    a.action_type AS most_recent_action_type,
        CASE
            WHEN (a.uid_by = auth.uid()) THEN a.uid_for
            ELSE a.uid_by
        END AS uid
   FROM public.friend_request_action a
  ORDER BY a.uid_less, a.uid_more, a.created_at DESC;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."friend_summary" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."friend_summary" TO "service_role";

REVOKE ALL ON TABLE "public"."friend_summary" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."friend_summary" TO "postgres";
