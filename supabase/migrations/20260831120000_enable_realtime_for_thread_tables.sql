-- Enable realtime for the thread tables a detail route binds: the comments
-- on a request, and the link rows that attach phrases to comments, playlists
-- and tags. Unlike the user tables (20260715130000), the client does not
-- stream these whole tables — a detail route opens one channel filtered to
-- its entity's id and tears it down on navigate. See docs/mutations.md
-- "Sync postures".
--
-- The publication rule (docs/database.md, enforced by
-- src/lib/realtime-publication.test.ts): a published table must not narrow
-- its SELECT policy on a soft-delete flag, or the UPDATE frame that flags a
-- row is withheld from everyone but its owner. So:
--
--   * `request_comment` publishes as-is — its policy is already
--     `using (true)`, because a removed comment is a blanked tombstone.
--   * The three link tables publish, and this migration re-opens the
--     SELECT policies 20260828120000 narrowed. That restores the exposure
--     these rows had before the soft-delete work — a link row is bare ids
--     and a flag, so a removed one leaks nothing — and it lets the removal
--     frame reach every subscriber. Live queries already read the `*Active`
--     derived collections, which filter the flag client-side.
--   * The entity rows themselves (`phrase_request`, `phrase_playlist`,
--     `phrase`, `phrase_translation`) stay unpublished: their policies hide
--     flagged rows' *content*, and that narrowing predates this branch.
--     Publishing them waits on the two-step delete design sketched in
--     docs/mutations.md.
drop policy if exists "Enable read access for all users" on public.phrase_tag;

create policy "Enable read access for all users" on public.phrase_tag for
select
	using (true);

drop policy if exists "Enable read access for all users" on public.playlist_phrase_link;

create policy "Enable read access for all users" on public.playlist_phrase_link for
select
	using (true);

drop policy if exists "Enable read access for all users" on public.comment_phrase_link;

create policy "Enable read access for all users" on public.comment_phrase_link for
select
	using (true);

-- Idempotent DO block per table (won't fail if a table is already present).
do $$
declare
  t text;
  tables text[] := array[
    'request_comment',
    'comment_phrase_link',
    'playlist_phrase_link',
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
