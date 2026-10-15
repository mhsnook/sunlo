CREATE TABLE "public"."language" (
  "name"     text              NOT NULL,
  "lang"     character varying NOT NULL,
  "alias_of" character varying,
  CONSTRAINT "language_pkey" PRIMARY KEY (lang)
);

ALTER TABLE "public"."language"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."language"
  ADD CONSTRAINT "language_code2_key" UNIQUE (lang);

CREATE POLICY "Enable read access for all users" ON "public"."language"
  FOR SELECT
  TO PUBLIC
  USING (true);

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."language" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."language" TO "service_role";

COMMENT ON TABLE "public"."language" IS 'The languages that people are trying to learn';

REVOKE ALL ON TABLE "public"."language" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."language" TO "postgres";
