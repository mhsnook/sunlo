CREATE TABLE "public"."phrase_playlist_upvote" (
  "playlist_id" uuid                     NOT NULL,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "deleted"     boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "phrase_playlist_upvote_playlist_id_fkey" FOREIGN KEY (playlist_id) REFERENCES public.phrase_playlist(id) ON DELETE CASCADE,
  "uid"         uuid                     NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "phrase_playlist_upvote_pkey" PRIMARY KEY (playlist_id, uid),
  CONSTRAINT "phrase_playlist_upvote_uid_fkey" FOREIGN KEY (uid) REFERENCES public.user_profile(uid) ON DELETE CASCADE
);

ALTER TABLE "public"."phrase_playlist_upvote"
  ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER guard_phrase_playlist_upvote_update
  BEFORE UPDATE ON public.phrase_playlist_upvote
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_soft_delete_only();

CREATE TRIGGER on_phrase_playlist_upvote_changed
  AFTER INSERT OR DELETE OR UPDATE ON public.phrase_playlist_upvote
  FOR EACH ROW
  EXECUTE FUNCTION public.update_phrase_playlist_upvote_count();

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_playlist_upvote" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_playlist_upvote" TO "service_role";

CREATE POLICY "Enable users to view their own upvotes" ON "public"."phrase_playlist_upvote"
  FOR SELECT
  TO "authenticated"
  USING ((uid = auth.uid()));

CREATE POLICY "Users can create upvotes" ON "public"."phrase_playlist_upvote"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((uid = auth.uid()));

CREATE POLICY "Users can delete own upvotes" ON "public"."phrase_playlist_upvote"
  FOR DELETE
  TO "authenticated"
  USING ((uid = auth.uid()));

CREATE POLICY "Users can update own upvotes" ON "public"."phrase_playlist_upvote"
  FOR UPDATE
  TO "authenticated"
  USING ((uid = auth.uid()))
  WITH CHECK ((uid = auth.uid()));

REVOKE ALL ON TABLE "public"."phrase_playlist_upvote" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_playlist_upvote" TO "postgres";
