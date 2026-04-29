-- Chat prototype: isolated semantic-search corpus.
--
-- Throwaway-friendly: one new table holds denormalized phrase + translation
-- text plus BGE-M3 embeddings (1024d). When the prototype graduates, this is
-- replaced by a sync pipeline against the live phrase / phrase_translation
-- tables. Until then, populate via scripts/backfill-chat-corpus.ts.
create extension if not exists vector;

create table if not exists "public"."chat_corpus" (
	"id" uuid primary key default gen_random_uuid(),
	"source_type" text not null check (source_type in ('phrase', 'translation')),
	"source_id" uuid not null,
	"phrase_id" uuid not null,
	"lang" text not null,
	"text" text not null,
	"text_normalized" text not null,
	"embedding" vector (1024) not null,
	"created_at" timestamptz not null default now(),
	unique (source_type, source_id)
);

alter table "public"."chat_corpus" owner to "postgres";

create index if not exists "chat_corpus_phrase_id_idx" on "public"."chat_corpus" ("phrase_id");

create index if not exists "chat_corpus_lang_idx" on "public"."chat_corpus" ("lang");

-- HNSW index for cosine similarity. Default m/ef_construction are fine for
-- prototype scale (~few thousand rows).
create index if not exists "chat_corpus_embedding_hnsw_idx" on "public"."chat_corpus" using hnsw (embedding vector_cosine_ops);

-- Public read access — chat_corpus contains no user data, just denormalized
-- public phrase content. Writes go through the service role only (backfill
-- script and future sync pipeline).
alter table "public"."chat_corpus" enable row level security;

create policy "chat_corpus_public_read" on "public"."chat_corpus" for
select
	to anon,
	authenticated using (true);

grant
select
	on "public"."chat_corpus" to anon,
	authenticated;

-- Text-query path: caller (Edge Function) embeds the user's query via Workers
-- AI BGE-M3 and passes the vector here.
--
-- Match strategy:
--   1. Pull top match_limit*5 corpus rows by cosine distance (HNSW-indexed).
--      A row may be a phrase OR a translation — we cast a wide net and
--      dedupe at the phrase level afterwards.
--   2. Dedupe by phrase_id, keeping the best-scoring corpus row per phrase
--      (so a phrase whose translation matched well doesn't get double-counted).
--   3. Filter the result phrases by archived = false and target language.
--   4. Sort by similarity, take top match_limit.
create or replace function "public"."chat_search" (
	query_embedding vector (1024),
	target_lang text,
	exclude_pids uuid[] default '{}'::uuid[],
	match_limit int default 20
) returns table (
	phrase_id uuid,
	matched_via text,
	matched_text text,
	matched_lang text,
	similarity real
) language sql stable security invoker as $$
	with match_pool as (
		select
			cc.phrase_id,
			cc.source_type,
			cc.text as matched_text,
			cc.lang as matched_lang,
			1 - (cc.embedding <=> query_embedding) as similarity
		from chat_corpus cc
		join phrase p on p.id = cc.phrase_id
		where p.archived = false
			and p.lang = target_lang
			and cc.phrase_id <> all(exclude_pids)
		order by cc.embedding <=> query_embedding
		limit match_limit * 5
	),
	deduped as (
		select distinct on (phrase_id)
			phrase_id, source_type, matched_text, matched_lang, similarity
		from match_pool
		order by phrase_id, similarity desc
	)
	select
		phrase_id,
		source_type as matched_via,
		matched_text,
		matched_lang,
		similarity::real
	from deduped
	order by similarity desc
	limit match_limit;
$$;

alter function "public"."chat_search" (vector, text, uuid[], int) owner to "postgres";

grant
execute on function "public"."chat_search" (vector, text, uuid[], int) to anon,
authenticated;

-- Anchor pivot path: caller passes phrase IDs the user has selected; we
-- compute the mean phrase embedding inside SQL and search with it. Avoids
-- shipping 1024-dim vectors back to the Edge Function just to mean-pool
-- them in JS.
create or replace function "public"."chat_anchor_search" (
	anchor_pids uuid[],
	target_lang text,
	exclude_pids uuid[] default '{}'::uuid[],
	match_limit int default 20
) returns table (
	phrase_id uuid,
	matched_via text,
	matched_text text,
	matched_lang text,
	similarity real
) language plpgsql stable security invoker as $$
declare
	avg_embedding vector(1024);
begin
	-- Average over the phrase-level rows only (not translations) so the
	-- pivot reflects the source-language meaning of the selected phrases.
	select avg(embedding) into avg_embedding
	from chat_corpus
	where source_type = 'phrase' and phrase_id = any(anchor_pids);

	if avg_embedding is null then
		return;
	end if;

	return query
	select * from chat_search(
		avg_embedding,
		target_lang,
		exclude_pids,
		match_limit
	);
end;
$$;

alter function "public"."chat_anchor_search" (uuid[], text, uuid[], int) owner to "postgres";

grant
execute on function "public"."chat_anchor_search" (uuid[], text, uuid[], int) to anon,
authenticated;
