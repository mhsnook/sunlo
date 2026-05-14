-- Expose languages_known on the public_profile view so the friends list can
-- show language overlap between viewer and friend (what they're learning,
-- what they speak) without joining through user_profile (RLS-restricted).
create or replace view "public"."public_profile" as
select
	"user_profile"."uid",
	"user_profile"."username",
	"user_profile"."avatar_path",
	"user_profile"."languages_known"
from
	"public"."user_profile";

alter table "public"."public_profile" owner to "postgres";

grant
select
	on table "public"."public_profile" to "anon",
	"authenticated",
	"service_role";
