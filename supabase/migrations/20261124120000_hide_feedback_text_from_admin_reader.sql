-- Reuses the version of a migration that a Supabase preview branch applied
-- and this branch then dropped (a crew_reader role). Keep the version: the
-- preview branch refuses a history that lacks it.
--
-- admin_reader sees only what counting needs. It also runs the SQL that
-- admin agents write themselves, and the message, the page and the email
-- are text from strangers. The admin reads those through their own session
-- and the policy below.
revoke
select
	on table "public"."feedback"
from
	admin_reader;

grant
select
	(id, created_at, uid, kind, lang) on table "public"."feedback" to admin_reader;

create policy "Admins can read all feedback" on "public"."feedback" for
select
	to authenticated using (public.is_admin ());
