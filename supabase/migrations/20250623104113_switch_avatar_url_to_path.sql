-- Add the pathname column to the user profile
alter table "public"."user_profile"
add column "avatar_path" text;

-- Migrate existing data to capture just the final segment
update "public"."user_profile"
set
	"avatar_path" = regexp_replace("avatar_url", '^.*/', '');

-- Drop the old column and update the public_profile view
drop view "public"."public_profile";

alter table "public"."user_profile"
drop column if exists "avatar_url";

create or replace view
	"public"."public_profile" as
select
	user_profile.uid,
	user_profile.username,
	user_profile.avatar_path
from
	user_profile;