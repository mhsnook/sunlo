create table
	"public"."user_deck_review_state" (
		"lang" character varying not null,
		"uid" uuid not null default auth.uid (),
		"day_session" date not null,
		"created_at" timestamp with time zone not null default now(),
		"manifest" jsonb
	);

alter table "public"."user_deck_review_state" enable row level security;

create unique index user_deck_review_state_pkey on public.user_deck_review_state using btree (lang, uid, day_session);

alter table "public"."user_deck_review_state"
add constraint "user_deck_review_state_pkey" primary key using index "user_deck_review_state_pkey";

alter table "public"."user_deck_review_state"
add constraint "user_deck_review_state_lang_uid_fkey" foreign key (lang, uid) references user_deck (lang, uid) on update cascade on delete cascade not valid;

alter table "public"."user_deck_review_state" validate constraint "user_deck_review_state_lang_uid_fkey";

grant insert on table "public"."user_deck_review_state" to "authenticated";

grant references on table "public"."user_deck_review_state" to "authenticated";

grant
select
	on table "public"."user_deck_review_state" to "authenticated";

grant trigger on table "public"."user_deck_review_state" to "authenticated";

grant
truncate on table "public"."user_deck_review_state" to "authenticated";

grant
update on table "public"."user_deck_review_state" to "authenticated";

grant delete on table "public"."user_deck_review_state" to "service_role";

grant insert on table "public"."user_deck_review_state" to "service_role";

grant references on table "public"."user_deck_review_state" to "service_role";

grant
select
	on table "public"."user_deck_review_state" to "service_role";

grant trigger on table "public"."user_deck_review_state" to "service_role";

grant
truncate on table "public"."user_deck_review_state" to "service_role";

grant
update on table "public"."user_deck_review_state" to "service_role";

create policy "Enable insert for authenticated users only" on "public"."user_deck_review_state" as permissive for insert to authenticated
with
	check ((uid = auth.uid ()));

create policy "Enable users to view their own data only" on "public"."user_deck_review_state" as permissive for
select
	to authenticated using (
		(
			(
				select
					auth.uid () as uid
			) = uid
		)
	);

insert into
	public.user_deck_review_state (uid, lang, day_session, created_at)
select
	(uid)::uuid,
	lang,
	day_session,
	now() + interval '12 hour'
from
	public.user_card_review
group by
	uid,
	lang,
	day_session on conflict
do nothing;

alter table "public"."user_card_review"
add constraint "user_card_review_uid_lang_day_session_fkey" foreign key (uid, lang, day_session) references user_deck_review_state (uid, lang, day_session) on update cascade on delete set null not valid;

alter table "public"."user_card_review" validate constraint "user_card_review_uid_lang_day_session_fkey";