CREATE TABLE "public"."request_comment" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "request_id"        uuid                     NOT NULL,
  "parent_comment_id" uuid,
  "content"           text                     NOT NULL,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "upvote_count"      integer                  NOT NULL DEFAULT 0,
  "deleted"           boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "request_comment_pkey" PRIMARY KEY (id),
  CONSTRAINT "request_comment_parent_comment_id_fkey" FOREIGN KEY (parent_comment_id) REFERENCES public.request_comment(id) ON DELETE CASCADE,
  CONSTRAINT "request_comment_request_id_fkey" FOREIGN KEY (request_id) REFERENCES public.phrase_request(id) ON DELETE CASCADE,
  "uid"               uuid                     NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "request_comment_uid_fkey" FOREIGN KEY (uid) REFERENCES public.user_profile(uid) ON DELETE CASCADE
);

ALTER TABLE "public"."request_comment"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_comment_created_at ON public.request_comment USING btree (parent_comment_id, created_at);

CREATE INDEX idx_comment_parent ON public.request_comment USING btree (parent_comment_id);

CREATE INDEX idx_comment_request_id ON public.request_comment USING btree (request_id);

CREATE INDEX idx_comment_upvotes ON public.request_comment USING btree (request_id, upvote_count DESC);

CREATE TRIGGER blank_removed_comment
  BEFORE UPDATE ON public.request_comment
  FOR EACH ROW
  WHEN (((old.deleted = false) AND (new.deleted = true)))
  EXECUTE FUNCTION public.blank_removed_comment();

CREATE TRIGGER cascade_soft_delete_comment
  AFTER UPDATE ON public.request_comment
  FOR EACH ROW
  WHEN (((old.deleted = false) AND (new.deleted = true)))
  EXECUTE FUNCTION public.cascade_soft_delete_comment();

CREATE TRIGGER trg_notify_on_comment
  AFTER INSERT ON public.request_comment
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_comment();

CREATE POLICY "Enable read access for all users" ON "public"."request_comment"
  FOR SELECT
  TO PUBLIC
  USING (true);

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."request_comment" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."request_comment" TO "service_role";

CREATE POLICY "Users can create comments" ON "public"."request_comment"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((uid = auth.uid()));

CREATE POLICY "Users can delete own comments" ON "public"."request_comment"
  FOR DELETE
  TO "authenticated"
  USING ((uid = auth.uid()));

CREATE POLICY "Users can update own comments" ON "public"."request_comment"
  FOR UPDATE
  TO "authenticated"
  USING ((uid = auth.uid()))
  WITH CHECK ((uid = auth.uid()));

REVOKE ALL ON TABLE "public"."request_comment" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."request_comment" TO "postgres";
