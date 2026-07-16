-- Supabase baseline shim for a *native* Postgres cluster (no Docker).
--
-- The real Supabase stack (auth/PostgREST/realtime/vault/pg_net/...) is provided
-- by the supabase/postgres Docker image. This container can't run Docker, so this
-- file reconstructs the *minimum* baseline that `schemas/base.sql`, the migrations,
-- and the seed files assume already exists:
--
--   * the anon / authenticated / service_role / authenticator roles
--   * the auth, extensions, graphql, vault, net schemas
--   * auth.uid()/role()/email()/jwt() (return NULL here — RLS is effectively off,
--     which is fine: we run as superuser for schema/migration/type/dump work)
--   * GoTrue-shaped auth.users / auth.identities (superset of the columns the
--     static seed-0-auth.sql touches) so the auth seed loads
--   * net.http_post() and vault.decrypted_secrets stubs, because a couple of
--     schema functions/triggers reference them
--   * the supabase_realtime publication
--
-- This is NOT real auth. Do not use it to test RLS behaviour — use CI (Docker) or
-- a real Supabase project for that. It exists so migrations can be applied, seeds
-- loaded, the schema dumped, and types generated without pulling to a local machine.

do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select from pg_roles where rolname = 'authenticator') then create role authenticator noinherit login; end if;
end $$;
grant anon, authenticated, service_role to authenticator;

create schema if not exists auth authorization postgres;
create schema if not exists extensions authorization postgres;
create schema if not exists graphql authorization postgres;
create schema if not exists vault authorization postgres;
create schema if not exists net authorization postgres;

-- auth.* helpers: read the request.jwt.* GUCs if a caller sets them, else NULL.
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claim.role', true), '') $$;
create or replace function auth.email() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claim.email', true), '') $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;

-- pg_net stub: a handful of trigger functions call net.http_post(); make it a no-op.
create or replace function net.http_post(
  url text, body jsonb default '{}', params jsonb default '{}',
  headers jsonb default '{}', timeout_milliseconds int default 5000
) returns bigint language sql as $$ select 0::bigint $$;

-- supabase_vault stub: one function reads vault.decrypted_secrets.
create table if not exists vault.secrets (
  id uuid primary key default gen_random_uuid(), name text, description text default '',
  secret text, created_at timestamptz default now(), updated_at timestamptz default now());
create or replace view vault.decrypted_secrets as
  select id, name, description, secret as decrypted_secret, created_at, updated_at from vault.secrets;

-- GoTrue-shaped auth tables (superset of the columns seed-0-auth.sql inserts/updates).
create table if not exists auth.users (
  instance_id uuid, id uuid primary key, aud varchar(255), role varchar(255),
  email varchar(255), encrypted_password varchar(255), email_confirmed_at timestamptz,
  invited_at timestamptz, confirmation_token varchar(255), confirmation_sent_at timestamptz,
  recovery_token varchar(255), recovery_sent_at timestamptz, email_change_token_new varchar(255),
  email_change varchar(255), email_change_sent_at timestamptz, last_sign_in_at timestamptz,
  raw_app_meta_data jsonb, raw_user_meta_data jsonb, is_super_admin boolean,
  created_at timestamptz, updated_at timestamptz, phone text default null,
  phone_confirmed_at timestamptz, phone_change text default '', phone_change_token varchar(255) default '',
  phone_change_sent_at timestamptz, confirmed_at timestamptz,
  email_change_token_current varchar(255) default '', email_change_confirm_status smallint default 0,
  banned_until timestamptz, reauthentication_token varchar(255) default '',
  reauthentication_sent_at timestamptz, is_sso_user boolean default false,
  deleted_at timestamptz, is_anonymous boolean default false);
create table if not exists auth.identities (
  provider_id text, user_id uuid references auth.users (id) on delete cascade,
  identity_data jsonb, provider text, last_sign_in_at timestamptz,
  created_at timestamptz, updated_at timestamptz, id uuid default gen_random_uuid() primary key);

grant usage on schema auth, extensions to anon, authenticated, service_role;

-- base.sql does `alter publication supabase_realtime add table ...`; the publication
-- itself is created by Supabase, so create an empty one here.
do $$ begin
  if not exists (select from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
