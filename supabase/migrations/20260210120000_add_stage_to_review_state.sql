-- Add stage column to track user's position in the review flow
-- Stages: 0=not init, 1=first pass, 2=reviewing skipped, 3=skipped unreviewed,
--         4=reviewing agains, 5=done/skipped agains
alter table "public"."user_deck_review_state"
add column "stage" smallint not null default 1;

-- Allow users to update their own review state (for stage transitions)
create policy "Enable users to update their own data" on "public"."user_deck_review_state" as permissive
for update
	to authenticated using ((uid = auth.uid ()));
