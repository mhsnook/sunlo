-- Let admins read a removed request or playlist.
--
-- `phrase` and `phrase_translation` already end their SELECT policies with
-- `is_admin()`, which is what makes the admin moderation screens work. The
-- two `deleted` tables never got that clause, so an admin could only ever
-- fetch a removed row they had written themselves. Two admin controls read
-- as working and cannot: the "show archived" toggle on
-- `/admin/$lang/requests` lists nothing but the admin's own removed
-- requests, and the restore button on the request detail page is
-- unreachable once the page is reloaded.
--
-- Neither table is in the realtime publication, so opening the policy this
-- way does not trip the rule in docs/database.md "Gotchas".
drop policy if exists "Enable read access for all users" on public.phrase_request;

create policy "Enable read access for all users" on public.phrase_request for
select
	using (
		(
			("deleted" = false)
			or ("requester_uid" = "auth"."uid" ())
			or "public"."is_admin" ()
		)
	);

drop policy if exists "Enable read access for all users" on public.phrase_playlist;

create policy "Enable read access for all users" on public.phrase_playlist for
select
	using (
		(
			("deleted" = false)
			or ("uid" = "auth"."uid" ())
			or "public"."is_admin" ()
		)
	);
