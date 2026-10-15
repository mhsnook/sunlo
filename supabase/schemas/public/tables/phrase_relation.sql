CREATE TABLE "public"."phrase_relation" (
  "from_phrase_id" uuid,
  "to_phrase_id"   uuid,
  "id"             uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  CONSTRAINT "card_see_also_pkey" PRIMARY KEY (id),
  CONSTRAINT "phrase_see_also_from_phrase_id_fkey" FOREIGN KEY (from_phrase_id) REFERENCES public.phrase(id),
  CONSTRAINT "phrase_see_also_to_phrase_id_fkey" FOREIGN KEY (to_phrase_id) REFERENCES public.phrase(id),
  "added_by"       uuid NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "phrase_see_also_added_by_fkey" FOREIGN KEY (added_by) REFERENCES public.user_profile(uid) ON DELETE SET NULL
);

ALTER TABLE "public"."phrase_relation"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."phrase_relation"
  ADD CONSTRAINT "card_see_also_uuid_key" UNIQUE (id);

CREATE POLICY "Enable read access for all users" ON "public"."phrase_relation"
  FOR SELECT
  TO PUBLIC
  USING (true);

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_relation" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_relation" TO "service_role";

CREATE POLICY "Authenticated users can add phrase relations" ON "public"."phrase_relation"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = added_by));

COMMENT ON COLUMN "public"."phrase_relation"."added_by" IS 'User who added this association';

REVOKE ALL ON TABLE "public"."phrase_relation" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."phrase_relation" TO "postgres";
