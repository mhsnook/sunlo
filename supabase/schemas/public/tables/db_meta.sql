CREATE TABLE "public"."db_meta" (
  "key"   text NOT NULL,
  "value" text NOT NULL,
  CONSTRAINT "db_meta_pkey" PRIMARY KEY (key)
);

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."db_meta" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."db_meta" TO "service_role";

REVOKE ALL ON TABLE "public"."db_meta" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."db_meta" TO "postgres";
