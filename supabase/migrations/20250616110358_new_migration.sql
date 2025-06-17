create table "public"."user_deck_review_state" (
    "lang" character varying not null,
    "uid" uuid not null default auth.uid(),
    "day_session" date not null,
    "created_at" timestamp with time zone not null default now(),
    "manifest" jsonb
);


alter table "public"."user_deck_review_state" enable row level security;

CREATE UNIQUE INDEX user_deck_review_state_pkey ON public.user_deck_review_state USING btree (lang, uid, day_session);

alter table "public"."user_deck_review_state" add constraint "user_deck_review_state_pkey" PRIMARY KEY using index "user_deck_review_state_pkey";

alter table "public"."user_deck_review_state" add constraint "user_deck_review_state_lang_uid_fkey" FOREIGN KEY (lang, uid) REFERENCES user_deck(lang, uid) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."user_deck_review_state" validate constraint "user_deck_review_state_lang_uid_fkey";

grant insert on table "public"."user_deck_review_state" to "authenticated";

grant references on table "public"."user_deck_review_state" to "authenticated";

grant select on table "public"."user_deck_review_state" to "authenticated";

grant trigger on table "public"."user_deck_review_state" to "authenticated";

grant truncate on table "public"."user_deck_review_state" to "authenticated";

grant update on table "public"."user_deck_review_state" to "authenticated";

grant delete on table "public"."user_deck_review_state" to "service_role";

grant insert on table "public"."user_deck_review_state" to "service_role";

grant references on table "public"."user_deck_review_state" to "service_role";

grant select on table "public"."user_deck_review_state" to "service_role";

grant trigger on table "public"."user_deck_review_state" to "service_role";

grant truncate on table "public"."user_deck_review_state" to "service_role";

grant update on table "public"."user_deck_review_state" to "service_role";

create policy "Enable insert for authenticated users only"
on "public"."user_deck_review_state"
as permissive
for insert
to authenticated
with check ((uid = auth.uid()));


create policy "Enable users to view their own data only"
on "public"."user_deck_review_state"
as permissive
for select
to authenticated
using ((( SELECT auth.uid() AS uid) = uid));



