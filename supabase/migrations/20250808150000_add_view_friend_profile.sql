create or replace view
	"public"."friend_profile" as
select
	"up"."uid",
	"up"."username",
	"up"."avatar_path",
	"up"."languages_spoken",
	(
		select
			array_agg("ud"."lang")
		from
			"public"."user_deck" "ud"
		where
			(
				("ud"."uid" = "up"."uid")
				and ("ud"."archived" = false)
			)
	) as "languages_learning"
from
	"public"."user_profile" "up";

alter table "public"."friend_profile" owner to "postgres";

alter table "public"."friend_profile" enable row level security;

create policy "Friends can see friend profiles" on "public"."friend_profile" for
select
	to "authenticated" using (
		(
			(
				select
					"auth"."uid" () as "uid"
			) = "uid"
		)
		or "public"."are_friends" ("auth"."uid" (), "uid")
	);

grant all on table "public"."friend_profile" to "anon";

grant all on table "public"."friend_profile" to "authenticated";

grant all on table "public"."friend_profile" to "service_role";