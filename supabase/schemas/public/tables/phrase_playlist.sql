CREATE TABLE "public"."phrase_playlist" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "title"            text                     NOT NULL,
  "description"      text,
  "href"             text,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "lang"             character varying        NOT NULL,
  "upvote_count"     integer                  NOT NULL DEFAULT 0,
  "deleted"          boolean                  NOT NULL DEFAULT false,
  "updated_at"       timestamp with time zone DEFAULT now(),
  "cover_image_path" text,
  CONSTRAINT "phrase_playlist_lang_fkey" FOREIGN KEY (lang) REFERENCES public.language(lang) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "phrase_playlist_pkey" PRIMARY KEY (id),
  "uid"              uuid                     NOT NULL DEFAULT auth.uid()
);

ALTER TABLE "public"."phrase_playlist"
  ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER embed_corpus_on_playlist_change
  AFTER INSERT OR DELETE OR UPDATE OF title, description, lang, deleted ON public.phrase_playlist
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notify_corpus_embed_change('playlist');

CREATE TRIGGER on_phrase_playlist_updated
  BEFORE UPDATE ON public.phrase_playlist
  FOR EACH ROW
  EXECUTE FUNCTION public.update_phrase_playlist_timestamp();

CREATE TRIGGER refresh_text_index_on_playlist_change
  AFTER INSERT OR DELETE OR UPDATE OF title, description, lang, deleted ON public.phrase_playlist
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_refresh_search_text_index();

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_playlist" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_playlist" TO "service_role";

CREATE INDEX phrase_playlist_uid_idx ON public.phrase_playlist USING btree (uid);

CREATE POLICY "Enable delete for users based on uid" ON "public"."phrase_playlist"
  FOR DELETE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = uid));

CREATE POLICY "Enable insert for users based on uid" ON "public"."phrase_playlist"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = uid));

CREATE POLICY "Enable read access for all users" ON "public"."phrase_playlist"
  FOR SELECT
  TO PUBLIC
  USING (((deleted = false) OR (uid = auth.uid()) OR public.is_admin()));

CREATE POLICY "Users can update their own playlists" ON "public"."phrase_playlist"
  FOR UPDATE
  TO "authenticated"
  USING (((uid = auth.uid()) AND (deleted = false)))
  WITH CHECK ((uid = auth.uid()));

REVOKE ALL ON TABLE "public"."phrase_playlist" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_playlist" TO "postgres";
