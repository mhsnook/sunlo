create table "public"."user_client_event" (
	"id" uuid not null default gen_random_uuid(),
	"created_at" timestamp with time zone not null default now(),
	"uid" uuid default auth.uid (),
	"message" text,
	"context" jsonb,
	"url" text
);

alter table "public"."user_client_event" enable row level security;

create unique index user_client_event_pkey on public.user_client_event using btree (id);

alter table "public"."user_client_event"
add constraint "user_client_event_pkey" primary key using index "user_client_event_pkey";

grant delete on table "public"."user_client_event" to "anon";

grant insert on table "public"."user_client_event" to "anon";

grant references on table "public"."user_client_event" to "anon";

grant
select
	on table "public"."user_client_event" to "anon";

grant trigger on table "public"."user_client_event" to "anon";

grant
truncate on table "public"."user_client_event" to "anon";

grant
update on table "public"."user_client_event" to "anon";

grant delete on table "public"."user_client_event" to "authenticated";

grant insert on table "public"."user_client_event" to "authenticated";

grant references on table "public"."user_client_event" to "authenticated";

grant
select
	on table "public"."user_client_event" to "authenticated";

grant trigger on table "public"."user_client_event" to "authenticated";

grant
truncate on table "public"."user_client_event" to "authenticated";

grant
update on table "public"."user_client_event" to "authenticated";

grant delete on table "public"."user_client_event" to "service_role";

grant insert on table "public"."user_client_event" to "service_role";

grant references on table "public"."user_client_event" to "service_role";

grant
select
	on table "public"."user_client_event" to "service_role";

grant trigger on table "public"."user_client_event" to "service_role";

grant
truncate on table "public"."user_client_event" to "service_role";

grant
update on table "public"."user_client_event" to "service_role";

create policy "Enable insert for any user" on "public"."user_client_event" as permissive for insert to authenticated,
anon
with
	check (true);
