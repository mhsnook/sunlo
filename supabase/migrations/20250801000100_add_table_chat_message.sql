-- Create the ENUM type for chat message types
create type public.chat_message_type as enum('recommendation', 'accepted');

create table public.chat_message (
	id uuid default gen_random_uuid() not null primary key,
	created_at timestamp with time zone not null default now(),
	sender_uid uuid not null default auth.uid () references public.user_profile (uid) on delete cascade,
	recipient_uid uuid not null references public.user_profile (uid) on delete cascade,
	message_type public.chat_message_type not null,
	phrase_id uuid references public.phrase (id) on delete set null,
	related_message_id uuid references public.chat_message (id) on delete set null,
	content jsonb,
	constraint uids_are_different check (sender_uid <> recipient_uid)
);

-- Add comments to explain the columns
comment on column public.chat_message.sender_uid is 'The user who sent the message.';

comment on column public.chat_message.recipient_uid is 'The user who received the message.';

comment on column public.chat_message.message_type is 'The type of message, e.g., a phrase recommendation.';

comment on column public.chat_message.phrase_id is 'If it''s a recommendation, this links to the phrase.';

comment on column public.chat_message.related_message_id is 'If this message is a reply/reaction to another (e.g. accepting a recommendation).';

comment on column public.chat_message.content is 'Flexible JSONB for extra data, like the text of an accepted phrase.';

-- Add indexes for performance
create index on public.chat_message (sender_uid, recipient_uid, created_at desc);

create index on public.chat_message (recipient_uid, sender_uid, created_at desc);

-- Helper function to check for friendship
create or replace function public.are_friends (uid1 uuid, uid2 uuid) returns boolean language sql security definer as $$
  SELECT EXISTS (
    SELECT 1
    FROM public.friend_summary
    WHERE
      status = 'friends' AND
      (
        (uid_less = uid1 AND uid_more = uid2) OR
        (uid_less = uid2 AND uid_more = uid1)
      )
  );
$$;

alter table public.chat_message enable row level security;

create policy "Users can view their own chat messages" on public.chat_message for
select
	using (
		auth.uid () = sender_uid
		or auth.uid () = recipient_uid
	);

create policy "Users can send messages to friends" on public.chat_message for insert
with
	check (
		auth.uid () = sender_uid
		and public.are_friends (sender_uid, recipient_uid)
	);
