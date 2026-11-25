-- Anonymous visitors (Supabase anonymous sign-in) for the coach, #839.
--
-- An anonymous user signs in with the "authenticated" role and a JWT whose
-- is_anonymous claim is true. They may write their own user_ tables (profile,
-- deck, cards, reviews), so the coach can build a deck with them before they
-- sign up. They may not add anything other people see.
--
-- Converting to a full account keeps the uid, so every row they wrote stays
-- theirs.
-- 1. Public content needs a real account.
--
-- A restrictive policy is ANDed with every permissive INSERT policy on the
-- table, so the permissive ones stay as they are. feedback is left out on
-- purpose: a signed-out visitor can already send it.
do $$
declare
	t text;
begin
	foreach t in array array[
		'chat_message',
		'comment_phrase_link',
		'comment_upvote',
		'friend_request_action',
		'message_tag',
		'message_tag_link',
		'phrase',
		'phrase_playlist',
		'phrase_playlist_upvote',
		'phrase_relation',
		'phrase_request',
		'phrase_request_upvote',
		'phrase_tag',
		'phrase_translation',
		'playlist_phrase_link',
		'request_comment',
		'tag'
	] loop
		execute format(
			'create policy "Anonymous users cannot add public content" on public.%I as restrictive for insert to authenticated with check ((select (auth.jwt() ->> ''is_anonymous'')::boolean) is not true)',
			t
		);
	end loop;
end;
$$;

-- 2. An anonymous user gets a profile when they sign in.
--
-- The app expects a user_profile row for every uid it signs in
-- (loadAllTheRequiredUserDataAfterNewLogin throws without one). The two
-- triggers from 20260520120000 wait for email confirmation, which an
-- anonymous user does not have. When they later confirm an email,
-- on_auth_user_confirmed fires handle_new_user again, and its
-- "on conflict do nothing" keeps this row.
create or replace trigger "on_anonymous_user_created"
after insert on "auth"."users" for each row when (new."is_anonymous")
execute function "public"."handle_new_user" ();

-- 3. What the learner told the coach they want from this language: their goal
-- and how much they already know, in the coach's words.
alter table "public"."user_deck"
add column "intention" "text",
add constraint "user_deck_intention_length" check (char_length("intention") <= 1000);

comment on column "public"."user_deck"."intention" is 'What the learner wants to learn and how much they already know, as the coach wrote it down';

-- 4. Feedback that the page sends for the learner, such as a coach flow that
-- keeps failing, is marked 'agent'. The crew reads this column, so
-- admin_reader gets it like the other non-text columns.
alter table "public"."feedback"
add column "source" "text" default 'person'::"text" not null,
add constraint "feedback_source_check" check ("source" = any (array['person'::"text", 'agent'::"text"]));

grant
select
	("source") on table "public"."feedback" to "admin_reader";
