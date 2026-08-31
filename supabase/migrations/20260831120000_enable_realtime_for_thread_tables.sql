-- Enable realtime for the thread tables: the entity a detail route shows and
-- the rows that hang on it (comments, phrase links, translations, tags).
-- Unlike the user tables (20260715130000), the client does not stream these
-- whole tables — a detail route opens one channel filtered to its entity's id
-- and tears it down on navigate. See docs/mutations.md "Sync postures".
--
-- All of these tables carry a public read policy, so RLS passes every
-- INSERT/UPDATE frame through to every subscriber. DELETE stays unbound on
-- the client (frames carry only the primary key and skip RLS).
--
-- Idempotent DO block per table (won't fail if a table is already present).
do $$
declare
  t text;
  tables text[] := array[
    'phrase_request',
    'request_comment',
    'comment_phrase_link',
    'phrase_playlist',
    'playlist_phrase_link',
    'phrase',
    'phrase_translation',
    'phrase_tag'
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
