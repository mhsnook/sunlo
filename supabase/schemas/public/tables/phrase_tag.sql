CREATE TABLE "public"."phrase_tag" (
  "phrase_id"  uuid                     NOT NULL,
  "tag_id"     uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "deleted"    boolean                  NOT NULL DEFAULT false,
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT "phrase_tag_phrase_id_fkey" FOREIGN KEY (phrase_id) REFERENCES public.phrase(id) ON DELETE CASCADE,
  CONSTRAINT "phrase_tag_pkey" PRIMARY KEY (id),
  CONSTRAINT "phrase_tag_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES public.tag(id) ON DELETE CASCADE,
  "added_by"   uuid                     NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "phrase_tag_added_by_fkey" FOREIGN KEY (added_by) REFERENCES public.user_profile(uid) ON DELETE SET NULL
);

ALTER TABLE "public"."phrase_tag"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX phrase_tag_phrase_id_idx ON public.phrase_tag USING btree (phrase_id);

CREATE UNIQUE INDEX phrase_tag_phrase_id_tag_id_live_idx ON public.phrase_tag USING btree (phrase_id, tag_id)
  WHERE (deleted = false);

CREATE TRIGGER embed_corpus_on_tag_change
  AFTER INSERT OR DELETE OR UPDATE OF deleted ON public.phrase_tag
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notify_corpus_embed_change('phrase');

CREATE TRIGGER guard_phrase_tag_update
  BEFORE UPDATE ON public.phrase_tag
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_soft_delete_only();

CREATE TRIGGER refresh_text_index_on_tag_change
  AFTER INSERT OR DELETE OR UPDATE OF deleted ON public.phrase_tag
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_refresh_search_text_index();

CREATE POLICY "Admins can delete phrase tags" ON "public"."phrase_tag"
  FOR DELETE
  TO "authenticated"
  USING (public.is_admin());

CREATE POLICY "Enable read access for all users" ON "public"."phrase_tag"
  FOR SELECT
  TO PUBLIC
  USING (true);

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_tag" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_tag" TO "service_role";

CREATE POLICY "Authenticated users can link tags to phrases" ON "public"."phrase_tag"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = added_by));

CREATE POLICY "Taggers and admins can soft-delete phrase tags" ON "public"."phrase_tag"
  FOR UPDATE
  TO "authenticated"
  USING (((added_by = ( SELECT auth.uid() AS uid)) OR public.is_admin()))
  WITH CHECK (((added_by = ( SELECT auth.uid() AS uid)) OR public.is_admin()));

REVOKE ALL ON TABLE "public"."phrase_tag" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_tag" TO "postgres";
