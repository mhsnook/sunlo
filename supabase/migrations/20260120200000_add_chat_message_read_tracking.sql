-- Add read_at column to track when a message was read by the recipient
-- A null value means the message is unread
alter table public.chat_message
add column read_at timestamp with time zone;

comment on column public.chat_message.read_at is 'Timestamp when the recipient read the message. Null means unread.';

-- Create index for efficient unread message queries
create index chat_message_unread_idx on public.chat_message (recipient_uid, read_at)
where
	read_at is null;

-- RLS policy for updating read_at (only recipient can mark as read)
create policy "Recipients can mark messages as read" on public.chat_message
for update
	using (
		(
			select
				auth.uid ()
		) = recipient_uid
	)
with
	check (
		(
			select
				auth.uid ()
		) = recipient_uid
	);
