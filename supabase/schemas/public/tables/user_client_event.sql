CREATE TABLE "public"."user_client_event" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "message"    text,
  "context"    jsonb,
  "url"        text,
  CONSTRAINT "user_client_event_pkey" PRIMARY KEY (id),
  "uid"        uuid                     DEFAULT auth.uid(),
  CONSTRAINT "user_client_event_uid_fkey" FOREIGN KEY (uid) REFERENCES public.user_profile(uid) ON UPDATE CASCADE ON DELETE SET NULL
);

ALTER TABLE "public"."user_client_event"
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_client_event" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_client_event" TO "service_role";

CREATE POLICY "Users can log their own events" ON "public"."user_client_event"
  FOR INSERT
  TO "anon", "authenticated"
  WITH CHECK ((NOT (uid IS DISTINCT FROM auth.uid())));

REVOKE ALL ON TABLE "public"."user_client_event" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_client_event" TO "postgres";
