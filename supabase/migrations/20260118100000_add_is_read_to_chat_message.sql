-- Add is_read column to chat_message table for read/unread status tracking
alter table public.chat_message
add column is_read boolean not null default false;

-- Create index for efficient unread message queries
create index chat_message_recipient_is_read_idx on public.chat_message (recipient_uid, is_read)
where
	is_read = false;

-- Allow recipients to update is_read status on their messages
create policy "Recipients can mark messages as read" on public.chat_message
for update
	using (recipient_uid = auth.uid ())
with
	check (recipient_uid = auth.uid ());
