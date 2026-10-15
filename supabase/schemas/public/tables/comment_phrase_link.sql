CREATE TABLE "public"."comment_phrase_link" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "request_id" uuid                     NOT NULL,
  "comment_id" uuid                     NOT NULL,
  "phrase_id"  uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "deleted"    boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "comment_phrase_link_pkey" PRIMARY KEY (id),
  CONSTRAINT "comment_phrase_link_phrase_id_fkey" FOREIGN KEY (phrase_id) REFERENCES public.phrase(id) ON DELETE CASCADE,
  CONSTRAINT "comment_phrase_link_request_id_fkey" FOREIGN KEY (request_id) REFERENCES public.phrase_request(id) ON DELETE CASCADE,
  CONSTRAINT "comment_phrase_link_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES public.request_comment(id) ON DELETE CASCADE,
  "uid"        uuid                     NOT NULL DEFAULT auth.uid()
);

ALTER TABLE "public"."comment_phrase_link"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_comment_phrase_link_comment ON public.comment_phrase_link USING btree (comment_id);

CREATE INDEX idx_comment_phrase_link_phrase ON public.comment_phrase_link USING btree (phrase_id);

CREATE INDEX idx_comment_phrase_link_request ON public.comment_phrase_link USING btree (request_id);

CREATE TRIGGER guard_comment_phrase_link_update
  BEFORE UPDATE ON public.comment_phrase_link
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_soft_delete_only();

CREATE TRIGGER trg_notify_on_phrase_reference
  AFTER INSERT ON public.comment_phrase_link
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_phrase_reference();

CREATE POLICY "Enable read access for all users" ON "public"."comment_phrase_link"
  FOR SELECT
  TO PUBLIC
  USING (true);

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."comment_phrase_link" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."comment_phrase_link" TO "service_role";

CREATE POLICY "Users can delete phrase links for their own comments" ON "public"."comment_phrase_link"
  FOR DELETE
  TO "authenticated"
  USING ((uid = auth.uid()));

CREATE POLICY "Users can soft-delete phrase links for their own comments" ON "public"."comment_phrase_link"
  FOR UPDATE
  TO "authenticated"
  USING ((uid = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((uid = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Users can insert phrase links for their own comments" ON "public"."comment_phrase_link"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((uid = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.request_comment
  WHERE ((request_comment.id = comment_phrase_link.comment_id) AND (request_comment.uid = auth.uid()))))));

REVOKE ALL ON TABLE "public"."comment_phrase_link" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."comment_phrase_link" TO "postgres";
