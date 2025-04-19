alter table "public"."user_card_review"
add constraint "user_card_review_uid_fkey" FOREIGN KEY (uid) REFERENCES user_profile (uid) ON UPDATE CASCADE ON DELETE CASCADE not valid;

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

create or replace view
	"public"."user_deck_plus" as
SELECT
	d.id,
	d.uid,
	d.lang,
	d.learning_goal,
	d.archived,
	(
		SELECT
			l.name
		FROM
			language l
		WHERE
			((l.lang)::text = (d.lang)::text)
		LIMIT
			1
	) AS language,
	d.created_at,
	count(*) FILTER (
		WHERE
			(c.status = 'learned'::card_status)
	) AS cards_learned,
	count(*) FILTER (
		WHERE
			(c.status = 'active'::card_status)
	) AS cards_active,
	count(*) FILTER (
		WHERE
			(c.status = 'skipped'::card_status)
	) AS cards_skipped,
	(
		SELECT
			count(*) AS count
		FROM
			phrase p
		WHERE
			((p.lang)::text = (d.lang)::text)
	) AS lang_total_phrases,
	(
		SELECT
			max(c.created_at) AS max
		FROM
			user_card_review r
		WHERE
			(r.user_deck_id = d.id)
		LIMIT
			1
	) AS most_recent_review_at,
	(
		SELECT
			count(*) AS count
		FROM
			user_card_review r
		WHERE
			(
				(r.user_deck_id = d.id)
				AND (r.created_at > (now() - '7 days'::interval))
			)
		LIMIT
			1
	) AS count_reviews_7d,
	(
		SELECT
			count(*) AS count
		FROM
			user_card_review r
		WHERE
			(
				(r.user_deck_id = d.id)
				AND (r.created_at > (now() - '7 days'::interval))
				AND (r.score >= 2)
			)
		LIMIT
			1
	) AS count_reviews_7d_positive
FROM
	(
		user_deck d
		LEFT JOIN user_card c ON ((d.id = c.user_deck_id))
	)
GROUP BY
	d.id,
	d.lang,
	d.created_at
ORDER BY
	(
		SELECT
			count(*) AS count
		FROM
			user_card_review r
		WHERE
			(
				(r.user_deck_id = d.id)
				AND (r.created_at > (now() - '7 days'::interval))
			)
		LIMIT
			1
	) DESC NULLS LAST,
	d.created_at DESC;