CREATE TABLE "public"."user_review_session" (
  "lang"        character varying        NOT NULL,
  "day_session" date                     NOT NULL,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "manifest"    jsonb,
  "uid"         uuid                     NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "user_review_session_lang_uid_fkey" FOREIGN KEY (lang, uid) REFERENCES public.user_deck(lang, uid) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "user_review_session_pkey" PRIMARY KEY (lang, uid, day_session)
);

ALTER TABLE "public"."user_review_session"
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_review_session" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_review_session" TO "service_role";

CREATE POLICY "Enable insert for authenticated users only" ON "public"."user_review_session"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((uid = auth.uid()));

CREATE POLICY "Enable users to update their own data" ON "public"."user_review_session"
  FOR UPDATE
  TO "authenticated"
  USING ((uid = auth.uid()));

CREATE POLICY "Enable users to view their own data only" ON "public"."user_review_session"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = uid));

REVOKE ALL ON TABLE "public"."user_review_session" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_review_session" TO "postgres";
