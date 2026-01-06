drop policy "Only this user can access and update" on "public"."user_card_review";

revoke delete on table "public"."user_card_review"
from
	"anon";

revoke insert on table "public"."user_card_review"
from
	"anon";

revoke references on table "public"."user_card_review"
from
	"anon";

revoke
select
	on table "public"."user_card_review"
from
	"anon";

revoke trigger on table "public"."user_card_review"
from
	"anon";

revoke
truncate on table "public"."user_card_review"
from
	"anon";

revoke
update on table "public"."user_card_review"
from
	"anon";

revoke delete on table "public"."user_card_review"
from
	"authenticated";

revoke insert on table "public"."user_card_review"
from
	"authenticated";

revoke references on table "public"."user_card_review"
from
	"authenticated";

revoke
select
	on table "public"."user_card_review"
from
	"authenticated";

revoke trigger on table "public"."user_card_review"
from
	"authenticated";

revoke
truncate on table "public"."user_card_review"
from
	"authenticated";

revoke
update on table "public"."user_card_review"
from
	"authenticated";

revoke delete on table "public"."user_card_review"
from
	"service_role";

revoke insert on table "public"."user_card_review"
from
	"service_role";

revoke references on table "public"."user_card_review"
from
	"service_role";

revoke
select
	on table "public"."user_card_review"
from
	"service_role";

revoke trigger on table "public"."user_card_review"
from
	"service_role";

revoke
truncate on table "public"."user_card_review"
from
	"service_role";

revoke
update on table "public"."user_card_review"
from
	"service_role";

alter table "public"."user_card_review"
drop constraint "user_card_review_phrase_id_fkey";

alter table "public"."user_card_review"
drop constraint "user_card_review_uid_fkey";

drop view if exists "public"."user_card_review_plus";

alter table "public"."user_card_review"
drop constraint "user_card_review_pkey";

drop index if exists "public"."user_card_review_pkey";

drop table "public"."user_card_review";
