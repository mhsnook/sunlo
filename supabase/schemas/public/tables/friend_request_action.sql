CREATE TABLE "public"."friend_request_action" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "uid_by"     uuid                     NOT NULL,
  "uid_for"    uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "uid_less"   uuid,
  "uid_more"   uuid,
  CONSTRAINT "friend_request_action_pkey" PRIMARY KEY (id),
  CONSTRAINT "friend_request_action_uid_by_fkey" FOREIGN KEY (uid_by) REFERENCES public.user_profile(uid) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "friend_request_action_uid_for_fkey" FOREIGN KEY (uid_for) REFERENCES public.user_profile(uid) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "friend_request_action_uid_less_fkey" FOREIGN KEY (uid_less) REFERENCES public.user_profile(uid) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "friend_request_action_uid_more_fkey" FOREIGN KEY (uid_more) REFERENCES public.user_profile(uid) ON UPDATE CASCADE ON DELETE CASCADE
);

ALTER TABLE "public"."friend_request_action"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."friend_request_action"
  ADD COLUMN "action_type" public.friend_request_response;

CREATE TRIGGER trigger_validate_friend_request_action
  BEFORE INSERT ON public.friend_request_action
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_friend_request_action();

CREATE POLICY "Enable users to view their own data only" ON "public"."friend_request_action"
  FOR SELECT
  TO "authenticated"
  USING (((( SELECT auth.uid() AS uid) = uid_by) OR (( SELECT auth.uid() AS uid) = uid_for)));

CREATE POLICY "Policy with table joins" ON "public"."friend_request_action"
  FOR INSERT
  TO "authenticated"
  WITH
    CHECK
    (((( SELECT auth.uid() AS uid) = uid_by) AND (((( SELECT auth.uid() AS uid) = uid_less) AND (uid_for = uid_more)) OR ((( SELECT auth.uid() AS uid) = uid_more) AND (uid_for =
    uid_less)))));

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."friend_request_action" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."friend_request_action" TO "service_role";

COMMENT ON COLUMN "public"."friend_request_action"."uid_less" IS 'The lesser of the two UIDs (to prevent cases where B-A duplicates A-B)';

COMMENT ON COLUMN "public"."friend_request_action"."uid_more" IS 'The greater of the two UIDs (to prevent cases where B-A duplicates A-B)';

REVOKE ALL ON TABLE "public"."friend_request_action" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."friend_request_action" TO "postgres";
