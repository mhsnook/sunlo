-- Auto-provision a public.user_profile row for every confirmed auth user.
--
-- Before this, the client created the profile via the /getting-started
-- form (an upsert that could race with itself — see issue #134). Now
-- profile existence tracks "is this a user at all": a trigger guarantees
-- one user_profile row per confirmed auth.users row, created atomically
-- with email confirmation. There is no longer any client-side profile
-- *creation* — the client only ever *updates* the row.
--
-- "Has the user picked a username + languages?" becomes a soft client
-- concept, tracked by flags->>'needs-onboarding'. The nudge in the
-- sidebar pulls them to /getting-started; nothing blocks the app.
--
-- flags is a generic jsonb bag for open-ended per-user profile state.
-- Today it holds one key, 'needs-onboarding'. It has room for things
-- like intro-message dismissals or 'accepted-agreements' later without
-- another migration. Dedicated preferences (font_preference,
-- review_answer_mode, sound_enabled) keep their own columns.
alter table "public"."user_profile"
add column if not exists "flags" "jsonb" default '{}'::"jsonb" not null;

-- security definer so the insert runs as the function owner (postgres)
-- and bypasses RLS: the trigger fires inside gotrue's transaction on
-- auth.users, with no app user in scope.
create or replace function "public"."handle_new_user" () returns "trigger" language "plpgsql" security definer as $$
begin
	insert into "public"."user_profile" ("uid", "flags")
	values (new.id, '{"needs-onboarding": true}'::jsonb)
	on conflict ("uid") do nothing;
	return new;
end;
$$;

alter function "public"."handle_new_user" () owner to "postgres";

-- Email/password signup: auth.users is inserted with email_confirmed_at
-- null, then updated when the user clicks the confirmation link. The
-- profile should not exist until confirmation, so we watch the update.
drop trigger if exists "on_auth_user_confirmed" on "auth"."users";

create trigger "on_auth_user_confirmed"
after
update of "email_confirmed_at" on "auth"."users" for each row when (
	old."email_confirmed_at" is null
	and new."email_confirmed_at" is not null
)
execute function "public"."handle_new_user" ();

-- OAuth / magic-link: auth.users is inserted with email_confirmed_at
-- already set, so the UPDATE trigger above never sees the transition.
-- This INSERT trigger covers that path.
drop trigger if exists "on_auth_user_created" on "auth"."users";

create trigger "on_auth_user_created"
after insert on "auth"."users" for each row when (new."email_confirmed_at" is not null)
execute function "public"."handle_new_user" ();

-- Backfill: existing confirmed users who never finished the old
-- /getting-started form have no profile row. Give them one so the app
-- (which no longer redirects on a missing profile) treats them like any
-- other user and shows the onboarding nudge. on conflict skips everyone
-- who already has a profile.
insert into
	"public"."user_profile" ("uid", "flags")
select
	"id",
	'{"needs-onboarding": true}'::"jsonb"
from
	"auth"."users"
where
	"email_confirmed_at" is not null
on conflict ("uid") do nothing;
