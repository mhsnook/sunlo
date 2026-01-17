-- Add playlist support to chat messages
-- Add 'playlist' to the chat_message_type enum
alter type public.chat_message_type
add value if not exists 'playlist';

-- Add playlist_id column to chat_message table
alter table public.chat_message
add column if not exists playlist_id uuid references public.phrase_playlist (id) on delete set null;

-- Create index for playlist_id lookups
create index if not exists chat_message_playlist_id_idx on public.chat_message (playlist_id);
