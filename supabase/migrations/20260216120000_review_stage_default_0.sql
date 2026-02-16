-- Change stage default from 1 to 0: stage 0 is now "preview new cards"
-- New reviews start at the preview step, then transition to stage 1
alter table "public"."user_deck_review_state"
alter column "stage" set default 0;
