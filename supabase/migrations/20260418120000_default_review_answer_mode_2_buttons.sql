-- Switch the default review_answer_mode for new profiles to the 2-button format.
alter table "public"."user_profile"
alter column "review_answer_mode" set default '2-buttons'::text;
