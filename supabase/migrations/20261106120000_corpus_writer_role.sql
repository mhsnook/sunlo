-- A role that can write search_corpus and nothing else, for the
-- embed-corpus-row Edge Function in place of the service-role key.
--
-- The function connects as corpus_writer through Supabase's transaction
-- pooler (CORPUS_WRITER_DB_URL). The role gets no password here: the owner
-- sets one in the SQL editor after the release, and locally with one psql
-- command (docs/deployment.md, "The embedder's database connection"). The
-- role has `login`, so this uses an `if not exists` guard: a role outlives
-- the database on a local `db reset`.
do $$
begin
  if not exists (select from pg_roles where rolname = 'corpus_writer') then
    create role corpus_writer login noinherit;
  end if;
end $$;

grant usage on schema public to corpus_writer;

-- select is needed by `delete ... where` and `insert ... on conflict do update`.
grant
select
,
	insert,
update,
delete on table public.search_corpus to corpus_writer;

-- search_corpus has RLS, and its only other policy is the public read.
create policy "corpus_writer_all" on public.search_corpus for all to corpus_writer using (true)
with
	check (true);
