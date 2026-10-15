CREATE TABLE "public"."phrase" (
  "text"         text                     NOT NULL,
  "id"           uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "lang"         character varying        NOT NULL,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "text_script"  text,
  "only_reverse" boolean                  NOT NULL DEFAULT false,
  "archived"     boolean                  NOT NULL DEFAULT false,
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "card_phrase_pkey" PRIMARY KEY (id),
  CONSTRAINT "phrase_lang_fkey" FOREIGN KEY (lang) REFERENCES public.language(lang),
  "added_by"     uuid                     NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "phrase_added_by_fkey" FOREIGN KEY (added_by) REFERENCES public.user_profile(uid) ON DELETE SET NULL
);

ALTER TABLE "public"."phrase"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."phrase"
  ADD CONSTRAINT "card_phrase_id_int_key" UNIQUE (id);

CREATE TRIGGER bump_phrase_updated_at
  BEFORE UPDATE ON public.phrase
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_phrase_updated_at();

CREATE TRIGGER embed_corpus_on_phrase_change
  AFTER INSERT OR DELETE OR UPDATE OF text, lang, archived ON public.phrase
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notify_corpus_embed_change('phrase');

CREATE TRIGGER refresh_meta_language_on_phrase_change
  AFTER INSERT OR DELETE ON public.phrase
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_refresh_meta_language();

CREATE TRIGGER refresh_text_index_on_phrase_change
  AFTER INSERT OR DELETE OR UPDATE OF text, lang, archived ON public.phrase
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_refresh_search_text_index();

CREATE POLICY "Admins can update phrases" ON "public"."phrase"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Enable read access for all users" ON "public"."phrase"
  FOR SELECT
  TO PUBLIC
  USING (
CASE
    WHEN (NOT archived) THEN true
    ELSE public.is_admin()
END);

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase" TO "service_role";

CREATE POLICY "Authenticated users can add phrases" ON "public"."phrase"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = added_by));

COMMENT ON COLUMN "public"."phrase"."lang" IS 'The 3-letter code for the language (iso-369-3)';

COMMENT ON COLUMN "public"."phrase"."only_reverse" IS 'When true, this phrase should only be reviewed in reverse direction (translation -> phrase). Useful for phrases like numbers where the target language is obvious but recalling it is the challenge.';

COMMENT ON COLUMN "public"."phrase"."added_by" IS 'User who added this card';

REVOKE ALL ON TABLE "public"."phrase" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase" TO "postgres";
