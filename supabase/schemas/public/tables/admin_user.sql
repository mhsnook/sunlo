CREATE TABLE "public"."admin_user" (
  "uid"        uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "admin_user_pkey" PRIMARY KEY (uid),
  CONSTRAINT "admin_user_uid_fkey" FOREIGN KEY (uid) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE "public"."admin_user"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own admin status" ON "public"."admin_user"
  FOR SELECT
  TO "authenticated"
  USING ((auth.uid() = uid));

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."admin_user" TO "service_role";

REVOKE ALL ON TABLE "public"."admin_user" FROM "authenticated";

GRANT SELECT ON TABLE "public"."admin_user" TO "authenticated";

REVOKE ALL ON TABLE "public"."admin_user" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."admin_user" TO "postgres";

REVOKE ALL ON TABLE "public"."admin_user" FROM "anon";
