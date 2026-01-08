alter table "public"."user_card_review"
add constraint "user_card_review_uid_fkey" foreign key (uid) references user_profile (uid) on update cascade on delete cascade not valid;

alter table "public"."user_card_review" validate constraint "user_card_review_uid_fkey";

drop view if exists "public"."user_card_review_today";

drop view if exists "public"."user_card_scheduled_today";

drop view if exists "public"."user_card_pick_new_active";

drop policy "Enable all actions for users based on uid" on "public"."user_card_scheduled";

revoke delete on table "public"."user_card_scheduled"
from
	"anon";

revoke insert on table "public"."user_card_scheduled"
from
	"anon";

revoke references on table "public"."user_card_scheduled"
from
	"anon";

revoke
select
	on table "public"."user_card_scheduled"
from
	"anon";

revoke trigger on table "public"."user_card_scheduled"
from
	"anon";

revoke
truncate on table "public"."user_card_scheduled"
from
	"anon";

revoke
update on table "public"."user_card_scheduled"
from
	"anon";

revoke delete on table "public"."user_card_scheduled"
from
	"authenticated";

revoke insert on table "public"."user_card_scheduled"
from
	"authenticated";

revoke references on table "public"."user_card_scheduled"
from
	"authenticated";

revoke
select
	on table "public"."user_card_scheduled"
from
	"authenticated";

revoke trigger on table "public"."user_card_scheduled"
from
	"authenticated";

revoke
truncate on table "public"."user_card_scheduled"
from
	"authenticated";

revoke
update on table "public"."user_card_scheduled"
from
	"authenticated";

revoke delete on table "public"."user_card_scheduled"
from
	"service_role";

revoke insert on table "public"."user_card_scheduled"
from
	"service_role";

revoke references on table "public"."user_card_scheduled"
from
	"service_role";

revoke
select
	on table "public"."user_card_scheduled"
from
	"service_role";

revoke trigger on table "public"."user_card_scheduled"
from
	"service_role";

revoke
truncate on table "public"."user_card_scheduled"
from
	"service_role";

revoke
update on table "public"."user_card_scheduled"
from
	"service_role";

alter table "public"."user_card_scheduled"
drop constraint "user_card_scheduled_interval_r90_check";

alter table "public"."user_card_scheduled"
drop constraint "user_card_scheduled_review_time_difficulty_check";

alter table "public"."user_card_scheduled"
drop constraint "user_card_scheduled_review_time_stability_check";

alter table "public"."user_card_scheduled"
drop constraint "user_card_scheduled_score_check";

alter table "public"."user_card_scheduled"
drop constraint "user_card_scheduled_uid_fkey";

alter table "public"."user_card_scheduled"
drop constraint "user_card_scheduled_user_card_id_fkey";

alter table "public"."user_card_scheduled"
drop constraint "user_card_scheduled_user_deck_id_fkey";

drop function if exists "public"."record_review_and_schedule" (user_card_id uuid, score integer);

drop view if exists "public"."user_deck_plus";

alter table "public"."user_card_scheduled"
drop constraint "user_card_scheduled_pkey";

drop index if exists "public"."user_card_scheduled_pkey";

drop table "public"."user_card_scheduled";

create or replace view "public"."user_deck_plus" as
select
	d.id,
	d.uid,
	d.lang,
	d.learning_goal,
	d.archived,
	(
		select
			l.name
		from
			language l
		where
			((l.lang)::text = (d.lang)::text)
		limit
			1
	) as language,
	d.created_at,
	count(*) filter (
		where
			(c.status = 'learned'::card_status)
	) as cards_learned,
	count(*) filter (
		where
			(c.status = 'active'::card_status)
	) as cards_active,
	count(*) filter (
		where
			(c.status = 'skipped'::card_status)
	) as cards_skipped,
	(
		select
			count(*) as count
		from
			phrase p
		where
			((p.lang)::text = (d.lang)::text)
	) as lang_total_phrases,
	(
		select
			max(c.created_at) as max
		from
			user_card_review r
		where
			(r.user_deck_id = d.id)
		limit
			1
	) as most_recent_review_at,
	(
		select
			count(*) as count
		from
			user_card_review r
		where
			(
				(r.user_deck_id = d.id)
				and (r.created_at > (now() - '7 days'::interval))
			)
		limit
			1
	) as count_reviews_7d,
	(
		select
			count(*) as count
		from
			user_card_review r
		where
			(
				(r.user_deck_id = d.id)
				and (r.created_at > (now() - '7 days'::interval))
				and (r.score >= 2)
			)
		limit
			1
	) as count_reviews_7d_positive
from
	(
		user_deck d
		left join user_card c on ((d.id = c.user_deck_id))
	)
group by
	d.id,
	d.lang,
	d.created_at
order by
	(
		select
			count(*) as count
		from
			user_card_review r
		where
			(
				(r.user_deck_id = d.id)
				and (r.created_at > (now() - '7 days'::interval))
			)
		limit
			1
	) desc nulls last,
	d.created_at desc;
