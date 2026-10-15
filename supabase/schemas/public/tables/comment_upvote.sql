CREATE TABLE "public"."comment_upvote" (
  "comment_id" uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "deleted"    boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "comment_upvote_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES public.request_comment(id) ON DELETE CASCADE,
  "uid"        uuid                     NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "comment_upvote_pkey" PRIMARY KEY (comment_id, uid),
  CONSTRAINT "comment_upvote_uid_fkey" FOREIGN KEY (uid) REFERENCES public.user_profile(uid) ON DELETE CASCADE
);

ALTER TABLE "public"."comment_upvote"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_upvote_comment ON public.comment_upvote USING btree (comment_id);

CREATE TRIGGER guard_comment_upvote_update
  BEFORE UPDATE ON public.comment_upvote
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_soft_delete_only();

CREATE TRIGGER on_comment_upvote_changed
  AFTER INSERT OR DELETE OR UPDATE ON public.comment_upvote
  FOR EACH ROW
  EXECUTE FUNCTION public.update_comment_upvote_count();

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."comment_upvote" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."comment_upvote" TO "service_role";

ALTER TABLE "public"."comment_upvote"
  ADD CONSTRAINT "unique_user_comment_upvote" UNIQUE (comment_id, uid);

CREATE INDEX idx_upvote_user ON public.comment_upvote USING btree (uid);

CREATE POLICY "Enable users to view their own data only" ON "public"."comment_upvote"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = uid));

CREATE POLICY "Users can create upvotes" ON "public"."comment_upvote"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((uid = auth.uid()));

CREATE POLICY "Users can delete own upvotes" ON "public"."comment_upvote"
  FOR DELETE
  TO "authenticated"
  USING ((uid = auth.uid()));

CREATE POLICY "Users can update own upvotes" ON "public"."comment_upvote"
  FOR UPDATE
  TO "authenticated"
  USING ((uid = auth.uid()))
  WITH CHECK ((uid = auth.uid()));

REVOKE ALL ON TABLE "public"."comment_upvote" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."comment_upvote" TO "postgres";
