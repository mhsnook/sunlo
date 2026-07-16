-- Enable realtime for the user-specific tables (#723).
-- These stream INSERT/UPDATE/DELETE events, scoped per-subscriber by RLS,
-- so the client can maintain its collections directly instead of refetching.
-- friend_request_action + chat_message + notification are already published
-- (see 20260120100000, 20260331120000).
--
-- Idempotent DO block per table (won't fail if a table is already present).
do $$
declare
  t text;
  tables text[] := array[
    'user_deck',
    'user_card',
    'user_card_review',
    'user_deck_review_state',
    'phrase_request_upvote',
    'comment_upvote',
    'phrase_playlist_upvote'
  ];
begin
  foreach t in array tables loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = t
    ) then
      execute format(
        'alter publication "supabase_realtime" add table only "public".%I',
        t
      );
    end if;
  end loop;
end $$;
