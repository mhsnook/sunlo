CREATE TABLE "public"."message" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "message_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."message"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can update messages" ON "public"."message"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Enable read access for all users" ON "public"."message"
  FOR SELECT
  TO PUBLIC
  USING (true);

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."message" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."message" TO "service_role";

REVOKE ALL ON TABLE "public"."message" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."message" TO "postgres";
