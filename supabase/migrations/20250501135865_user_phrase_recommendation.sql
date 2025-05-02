create type "public"."recommendation_source" as enum ('friend', 'library', 'algo');

create type "public"."recommendation_status" as enum ('unread', 'read', 'accepted', 'ignored', 'rejected');

create table "public"."user_phrase_recommendation" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "phrase_id" uuid not null,
    "status" recommendation_status default 'unread'::recommendation_status,
    "uid_for" uuid not null,
    "source" recommendation_source,
    "uid_by" uuid
);

CREATE UNIQUE INDEX user_phrase_recommendation_pkey ON public.user_phrase_recommendation USING btree (id);

alter table "public"."user_phrase_recommendation" enable row level security;

alter table "public"."user_phrase_recommendation" add constraint "user_phrase_recommendation_pkey" PRIMARY KEY using index "user_phrase_recommendation_pkey";

alter table "public"."user_phrase_recommendation" add constraint "user_phrase_recommendation_phrase_id_fkey" FOREIGN KEY (phrase_id) REFERENCES phrase(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."user_phrase_recommendation" validate constraint "user_phrase_recommendation_phrase_id_fkey";

alter table "public"."user_phrase_recommendation" add constraint "user_phrase_recommendation_uid_by_fkey" FOREIGN KEY (uid_by) REFERENCES user_profile(uid) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."user_phrase_recommendation" validate constraint "user_phrase_recommendation_uid_by_fkey";

alter table "public"."user_phrase_recommendation" add constraint "user_phrase_recommendation_uid_for_fkey" FOREIGN KEY (uid_for) REFERENCES user_profile(uid) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."user_phrase_recommendation" validate constraint "user_phrase_recommendation_uid_for_fkey";

grant insert on table "public"."user_phrase_recommendation" to "authenticated";

grant references on table "public"."user_phrase_recommendation" to "authenticated";

grant select on table "public"."user_phrase_recommendation" to "authenticated";

grant trigger on table "public"."user_phrase_recommendation" to "authenticated";

grant insert on table "public"."user_phrase_recommendation" to "service_role";

grant references on table "public"."user_phrase_recommendation" to "service_role";

grant select on table "public"."user_phrase_recommendation" to "service_role";

grant trigger on table "public"."user_phrase_recommendation" to "service_role";

grant truncate on table "public"."user_phrase_recommendation" to "service_role";

grant update on table "public"."user_phrase_recommendation" to "service_role";


