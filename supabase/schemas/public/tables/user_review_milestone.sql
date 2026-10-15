CREATE TABLE "public"."user_review_milestone" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "lang"        character varying        NOT NULL,
  "day_session" date                     NOT NULL,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "event"       text                     NOT NULL,
  "stage"       smallint,
  CONSTRAINT "user_review_milestone_event_check" CHECK ((event = ANY (ARRAY['session_started'::text, 'stage_advanced'::text, 'session_completed'::text]))),
  CONSTRAINT "user_review_milestone_pkey" PRIMARY KEY (id),
  CONSTRAINT "user_review_milestone_stage_check" CHECK (((stage IS NULL) OR ((stage >= 0) AND (stage <= 5)))),
  "uid"         uuid                     NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "user_review_milestone_session_fkey" FOREIGN KEY (uid, lang, day_session) REFERENCES public.user_review_session(uid, lang, day_session) ON UPDATE CASCADE
    ON DELETE CASCADE
);

ALTER TABLE "public"."user_review_milestone"
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_review_milestone" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_review_milestone" TO "service_role";

CREATE INDEX idx_user_review_milestone_session_created ON public.user_review_milestone USING btree (uid, lang, day_session, created_at DESC);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."user_review_milestone"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((uid = auth.uid()));

CREATE POLICY "Enable users to view their own data only" ON "public"."user_review_milestone"
  FOR SELECT
  TO "authenticated"
  USING ((uid = auth.uid()));

REVOKE ALL ON TABLE "public"."user_review_milestone" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_review_milestone" TO "postgres";
