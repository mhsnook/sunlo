do $$
	BEGIN
		alter table "public"."user_card_scheduled" drop constraint "user_card_scheduled_review_time_score_check";
	EXCEPTION
		WHEN undefined_object THEN
	END;
$$;

do $$
	BEGIN
		alter table "public"."user_card_scheduled" rename column "review_time_score" to "score";
	EXCEPTION
		WHEN undefined_column THEN
	END;
$$;

do $$
	BEGIN
		alter table "public"."user_card_scheduled" rename column "last_user_card_schedule_id" to "prev_id";
	EXCEPTION
		WHEN undefined_column THEN
	END;
$$;

do $$
	BEGIN
		alter table "public"."user_card_scheduled" add column "user_deck_id" uuid;
		UPDATE "public"."user_card_scheduled"
			SET "user_deck_id" = c.user_deck_id
			FROM "public"."user_card" AS c
			WHERE user_card_id = c.id;
	EXCEPTION
		WHEN duplicate_column THEN
	END;
$$;
