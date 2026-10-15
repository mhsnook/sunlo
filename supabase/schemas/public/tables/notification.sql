CREATE TABLE "public"."notification" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "uid"        uuid                     NOT NULL,
  "actor_uid"  uuid                     NOT NULL,
  "request_id" uuid,
  "comment_id" uuid,
  "phrase_id"  uuid,
  "read_at"    timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "notification_no_self_notify" CHECK ((uid <> actor_uid)),
  CONSTRAINT "notification_pkey" PRIMARY KEY (id),
  CONSTRAINT "notification_phrase_id_fkey" FOREIGN KEY (phrase_id) REFERENCES public.phrase(id) ON DELETE CASCADE,
  CONSTRAINT "notification_request_id_fkey" FOREIGN KEY (request_id) REFERENCES public.phrase_request(id) ON DELETE CASCADE,
  CONSTRAINT "notification_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES public.request_comment(id) ON DELETE CASCADE,
  CONSTRAINT "notification_actor_uid_fkey" FOREIGN KEY (actor_uid) REFERENCES public.user_profile(uid) ON DELETE CASCADE,
  CONSTRAINT "notification_uid_fkey" FOREIGN KEY (uid) REFERENCES public.user_profile(uid) ON DELETE CASCADE
);

ALTER TABLE "public"."notification"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."notification"
  ADD COLUMN "type" public.notification_type NOT NULL;

CREATE INDEX idx_notification_uid_created ON public.notification USING btree (uid, created_at DESC);

CREATE INDEX idx_notification_uid_unread ON public.notification USING btree (uid)
  WHERE (read_at IS NULL);

CREATE POLICY "Users can read own notifications" ON "public"."notification"
  FOR SELECT
  TO PUBLIC
  USING ((uid = auth.uid()));

CREATE POLICY "Users can update own notifications" ON "public"."notification"
  FOR UPDATE
  TO PUBLIC
  USING ((uid = auth.uid()));

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notification" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notification" TO "service_role";

REVOKE ALL ON TABLE "public"."notification" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notification" TO "postgres";
