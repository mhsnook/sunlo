CREATE TABLE "public"."tag" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "name"       text                     NOT NULL,
  "lang"       character varying        NOT NULL,
  CONSTRAINT "tag_lang_fkey" FOREIGN KEY (lang) REFERENCES public.language(lang) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "tag_name_lang_key" UNIQUE (name, lang),
  CONSTRAINT "tag_pkey" PRIMARY KEY (id),
  "added_by"   uuid                     DEFAULT auth.uid(),
  CONSTRAINT "tag_added_by_fkey" FOREIGN KEY (added_by) REFERENCES public.user_profile(uid) ON DELETE SET NULL
);

ALTER TABLE "public"."tag"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON "public"."tag"
  FOR SELECT
  TO PUBLIC
  USING (true);

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tag" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tag" TO "service_role";

CREATE POLICY "Authenticated users can create tags" ON "public"."tag"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = added_by));

REVOKE ALL ON TABLE "public"."tag" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tag" TO "postgres";
