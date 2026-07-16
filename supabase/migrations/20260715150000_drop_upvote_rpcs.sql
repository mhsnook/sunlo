-- Drop the set_*_upvote RPCs (#723 cleanup). Upvotes are now plain collection
-- actions: the client inserts/deletes its own row directly (RLS-scoped), the
-- (entity_id, uid) PK enforces one-per-user, and update_*_upvote_count triggers
-- keep the aggregate. The insert-or-delete-if-exists RPC wrapper is redundant.
drop function if exists public.set_phrase_request_upvote (uuid, text);

drop function if exists public.set_comment_upvote (uuid, text);

drop function if exists public.set_phrase_playlist_upvote (uuid, text);
