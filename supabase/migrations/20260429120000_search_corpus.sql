-- Search corpus: a single denormalized table of all searchable entities
-- (phrases, translations, requests) with their BGE-M3 embeddings (1024d).
--
-- Each row is one searchable text unit. Multiple rows can map to the same
-- "entity" (e.g., a phrase plus N of its translations); the search RPCs
-- dedupe by entity_id so a translation match doesn't double-count its
-- parent phrase.
--
-- Throwaway-friendly: populate via scripts/backfill-chat-corpus.ts. When
-- the prototype graduates, this is replaced by a sync pipeline that keeps
-- search_corpus in step with the underlying phrase / phrase_translation /
-- phrase_request tables.
create extension if not exists vector;

create table if not exists "public"."search_corpus" (
	"id" uuid primary key default gen_random_uuid(),
	-- Which source table this row came from. Drives backfill ingestion and
	-- shows up in search results as `matched_via` (which kind of text matched).
	"source_type" text not null check (source_type in ('phrase', 'translation', 'request', 'playlist')),
	"source_id" uuid not null,
	-- The downstream entity this row "belongs to". For phrase rows: own id.
	-- For translation rows: parent phrase's id (so translation matches roll
	-- up under their phrase). For request rows: own id.
	"entity_id" uuid not null,
	-- 'phrase' for phrase + translation rows; 'request' for request rows.
	-- The result side uses this to route to the right detail page.
	"entity_type" text not null check (entity_type in ('phrase', 'request', 'playlist')),
	-- Lang of the OWNING entity (used to filter search results). For a
	-- Hindi phrase's English translation row, entity_lang='hin' (the
	-- phrase's lang). Denormalized — doesn't auto-update if a phrase's
	-- lang changes (which doesn't happen in practice).
	"entity_lang" text not null,
	-- Lang of THIS row's text (used for display via matched_lang in
	-- result rows). Differs from entity_lang only on translation rows.
	"text_lang" text not null,
	"text" text not null,
	"text_normalized" text not null,
	"embedding" vector (1024) not null,
	"created_at" timestamptz not null default now(),
	unique (source_type, source_id)
);

alter table "public"."search_corpus" owner to "postgres";

create index if not exists "search_corpus_entity_id_idx" on "public"."search_corpus" ("entity_id");

create index if not exists "search_corpus_entity_type_idx" on "public"."search_corpus" ("entity_type");

create index if not exists "search_corpus_entity_lang_idx" on "public"."search_corpus" ("entity_lang");

-- HNSW index for cosine similarity. Defaults are fine for prototype scale.
create index if not exists "search_corpus_embedding_hnsw_idx" on "public"."search_corpus" using hnsw (embedding vector_cosine_ops);

-- Public read access — search_corpus is denormalized public content; no
-- user data. Writes go through the service role only (backfill script /
-- future sync pipeline).
alter table "public"."search_corpus" enable row level security;

create policy "search_corpus_public_read" on "public"."search_corpus" for
select
	to anon,
	authenticated using (true);

grant
select
	on "public"."search_corpus" to anon,
	authenticated;

-- ----------------------------------------------------------------------
-- search_by_query: text-style semantic search.
--
-- Caller (Edge Function) embeds the user's query via Workers AI BGE-M3
-- and passes the vector here. target_langs filters the RESULT entities
-- (not the match candidates) so cross-language matches still work — e.g.
-- searching "let's go" matches the English translation row of a Hindi
-- phrase, then the entity_lang filter keeps it iff 'hin' is in
-- target_langs. Pass null for target_langs to skip lang filtering
-- (search across all langs).
--
-- Match strategy:
--   1. Pull top match_limit*5 corpus rows by cosine distance, gated by
--      target_langs and exclude_ids.
--   2. Filter out archived phrases / deleted requests via existence check.
--   3. Dedupe by entity_id, keeping the best-scoring row per entity.
--   4. Sort by similarity, take top match_limit.
-- ----------------------------------------------------------------------
create or replace function "public"."search_by_query" (
	query_embedding vector (1024),
	target_langs text[] default null,
	exclude_ids uuid[] default '{}'::uuid[],
	match_limit int default 20
) returns table (
	entity_type text,
	entity_id uuid,
	matched_via text,
	matched_text text,
	matched_lang text,
	similarity real
) language sql stable security invoker as $$
	with match_pool as (
		select
			cc.entity_id,
			cc.entity_type,
			cc.source_type,
			cc.text as matched_text,
			cc.text_lang as matched_lang,
			1 - (cc.embedding <=> query_embedding) as similarity
		from search_corpus cc
		where (target_langs is null or cc.entity_lang = any(target_langs))
			and cc.entity_id <> all(exclude_ids)
		order by cc.embedding <=> query_embedding
		limit match_limit * 5
	),
	live_pool as (
		select mp.* from match_pool mp
		where (
			mp.entity_type = 'phrase'
			and exists (
				select 1 from phrase
				where id = mp.entity_id and archived = false
			)
		) or (
			mp.entity_type = 'request'
			and exists (
				select 1 from phrase_request
				where id = mp.entity_id and deleted = false
			)
		) or (
			mp.entity_type = 'playlist'
			and exists (
				select 1 from phrase_playlist
				where id = mp.entity_id and deleted = false
			)
		)
	),
	deduped as (
		select distinct on (entity_id)
			entity_id, entity_type, source_type, matched_text, matched_lang, similarity
		from live_pool
		order by entity_id, similarity desc
	)
	select
		entity_type,
		entity_id,
		source_type as matched_via,
		matched_text,
		matched_lang,
		similarity::real
	from deduped
	order by similarity desc
	limit match_limit;
$$;

alter function "public"."search_by_query" (vector, text[], uuid[], int) owner to "postgres";

grant
execute on function "public"."search_by_query" (vector, text[], uuid[], int) to anon,
authenticated;

-- ----------------------------------------------------------------------
-- search_by_anchors: "more like these" semantic search.
--
-- Accepts any entity_ids — phrases, requests, anything in search_corpus.
-- Computes the mean embedding from the primary corpus rows for those
-- entities (source_type IN ('phrase', 'request') — not translations,
-- which represent the entity in *other* languages and would dilute the
-- centroid). Then delegates to search_by_query with that mean.
--
-- Use cases:
--   - Cart-pivot in /chats: user adds phrases to cart, hits "more like
--     these"
--   - "Top phrase suggestions for your request": pass the new request id
--     as the anchor right after submission to surface phrases that
--     semantically match the request's prompt.
--
-- Future input-shaping might happen here (e.g., weight anchor rows by
-- upvotes before averaging). Keeping this as its own function leaves
-- room for that without churning the simpler text-query path.
-- ----------------------------------------------------------------------
create or replace function "public"."search_by_anchors" (
	anchor_ids uuid[],
	target_langs text[] default null,
	exclude_ids uuid[] default '{}'::uuid[],
	match_limit int default 20
) returns table (
	entity_type text,
	entity_id uuid,
	matched_via text,
	matched_text text,
	matched_lang text,
	similarity real
) language plpgsql stable security invoker as $$
declare
	avg_embedding vector(1024);
begin
	-- Average over primary rows (phrase + request + playlist), not
	-- translations. Translations capture the entity's meaning in another
	-- language; including them in the centroid would smear the semantic
	-- anchor toward whatever target language the translations happen to
	-- be in.
	select avg(embedding) into avg_embedding
	from search_corpus
	where source_type in ('phrase', 'request', 'playlist')
		and entity_id = any(anchor_ids);

	if avg_embedding is null then
		return;
	end if;

	return query
	select * from search_by_query(
		avg_embedding,
		target_langs,
		exclude_ids,
		match_limit
	);
end;
$$;

alter function "public"."search_by_anchors" (uuid[], text[], uuid[], int) owner to "postgres";

grant
execute on function "public"."search_by_anchors" (uuid[], text[], uuid[], int) to anon,
authenticated;
