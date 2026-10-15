CREATE TABLE "public"."user_card_review" (
  "id"                         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "score"                      smallint                 NOT NULL,
  "difficulty"                 numeric,
  "stability"                  numeric,
  "review_time_retrievability" numeric,
  "created_at"                 timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"                 timestamp with time zone NOT NULL DEFAULT now(),
  "day_session"                date                     NOT NULL,
  "lang"                       character varying        NOT NULL,
  "phrase_id"                  uuid                     NOT NULL,
  "stage"                      smallint                 NOT NULL,
  CONSTRAINT "user_card_review_difficulty_check" CHECK (((difficulty >= 1.0) AND (difficulty <= 10.0))),
  CONSTRAINT "user_card_review_phrase_id_fkey" FOREIGN KEY (phrase_id) REFERENCES public.phrase(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "user_card_review_pkey" PRIMARY KEY (id),
  CONSTRAINT "user_card_review_retrievability_check"
    CHECK (((review_time_retrievability IS NULL) OR ((review_time_retrievability >= 0.0) AND (review_time_retrievability <= 1.0)))),
  CONSTRAINT "user_card_review_score_check" CHECK ((score = ANY (ARRAY[1, 2, 3, 4]))),
  CONSTRAINT "user_card_review_stability_check" CHECK ((stability >= 0.0)),
  CONSTRAINT "user_card_review_stability_max_check" CHECK ((stability <= 36500.0)),
  CONSTRAINT "user_card_review_stage_check" CHECK ((stage = ANY (ARRAY[1, 2, 3]))),
  "uid"                        uuid                     NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "user_card_review_lang_uid_fkey" FOREIGN KEY (uid, lang) REFERENCES public.user_deck(uid, lang),
  CONSTRAINT "user_card_review_uid_fkey" FOREIGN KEY (uid) REFERENCES public.user_profile(uid) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "user_card_review_uid_lang_day_session_fkey" FOREIGN KEY (uid, lang, day_session) REFERENCES public.user_review_session(uid, lang, day_session) ON UPDATE CASCADE
    ON DELETE SET NULL
);

ALTER TABLE "public"."user_card_review"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."user_card_review"
  ADD COLUMN "direction" public.card_direction NOT NULL DEFAULT 'forward'::public.card_direction;

CREATE TRIGGER update_user_card_review_updated_at
  BEFORE UPDATE ON public.user_card_review
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_card_review_updated_at();

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_card_review" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_card_review" TO "service_role";

ALTER TABLE "public"."user_card_review"
  ADD CONSTRAINT "user_card_review_phrase_id_uid_fkey" FOREIGN KEY (uid, phrase_id, direction) REFERENCES public.user_card(uid, phrase_id, direction);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."user_card_review"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = uid));

CREATE POLICY "Enable users to update their own data only" ON "public"."user_card_review"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = uid))
  WITH CHECK ((( SELECT auth.uid() AS uid) = uid));

CREATE POLICY "Enable users to view their own data only" ON "public"."user_card_review"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = uid));

REVOKE ALL ON TABLE "public"."user_card_review" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_card_review" TO "postgres";
