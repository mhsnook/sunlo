-- Move trigram search onto search_corpus (single source of truth for both
-- semantic and lexical search) and drop the old phrase_search_index
-- materialized view + search_phrases_smart RPC.
--
-- Why: search_corpus already has rows for phrases, translations
-- (deduped under their parent phrase via entity_id), requests, and
-- playlists. Indexing search_corpus.text_normalized with pg_trgm gives
-- us trigram matching across all three entity types in one shot —
-- which is what the /search route's playlist + request rows have been
-- approximating with a local textMatchScore heuristic.
--
-- The trigger-driven phrase_search_index is no longer needed; the new
-- backfill script keeps search_corpus in step (and a future sync
-- pipeline will replace the manual backfill — see search_corpus.sql).
-- ----------------------------------------------------------------------
-- Drop the old triggers + functions + materialized view.
drop trigger if exists "refresh_search_on_phrase_change" on "public"."phrase";

drop trigger if exists "refresh_search_on_translation_change" on "public"."phrase_translation";

drop trigger if exists "refresh_search_on_tag_change" on "public"."phrase_tag";

drop function if exists "public"."trigger_refresh_phrase_search" ();

drop function if exists "public"."refresh_phrase_search_index" ();

drop function if exists "public"."search_phrases_smart" (text, text[], text, int, timestamptz, uuid);

drop materialized view if exists "public"."phrase_search_index";

-- ----------------------------------------------------------------------
-- pg_trgm index on search_corpus.text_normalized. Same operator class
-- as the old phrase_search_index used (gin + gin_trgm_ops).
create extension if not exists pg_trgm;

create index if not exists "search_corpus_text_normalized_trgm_idx" on "public"."search_corpus" using gin (text_normalized gin_trgm_ops);

-- ----------------------------------------------------------------------
-- search_by_trigram: lexical search across all entity types.
--
-- Mirrors search_by_query's shape (return columns, dedup-by-entity_id
-- contract, archive/delete liveness check via existence subquery,
-- target_langs / exclude_ids filtering). The match scoring uses the
-- same boost structure as the old search_phrases_smart — base trigram
-- similarity + ILIKE substring/prefix/word-boundary boosts. Cursor
-- pagination by (created_at, entity_id) gives stable page boundaries.
--
-- Returns the same shape as search_by_query so consumers can reuse a
-- single CorpusMatch type for both.
-- ----------------------------------------------------------------------
create or replace function "public"."search_by_trigram" (
	query text,
	target_langs text[] default null,
	exclude_ids uuid[] default '{}'::uuid[],
	match_limit int default 20,
	cursor_created_at timestamptz default null,
	cursor_id uuid default null
) returns table (
	entity_type text,
	entity_id uuid,
	matched_via text,
	matched_text text,
	matched_lang text,
	similarity real,
	created_at timestamptz
) language plpgsql stable security invoker as $$
declare
	normalized_query text;
begin
	normalized_query := lower(trim(query));
	if length(normalized_query) < 2 then
		return;
	end if;

	return query
	with match_pool as (
		select
			cc.entity_id,
			cc.entity_type,
			cc.source_type,
			cc.text as matched_text,
			cc.text_lang as matched_lang,
			cc.created_at,
			greatest(
				similarity(cc.text_normalized, normalized_query),
				case when cc.text_normalized ilike '%' || normalized_query || '%' then 0.4 else 0 end,
				case when cc.text_normalized ilike normalized_query || '%' then 0.6 else 0 end,
				case when cc.text_normalized ilike '% ' || normalized_query || '%' then 0.5 else 0 end
			) as sim_score
		from search_corpus cc
		where (target_langs is null or cc.entity_lang = any(target_langs))
			and cc.entity_id <> all(exclude_ids)
			and (
				cc.text_normalized ilike '%' || normalized_query || '%'
				or similarity(cc.text_normalized, normalized_query) > 0.1
			)
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
		select distinct on (lp.entity_id)
			lp.entity_id,
			lp.entity_type,
			lp.source_type,
			lp.matched_text,
			lp.matched_lang,
			lp.sim_score,
			lp.created_at
		from live_pool lp
		order by lp.entity_id, lp.sim_score desc
	)
	select
		d.entity_type,
		d.entity_id,
		d.source_type as matched_via,
		d.matched_text,
		d.matched_lang,
		d.sim_score::real as similarity,
		d.created_at
	from deduped d
	where (cursor_created_at is null and cursor_id is null)
		or (d.created_at, d.entity_id) < (cursor_created_at, cursor_id)
	order by d.sim_score desc, d.created_at desc, d.entity_id desc
	limit match_limit;
end;
$$;

alter function "public"."search_by_trigram" (text, text[], uuid[], int, timestamptz, uuid) owner to "postgres";

grant
execute on function "public"."search_by_trigram" (text, text[], uuid[], int, timestamptz, uuid) to anon,
authenticated;
