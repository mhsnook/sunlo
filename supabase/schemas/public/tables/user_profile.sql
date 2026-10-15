CREATE TABLE "public"."user_profile" (
  "username"           text,
  "updated_at"         timestamp with time zone,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "avatar_path"        text,
  "languages_known"    jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "font_preference"    text                     DEFAULT 'default'::text,
  "review_answer_mode" text                     DEFAULT '2-buttons'::text,
  "sound_enabled"      boolean                  NOT NULL DEFAULT true,
  "flags"              jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "profiles_username_key" UNIQUE (username),
  CONSTRAINT "user_profile_font_preference_check" CHECK ((font_preference = ANY (ARRAY['default'::text, 'dyslexic'::text]))),
  CONSTRAINT "user_profile_review_answer_mode_check" CHECK ((review_answer_mode = ANY (ARRAY['4-buttons'::text, '2-buttons'::text]))),
  CONSTRAINT "username_length" CHECK ((char_length(username) >= 3)),
  "uid"                uuid                     NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "profiles_pkey" PRIMARY KEY (uid)
);

ALTER TABLE "public"."user_profile"
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_profile" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_profile" TO "service_role";

ALTER TABLE "public"."user_profile"
  ADD CONSTRAINT "profile_old_id_key" UNIQUE (uid);

CREATE POLICY "User can view and update their own profile" ON "public"."user_profile"
  FOR ALL
  TO "authenticated"
  USING ((uid = auth.uid()))
  WITH CHECK ((uid = auth.uid()));

COMMENT ON COLUMN "public"."user_profile"."uid" IS 'Primary key (same as auth.users.id and uid())';

REVOKE ALL ON TABLE "public"."user_profile" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_profile" TO "postgres";
