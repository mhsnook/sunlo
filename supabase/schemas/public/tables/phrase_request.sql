CREATE TABLE "public"."phrase_request" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "requester_uid" uuid                     NOT NULL,
  "lang"          character varying        NOT NULL,
  "prompt"        text                     NOT NULL,
  "upvote_count"  integer                  NOT NULL DEFAULT 0,
  "deleted"       boolean                  NOT NULL DEFAULT false,
  "updated_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "phrase_request_lang_fkey" FOREIGN KEY (lang) REFERENCES public.language(lang) ON DELETE CASCADE,
  CONSTRAINT "phrase_request_pkey" PRIMARY KEY (id),
  CONSTRAINT "phrase_request_requester_uid_fkey" FOREIGN KEY (requester_uid) REFERENCES public.user_profile(uid) ON DELETE CASCADE
);

ALTER TABLE "public"."phrase_request"
  ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER embed_corpus_on_request_change
  AFTER INSERT OR DELETE OR UPDATE OF prompt, lang, deleted ON public.phrase_request
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notify_corpus_embed_change('request');

CREATE TRIGGER on_phrase_request_auto_upvote
  AFTER INSERT ON public.phrase_request
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_upvote_new_request();

CREATE TRIGGER on_phrase_request_updated
  BEFORE UPDATE ON public.phrase_request
  FOR EACH ROW
  EXECUTE FUNCTION public.update_phrase_request_timestamp();

CREATE TRIGGER refresh_text_index_on_request_change
  AFTER INSERT OR DELETE OR UPDATE OF prompt, lang, deleted ON public.phrase_request
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_refresh_search_text_index();

CREATE POLICY "Admins can update requests" ON "public"."phrase_request"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Enable read access for all users" ON "public"."phrase_request"
  FOR SELECT
  TO PUBLIC
  USING (((deleted = false) OR (requester_uid = auth.uid()) OR public.is_admin()));

CREATE POLICY "Users can create their own requests" ON "public"."phrase_request"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((requester_uid = auth.uid()));

CREATE POLICY "Users can update their own requests" ON "public"."phrase_request"
  FOR UPDATE
  TO "authenticated"
  USING (((requester_uid = auth.uid()) AND (deleted = false)))
  WITH CHECK ((requester_uid = auth.uid()));

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_request" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_request" TO "service_role";

ALTER TABLE "public"."phrase_request"
  ADD COLUMN "message_id" uuid NOT NULL DEFAULT public.create_orphan_message();

ALTER TABLE "public"."phrase_request"
  ADD CONSTRAINT "phrase_request_message_id_fkey" FOREIGN KEY (message_id) REFERENCES public.message(id) ON DELETE RESTRICT;

REVOKE ALL ON TABLE "public"."phrase_request" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_request" TO "postgres";
