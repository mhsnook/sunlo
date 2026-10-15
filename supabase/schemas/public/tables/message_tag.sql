CREATE TABLE "public"."message_tag" (
  "slug"        text                     NOT NULL,
  "label"       text                     NOT NULL,
  "description" text,
  "sort_order"  integer                  NOT NULL DEFAULT 0,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "archived"    boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "message_tag_pkey" PRIMARY KEY (slug)
);

ALTER TABLE "public"."message_tag"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can delete message tags" ON "public"."message_tag"
  FOR DELETE
  TO "authenticated"
  USING (public.is_admin());

CREATE POLICY "Admins can insert message tags" ON "public"."message_tag"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update message tags" ON "public"."message_tag"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Enable read access for all users" ON "public"."message_tag"
  FOR SELECT
  TO PUBLIC
  USING (true);

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."message_tag" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."message_tag" TO "service_role";

REVOKE ALL ON TABLE "public"."message_tag" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."message_tag" TO "postgres";
