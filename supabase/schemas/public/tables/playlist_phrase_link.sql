CREATE TABLE "public"."playlist_phrase_link" (
  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "phrase_id"   uuid                     NOT NULL,
  "playlist_id" uuid                     NOT NULL,
  "order"       double precision,
  "href"        text,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "deleted"     boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "playlist_phrase_link_phrase_id_fkey" FOREIGN KEY (phrase_id) REFERENCES public.phrase(id) ON DELETE CASCADE,
  CONSTRAINT "playlist_phrase_link_pkey" PRIMARY KEY (id),
  CONSTRAINT "playlist_phrase_link_playlist_id_fkey" FOREIGN KEY (playlist_id) REFERENCES public.phrase_playlist(id) ON DELETE CASCADE,
  "uid"         uuid                     NOT NULL DEFAULT auth.uid()
);

ALTER TABLE "public"."playlist_phrase_link"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX playlist_phrase_link_phrase_id_idx ON public.playlist_phrase_link USING btree (phrase_id);

CREATE INDEX playlist_phrase_link_playlist_id_idx ON public.playlist_phrase_link USING btree (playlist_id);

CREATE TRIGGER on_playlist_phrase_link_changed
  AFTER INSERT OR DELETE ON public.playlist_phrase_link
  FOR EACH ROW
  EXECUTE FUNCTION public.update_parent_playlist_timestamp();

CREATE TRIGGER on_playlist_phrase_link_updated
  AFTER UPDATE ON public.playlist_phrase_link
  FOR EACH ROW
  EXECUTE FUNCTION public.update_parent_playlist_timestamp();

CREATE POLICY "Enable read access for all users" ON "public"."playlist_phrase_link"
  FOR SELECT
  TO PUBLIC
  USING (true);

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."playlist_phrase_link" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."playlist_phrase_link" TO "service_role";

CREATE POLICY "Enable delete for users based on uid" ON "public"."playlist_phrase_link"
  FOR DELETE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = uid));

CREATE POLICY "Enable insert for users based on uid" ON "public"."playlist_phrase_link"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = uid));

CREATE POLICY "Enable update for users based on uid" ON "public"."playlist_phrase_link"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = uid))
  WITH CHECK ((( SELECT auth.uid() AS uid) = uid));

REVOKE ALL ON TABLE "public"."playlist_phrase_link" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."playlist_phrase_link" TO "postgres";
