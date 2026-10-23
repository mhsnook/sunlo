-- A read-only role for the admin app's Worker (apps/admin/worker).
--
-- The Worker runs the dashboard's SQL itself, connected as admin_reader
-- through Supabase's transaction pooler, so a new chart needs no migration.
-- The role gets no password here: the owner sets one in the SQL editor
-- after the release, and locally with one psql command (apps/admin/README.md).
-- Every public table has RLS, so bypassrls is what lets the role count
-- across every user's rows. The role has `login`, so this uses an `if not
-- exists` guard: a role outlives the database on a local `db reset`.
do $$
begin
  if not exists (select from pg_roles where rolname = 'admin_reader') then
    create role admin_reader login noinherit bypassrls;
  end if;
end $$;

-- Reads only, enforced by the server: an INSERT fails inside any function
-- the role could call, not only on the tables it lacks grants for.
alter role admin_reader
set
	default_transaction_read_only = on;

grant usage on schema public to admin_reader;

grant
select
	on all tables in schema public to admin_reader;

alter default privileges in schema public
grant
select
	on tables to admin_reader;

-- Private content: only the columns that counting needs.
revoke
select
	on table public.chat_message
from
	admin_reader;

grant
select
	(id, sender_uid, created_at) on table public.chat_message to admin_reader;

revoke
select
	on table public.notification
from
	admin_reader;

grant
select
	(id, uid, type, created_at) on table public.notification to admin_reader;

revoke
select
	on table public.user_client_event
from
	admin_reader;

grant
select
	(id, uid, created_at) on table public.user_client_event to admin_reader;

revoke
select
	on table public.db_meta
from
	admin_reader;

-- auth.users belongs to supabase_auth_admin, so the role that runs this
-- migration cannot grant on it (Postgres only warns and grants nothing).
-- A view owned by that role reads auth.users on admin_reader's behalf and
-- exposes four columns. It lives outside `public` so PostgREST never sees it.
create schema if not exists admin;

create or replace view admin.user_account as
select
	id,
	email,
	created_at,
	last_sign_in_at
from
	auth.users;

grant usage on schema admin to admin_reader;

grant
select
	on table admin.user_account to admin_reader;
