alter table "public"."user_card_review"
add column "day_session" date default ((current_timestamp - '04:00:00'::interval hour))::date;

update "public"."user_card_review"
set
	day_session = (created_at - interval '04:00:00'::interval hour)::date;

alter table "public"."user_card_review"
alter column "day_session"
set not null;