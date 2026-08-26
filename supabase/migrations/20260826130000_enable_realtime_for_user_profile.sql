-- Publish user_profile over realtime, so a profile edit on one device reaches
-- the user's other devices. RLS scopes UPDATE frames per subscriber, so each
-- client sees only its own row.
do $$
begin
	if not exists (
		select 1 from pg_publication_tables
		where pubname = 'supabase_realtime'
		and schemaname = 'public'
		and tablename = 'user_profile'
	) then
		alter publication "supabase_realtime" add table only "public"."user_profile";
	end if;
end $$;
