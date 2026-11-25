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
-- Not security definer: it reads only the caller's own JWT.
create or replace function "public"."is_anonymous" () returns boolean language "sql" stable as $$
	select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

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
			'create policy "Anonymous users cannot add public content" on public.%I as restrictive for insert to authenticated with check (not (select public.is_anonymous()))',
			t
		);
	end loop;
end;
$$;

-- Storage is public content too: only the avatars bucket takes uploads.
create policy "Anonymous users cannot upload files" on "storage"."objects" as restrictive for insert to authenticated
with
	check (
		not (
			select
				public.is_anonymous ()
		)
	);

create policy "Anonymous users cannot replace files" on "storage"."objects" as restrictive
for update
	to authenticated using (
		not (
			select
				public.is_anonymous ()
		)
	);

-- confirm_draft_phrase is security definer, so the policies above do not
-- reach it, and it trusts languages_known, which any user can set on their
-- own profile. Unchanged except for the anonymous check.
create or replace function "public"."confirm_draft_phrase" ("p_phrase_id" "uuid") returns "public"."phrase" language "plpgsql" security definer
set
	"search_path" to '' as $$
declare
	v_phrase public.phrase;
begin
	if public.is_anonymous() then
		raise exception 'Sign up to confirm a draft phrase' using errcode = '42501';
	end if;

	select * into v_phrase from public.phrase where id = p_phrase_id and archived = false;
	if not found then
		raise exception 'Phrase % not found', p_phrase_id using errcode = 'P0002';
	end if;

	if not (
		public.is_admin()
		or exists (
			select 1
			from public.user_profile profile,
				jsonb_array_elements(profile.languages_known) as known
			where profile.uid = auth.uid()
				and known ->> 'lang' = v_phrase.lang
				and known ->> 'level' = 'fluent'
		)
	) then
		raise exception 'Only fluent speakers of this language can confirm a draft phrase'
			using errcode = '42501';
	end if;

	update public.phrase set draft = false where id = p_phrase_id
	returning * into v_phrase;
	return v_phrase;
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
