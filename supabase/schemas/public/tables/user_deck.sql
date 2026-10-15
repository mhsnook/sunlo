CREATE TABLE "public"."user_deck" (
  "id"                         uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "lang"                       character varying        NOT NULL,
  "created_at"                 timestamp with time zone NOT NULL DEFAULT now(),
  "archived"                   boolean                  NOT NULL DEFAULT false,
  "daily_review_goal"          smallint                 NOT NULL DEFAULT 15,
  "preferred_translation_lang" character varying(3)     DEFAULT NULL::character varying,
  "review_answer_mode"         text,
  "updated_at"                 timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "daily_review_goal_valid_values" CHECK ((daily_review_goal = ANY (ARRAY[10, 15, 20]))),
  CONSTRAINT "user_deck_lang_fkey" FOREIGN KEY (lang) REFERENCES public.language(lang),
  CONSTRAINT "user_deck_pkey" PRIMARY KEY (id),
  CONSTRAINT "user_deck_review_answer_mode_check" CHECK (((review_answer_mode IS NULL) OR (review_answer_mode = ANY (ARRAY['4-buttons'::text, '2-buttons'::text])))),
  "uid"                        uuid                     NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "one_deck_per_language_per_user" UNIQUE (uid, lang),
  CONSTRAINT "user_deck_uid_fkey" FOREIGN KEY (uid) REFERENCES public.user_profile(uid) ON UPDATE CASCADE ON DELETE CASCADE
);

ALTER TABLE "public"."user_deck"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."user_deck"
  ADD COLUMN "learning_goal" public.learning_goal NOT NULL DEFAULT 'moving'::public.learning_goal;

ALTER TABLE "public"."user_deck"
  ADD CONSTRAINT "user_deck_uuid_key" UNIQUE (id);

CREATE TRIGGER refresh_meta_language_on_deck_change
  AFTER INSERT OR DELETE ON public.user_deck
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_refresh_meta_language();

CREATE TRIGGER update_user_deck_updated_at
  BEFORE UPDATE ON public.user_deck
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_deck_updated_at();

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_deck" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_deck" TO "service_role";

CREATE UNIQUE INDEX uid_deck ON public.user_deck USING btree (uid, lang);

CREATE POLICY "User data only for this user" ON "public"."user_deck"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = uid))
  WITH CHECK ((auth.uid() = uid));

COMMENT ON COLUMN "public"."user_deck"."archived" IS 'is the deck archived or active';

COMMENT ON COLUMN "public"."user_deck"."created_at" IS 'the moment the deck was created';

COMMENT ON COLUMN "public"."user_deck"."lang" IS 'The 3-letter code for the language (iso-369-3)';

COMMENT ON COLUMN "public"."user_deck"."learning_goal" IS 'why are you learning this language?';

COMMENT ON TABLE "public"."user_deck" IS 'A set of cards in one language which user intends to learn @graphql({"name": "UserDeck"})';

COMMENT ON COLUMN "public"."user_deck"."uid" IS 'The owner user''s ID';

REVOKE ALL ON TABLE "public"."user_deck" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_deck" TO "postgres";
