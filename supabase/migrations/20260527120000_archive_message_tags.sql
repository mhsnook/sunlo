-- Soft-delete (archive) for message_tag.
--
alter table public.message_tag
add column if not exists archived boolean not null default false;
