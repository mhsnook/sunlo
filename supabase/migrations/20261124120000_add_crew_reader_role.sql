-- crew_reader runs the SQL that admin agents write themselves (run_sql in
-- apps/admin/.flue/tools/database.ts), through a Hyperdrive config of its
-- own. It reads what admin_reader reads, minus the text that strangers write
-- to the crew: on feedback, only the columns that counting needs. It is a
-- login role with no membership in admin_reader, so a query cannot
-- `set role` its way to the wider grants. The owner sets its password after
-- the release, as for admin_reader.
do $$
begin
  if not exists (select from pg_roles where rolname = 'crew_reader') then
    create role crew_reader login noinherit bypassrls;
  end if;
end $$;

alter role crew_reader
set
	default_transaction_read_only = on;

grant usage on schema public to crew_reader;

grant
select
	on all tables in schema public to crew_reader;

alter default privileges in schema public
grant
select
	on tables to crew_reader;

revoke
select
	on table public.chat_message
from
	crew_reader;

grant
select
	(id, sender_uid, created_at) on table public.chat_message to crew_reader;

revoke
select
	on table public.notification
from
	crew_reader;

grant
select
	(id, uid, type, created_at) on table public.notification to crew_reader;

revoke
select
	on table public.user_client_event
from
	crew_reader;

grant
select
	(id, uid, created_at) on table public.user_client_event to crew_reader;

revoke
select
	on table public.db_meta
from
	crew_reader;

revoke
select
	on table public.feedback
from
	crew_reader;

grant
select
	(id, created_at, uid, kind, lang) on table public.feedback to crew_reader;

grant usage on schema admin to crew_reader;

grant
select
	on table admin.user_account to crew_reader;
