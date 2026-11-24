-- Feedback that anyone sends from /feedback, signed in or not: a bug, a
-- feature request, or something missing from the library. The admin crew
-- keeps its triage in the CrewRoom Durable Object, so this table has no
-- status column and nobody updates a row.
create table "public"."feedback" (
	"id" uuid not null default gen_random_uuid(),
	"created_at" timestamp with time zone not null default now(),
	"uid" uuid default auth.uid (),
	"kind" text not null,
	"message" text not null,
	"lang" character varying,
	"page_url" text,
	"contact_email" text,
	constraint "feedback_pkey" primary key ("id"),
	constraint "feedback_kind_check" check (kind in ('bug', 'feature', 'library')),
	constraint "feedback_message_length" check (char_length(btrim(message)) between 1 and 4000),
	constraint "feedback_page_url_length" check (char_length(page_url) <= 2000),
	constraint "feedback_contact_email_length" check (char_length(contact_email) <= 320),
	-- No foreign key to language: a visitor may ask for one Sunlo has no row for.
	constraint "feedback_lang_length" check (char_length(lang) = 3),
	constraint "feedback_uid_fkey" foreign key (uid) references user_profile (uid) on update cascade on delete set null
);

alter table "public"."feedback" enable row level security;

create index feedback_created_at_idx on public.feedback using btree (created_at desc);

-- A signed-out visitor sends with uid null; a signed-in one only as
-- themselves.
create policy "Anyone can send feedback as themselves" on "public"."feedback" for insert to authenticated,
anon
with
	check (uid is not distinct from auth.uid ());

create policy "Users can read their own feedback" on "public"."feedback" for
select
	to authenticated using (uid = auth.uid ());

revoke all on table "public"."feedback"
from
	anon,
	authenticated;

grant insert on table "public"."feedback" to anon;

grant
select
,
	insert on table "public"."feedback" to authenticated;

grant all on table "public"."feedback" to service_role;
