CREATE TABLE "public"."phrase_translation" (
  "text"        text                     NOT NULL,
  "literal"     text,
  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "phrase_id"   uuid                     NOT NULL,
  "lang"        character varying        NOT NULL,
  "text_script" text,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "archived"    boolean                  NOT NULL DEFAULT false,
  "updated_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "card_translation_pkey" PRIMARY KEY (id),
  CONSTRAINT "phrase_translation_lang_fkey" FOREIGN KEY (lang) REFERENCES public.language(lang),
  CONSTRAINT "phrase_translation_phrase_id_fkey" FOREIGN KEY (phrase_id) REFERENCES public.phrase(id) ON DELETE CASCADE,
  "added_by"    uuid                     NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "phrase_translation_added_by_fkey" FOREIGN KEY (added_by) REFERENCES public.user_profile(uid) ON DELETE SET NULL
);

ALTER TABLE "public"."phrase_translation"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."phrase_translation"
  ADD CONSTRAINT "card_translation_uuid_key" UNIQUE (id);

CREATE UNIQUE INDEX unique_text_phrase_lang ON public.phrase_translation USING btree (text, lang, phrase_id);

CREATE TRIGGER embed_corpus_on_translation_change
  AFTER INSERT OR DELETE OR UPDATE OF text, lang, archived, phrase_id ON public.phrase_translation
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notify_corpus_embed_change('translation');

CREATE TRIGGER refresh_text_index_on_translation_change
  AFTER INSERT OR DELETE OR UPDATE OF text, lang, archived, phrase_id ON public.phrase_translation
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_refresh_search_text_index();

CREATE TRIGGER trg_notify_on_translation
  AFTER INSERT ON public.phrase_translation
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_translation();

CREATE TRIGGER trigger_update_phrase_translation_updated_at
  BEFORE UPDATE ON public.phrase_translation
  FOR EACH ROW
  EXECUTE FUNCTION public.update_phrase_translation_updated_at();

CREATE POLICY "Admins can update translations" ON "public"."phrase_translation"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_translation" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_translation" TO "service_role";

CREATE POLICY "Authenticated users can add translations" ON "public"."phrase_translation"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = added_by));

CREATE POLICY "Enable read access for all users" ON "public"."phrase_translation"
  FOR SELECT
  TO PUBLIC
  USING (
CASE
    WHEN (NOT archived) THEN true
    WHEN (added_by = ( SELECT auth.uid() AS uid)) THEN true
    ELSE public.is_admin()
END);

CREATE POLICY "Users can update their own translations" ON "public"."phrase_translation"
  FOR UPDATE
  TO "authenticated"
  USING ((added_by = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((added_by = ( SELECT auth.uid() AS uid)));

COMMENT ON COLUMN "public"."phrase_translation"."lang" IS 'The 3-letter code for the language (iso-369-3)';

COMMENT ON TABLE "public"."phrase_translation" IS 'A translation of one phrase into another language';

COMMENT ON COLUMN "public"."phrase_translation"."added_by" IS 'User who added this translation';

REVOKE ALL ON TABLE "public"."phrase_translation" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_translation" TO "postgres";
