CREATE TABLE "public"."user_card" (
  "id"         uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "phrase_id"  uuid                     NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now(),
  "created_at" timestamp with time zone DEFAULT now(),
  "lang"       character varying        NOT NULL,
  CONSTRAINT "user_card_lang_fkey" FOREIGN KEY (lang) REFERENCES public.language(lang) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "user_card_phrase_id_fkey" FOREIGN KEY (phrase_id) REFERENCES public.phrase(id) ON DELETE CASCADE,
  CONSTRAINT "user_deck_card_membership_pkey" PRIMARY KEY (id),
  "uid"        uuid                     NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "user_card_lang_uid_fkey" FOREIGN KEY (uid, lang) REFERENCES public.user_deck(uid, lang),
  CONSTRAINT "user_card_uid_fkey" FOREIGN KEY (uid) REFERENCES public.user_profile(uid) ON UPDATE CASCADE ON DELETE CASCADE
);

ALTER TABLE "public"."user_card"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."user_card"
  ADD COLUMN "direction" public.card_direction NOT NULL DEFAULT 'forward'::public.card_direction;

ALTER TABLE "public"."user_card"
  ADD COLUMN "status" public.card_status DEFAULT 'active'::public.card_status;

ALTER TABLE "public"."user_card"
  ADD CONSTRAINT "user_deck_card_membership_uuid_key" UNIQUE (id);

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_card" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_card" TO "service_role";

ALTER TABLE "public"."user_card"
  ADD CONSTRAINT "user_card_uid_phrase_id_direction_key" UNIQUE (uid, phrase_id, direction);

CREATE POLICY "User data only for this user" ON "public"."user_card"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = uid))
  WITH CHECK ((auth.uid() = uid));

COMMENT ON TABLE "public"."user_card" IS 'Which card is in which deck, and its status';

COMMENT ON COLUMN "public"."user_card"."uid" IS 'The owner user''s ID';

REVOKE ALL ON TABLE "public"."user_card" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_card" TO "postgres";
