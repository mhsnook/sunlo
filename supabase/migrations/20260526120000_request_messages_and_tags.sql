-- Stage 1: introduce the `message` object that sits behind phrase_request.
--
-- A message is the cross-language thing a request expresses ("how do I say
-- hello"). Today every phrase_request gets its own message 1:1; later, when
-- cross-posting / reposting lands, multiple requests can share one message
-- and the tags will travel with it.
--
-- Tags here are a CLOSED, admin-curated vocabulary (slug PK, no per-user
-- tags). Contrast with the language-scoped `tag` table for phrases.
--
-- Shape:
--   message              (id, created_at)
--   message_tag          (slug, label, description, sort_order)
--   message_tag_link     (message_id, tag_slug)  -- join
--   phrase_request.message_id  -- new FK, auto-populated by trigger
--
-- ── 1. message ──────────────────────────────────────────────────────
create table if not exists public.message (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now());

alter table public.message owner to postgres;

alter table public.message enable row level security;

create policy "Enable read access for all users" on public.message for
select
	using (true);

create policy "Admins can update messages" on public.message
for update
	to authenticated using (public.is_admin ())
with
	check (public.is_admin ());

grant
select
	on public.message to anon,
	authenticated;

grant all on public.message to service_role;

-- ── 2. message_tag (admin-curated vocabulary) ───────────────────────
create table if not exists public.message_tag (
	slug text primary key,
	label text not null,
	description text,
	sort_order integer not null default 0,
	created_at timestamptz not null default now()
);

alter table public.message_tag owner to postgres;

alter table public.message_tag enable row level security;

create policy "Enable read access for all users" on public.message_tag for
select
	using (true);

create policy "Admins can insert message tags" on public.message_tag for insert to authenticated
with
	check (public.is_admin ());

create policy "Admins can update message tags" on public.message_tag
for update
	to authenticated using (public.is_admin ())
with
	check (public.is_admin ());

create policy "Admins can delete message tags" on public.message_tag for delete to authenticated using (public.is_admin ());

grant
select
	on public.message_tag to anon,
	authenticated;

grant all on public.message_tag to service_role;

-- ── 3. message_tag_link ─────────────────────────────────────────────
create table if not exists public.message_tag_link (
	message_id uuid not null references public.message (id) on delete cascade,
	tag_slug text not null references public.message_tag (slug) on delete cascade,
	created_at timestamptz not null default now(),
	primary key (message_id, tag_slug)
);

alter table public.message_tag_link owner to postgres;

alter table public.message_tag_link enable row level security;

create policy "Enable read access for all users" on public.message_tag_link for
select
	using (true);

create policy "Admins can insert message tag links" on public.message_tag_link for insert to authenticated
with
	check (public.is_admin ());

create policy "Admins can delete message tag links" on public.message_tag_link for delete to authenticated using (public.is_admin ());

grant
select
	on public.message_tag_link to anon,
	authenticated;

grant all on public.message_tag_link to service_role;

create index if not exists message_tag_link_tag_slug_idx on public.message_tag_link (tag_slug);

-- ── 4. phrase_request.message_id ────────────────────────────────────
alter table public.phrase_request
add column if not exists message_id uuid references public.message (id) on delete restrict;

-- Backfill: each existing phrase_request gets its own message row.
-- Generate the (request_id, new_message_id) mapping up front in a CTE,
-- then use it in both the INSERT and the UPDATE so the pairing is
-- deterministic — the alternative (matching via row_number across the
-- INSERT's RETURNING) relies on undefined ordering.
with
	-- MATERIALIZED forces the CTE to evaluate once. Without it, Postgres
	-- may inline the CTE into both downstream references, which would
	-- call gen_random_uuid() twice per request and produce mismatched
	-- IDs in the INSERT vs the UPDATE.
	mapping as materialized (
		select
			id as request_id,
			gen_random_uuid() as new_message_id
		from
			public.phrase_request
		where
			message_id is null
	),
	inserted_messages as (
		insert into
			public.message (id)
		select
			new_message_id
		from
			mapping
		returning
			id
	)
update public.phrase_request pr
set
	message_id = m.new_message_id
from
	mapping m
where
	pr.id = m.request_id;

-- After backfill, lock it down.
alter table public.phrase_request
alter column message_id
set not null;

-- ── 5. auto-create message on phrase_request insert ─────────────────
-- security definer so the trigger can write to public.message without
-- the inserting user needing a direct INSERT policy on it. The trigger
-- only fires when message_id is null on the incoming row, so a client
-- that wants to attach to an existing message can do so by passing the
-- message_id explicitly (used later for reposts / cross-posting).
create or replace function public.ensure_phrase_request_message () returns trigger language plpgsql security definer as $$
declare
  new_message_id uuid;
begin
  if new.message_id is null then
    insert into public.message default values returning id into new_message_id;
    new.message_id := new_message_id;
  end if;
  return new;
end;
$$;

alter function public.ensure_phrase_request_message () owner to postgres;

drop trigger if exists ensure_phrase_request_message on public.phrase_request;

create trigger ensure_phrase_request_message
before insert on public.phrase_request for each row
execute function public.ensure_phrase_request_message ();

-- ── 6. seed the initial tags ────────────────────────────────────────
insert into
	public.message_tag (slug, label, sort_order)
values
	('day-1', 'Day 1', 10),
	('introductions', 'Introductions', 20),
	('getting-around', 'Getting around', 30),
	('safety', 'Safety ⚠️', 40),
	('pronouns', 'Pronouns', 50),
	('counting', 'Counting', 60),
	('odd-numbers', 'Odd numbers', 70),
	('eating', 'Eating', 80),
	('daily-life', 'Daily life', 90)
on conflict (slug) do nothing;
