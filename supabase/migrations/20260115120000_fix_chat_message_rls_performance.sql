-- Fix RLS performance for chat_message table
-- Replace auth.uid() with (select auth.uid()) to evaluate once per query instead of per row
-- Drop existing policies
drop policy if exists "Users can view their own chat messages" on public.chat_message;

drop policy if exists "Users can send messages to friends" on public.chat_message;

-- Recreate policies with optimized auth.uid() calls
create policy "Users can view their own chat messages" on public.chat_message for
select
	using (
		(
			select
				auth.uid ()
		) = sender_uid
		or (
			select
				auth.uid ()
		) = recipient_uid
	);

create policy "Users can send messages to friends" on public.chat_message for insert
with
	check (
		(
			select
				auth.uid ()
		) = sender_uid
		and public.are_friends (sender_uid, recipient_uid)
	);
