-- Fix request_comment UPDATE policy to include WITH CHECK clause
-- This prevents users from modifying the uid field during an update

drop policy if exists "Users can update own comments" on "public"."request_comment";

create policy "Users can update own comments" on "public"."request_comment" as permissive
for update
	to authenticated
	using ((uid = auth.uid ()))
	with check ((uid = auth.uid ()));
