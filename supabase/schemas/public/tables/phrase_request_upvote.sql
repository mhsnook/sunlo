CREATE TABLE "public"."phrase_request_upvote" (
  "request_id" uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "deleted"    boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "phrase_request_upvote_request_id_fkey" FOREIGN KEY (request_id) REFERENCES public.phrase_request(id) ON DELETE CASCADE,
  "uid"        uuid                     NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "phrase_request_upvote_pkey" PRIMARY KEY (request_id, uid),
  CONSTRAINT "phrase_request_upvote_uid_fkey" FOREIGN KEY (uid) REFERENCES public.user_profile(uid) ON DELETE CASCADE
);

ALTER TABLE "public"."phrase_request_upvote"
  ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER guard_phrase_request_upvote_update
  BEFORE UPDATE ON public.phrase_request_upvote
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_soft_delete_only();

CREATE TRIGGER on_phrase_request_upvote_changed
  AFTER INSERT OR DELETE OR UPDATE ON public.phrase_request_upvote
  FOR EACH ROW
  EXECUTE FUNCTION public.update_phrase_request_upvote_count();

CREATE TRIGGER trg_notify_on_request_reupvote
  AFTER UPDATE ON public.phrase_request_upvote
  FOR EACH ROW
  WHEN (((old.deleted = true) AND (new.deleted = false)))
  EXECUTE FUNCTION public.notify_on_request_upvote();

CREATE TRIGGER trg_notify_on_request_upvote
  AFTER INSERT ON public.phrase_request_upvote
  FOR EACH ROW
  WHEN ((new.deleted = false))
  EXECUTE FUNCTION public.notify_on_request_upvote();

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_request_upvote" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_request_upvote" TO "service_role";

CREATE POLICY "Enable users to view their own upvotes" ON "public"."phrase_request_upvote"
  FOR SELECT
  TO "authenticated"
  USING ((uid = auth.uid()));

CREATE POLICY "Users can create upvotes" ON "public"."phrase_request_upvote"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((uid = auth.uid()));

CREATE POLICY "Users can delete own upvotes" ON "public"."phrase_request_upvote"
  FOR DELETE
  TO "authenticated"
  USING ((uid = auth.uid()));

CREATE POLICY "Users can update own upvotes" ON "public"."phrase_request_upvote"
  FOR UPDATE
  TO "authenticated"
  USING ((uid = auth.uid()))
  WITH CHECK ((uid = auth.uid()));

REVOKE ALL ON TABLE "public"."phrase_request_upvote" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_request_upvote" TO "postgres";
