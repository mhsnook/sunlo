create table "public"."monitor_client_event" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "uid" uuid not null default auth.uid(),
    "message" text,
    "context" jsonb
);


alter table "public"."monitor_client_event" enable row level security;

CREATE UNIQUE INDEX monitor_client_errors_pkey ON public.monitor_client_event USING btree (id);

alter table "public"."monitor_client_event" add constraint "monitor_client_errors_pkey" PRIMARY KEY using index "monitor_client_errors_pkey";

grant delete on table "public"."monitor_client_event" to "anon";

grant insert on table "public"."monitor_client_event" to "anon";

grant references on table "public"."monitor_client_event" to "anon";

grant select on table "public"."monitor_client_event" to "anon";

grant trigger on table "public"."monitor_client_event" to "anon";

grant truncate on table "public"."monitor_client_event" to "anon";

grant update on table "public"."monitor_client_event" to "anon";

grant delete on table "public"."monitor_client_event" to "authenticated";

grant insert on table "public"."monitor_client_event" to "authenticated";

grant references on table "public"."monitor_client_event" to "authenticated";

grant select on table "public"."monitor_client_event" to "authenticated";

grant trigger on table "public"."monitor_client_event" to "authenticated";

grant truncate on table "public"."monitor_client_event" to "authenticated";

grant update on table "public"."monitor_client_event" to "authenticated";

grant delete on table "public"."monitor_client_event" to "service_role";

grant insert on table "public"."monitor_client_event" to "service_role";

grant references on table "public"."monitor_client_event" to "service_role";

grant select on table "public"."monitor_client_event" to "service_role";

grant trigger on table "public"."monitor_client_event" to "service_role";

grant truncate on table "public"."monitor_client_event" to "service_role";

grant update on table "public"."monitor_client_event" to "service_role";

create policy "Enable insert for users based on user_id"
on "public"."monitor_client_event"
as permissive
for insert
to public
with check ((( SELECT auth.uid() AS uid) = uid));


create policy "Enable read access for supabase admins"
on "public"."monitor_client_event"
as permissive
for select
to supabase_admin
using (true);


create policy "Enable users to view their own data only"
on "public"."monitor_client_event"
as permissive
for select
to authenticated
using ((( SELECT auth.uid() AS uid) = uid));



