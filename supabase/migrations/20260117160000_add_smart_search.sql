-- Enable trigram extension for fuzzy text matching
create extension if not exists pg_trgm;

-- Materialized view for phrase search with pre-computed search text
-- This combines phrase text, translations, and tags for efficient searching
create materialized view if not exists phrase_search_index as
select
	p.id,
	p.lang,
	p.text,
	p.created_at,
	coalesce(pm.count_learners, 0) as popularity,
	lower(
		coalesce(p.text, '') || ' ' || coalesce(string_agg(distinct t.text, ' '), '') || ' ' || coalesce(string_agg(distinct tag.name, ' '), '')
	) as search_text
from
	phrase p
	left join phrase_translation t on t.phrase_id = p.id
	and t.archived = false
	left join phrase_tag pt on pt.phrase_id = p.id
	left join tag on tag.id = pt.tag_id
	left join phrase_meta pm on pm.id = p.id
group by
	p.id,
	pm.count_learners;

-- Create unique index for concurrent refresh
create unique index idx_phrase_search_id on phrase_search_index (id);

-- Index for language filtering
create index idx_phrase_search_lang on phrase_search_index (lang);

-- Trigram index for fast fuzzy text matching
create index idx_phrase_search_trgm on phrase_search_index using gin (search_text gin_trgm_ops);

-- Index for popularity sorting
create index idx_phrase_search_popularity on phrase_search_index (popularity desc);

-- Index for cursor-based pagination
create index idx_phrase_search_cursor on phrase_search_index (created_at desc, id);

-- Grant read access to the materialized view
grant
select
	on phrase_search_index to authenticated,
	anon;

-- RPC function for smart phrase search with similarity ranking
-- Supports cursor-based pagination for infinite scroll
create or replace function search_phrases_smart (
	query text,
	lang_filter text,
	sort_by text default 'relevance',
	result_limit int default 20,
	cursor_created_at timestamptz default null,
	cursor_id uuid default null
) returns table (
	id uuid,
	similarity_score real,
	popularity_score int,
	created_at timestamptz
) language plpgsql stable as $$
DECLARE
  normalized_query TEXT;
BEGIN
  -- Normalize query: lowercase and trim
  normalized_query := LOWER(TRIM(query));

  -- Early exit for empty or too-short queries
  IF normalized_query = '' OR LENGTH(normalized_query) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH scored AS (
    SELECT
      psi.id,
      psi.created_at,
      psi.popularity,
      -- Compute similarity score with boosts for different match types
      GREATEST(
        -- Base trigram similarity
        similarity(psi.search_text, normalized_query),
        -- Boost for exact substring matches
        CASE WHEN psi.search_text ILIKE '%' || normalized_query || '%' THEN 0.4 ELSE 0 END,
        -- Boost for prefix matches (word starts with query)
        CASE WHEN psi.search_text ILIKE normalized_query || '%' THEN 0.6 ELSE 0 END,
        -- Boost for word-boundary matches
        CASE WHEN psi.search_text ILIKE '% ' || normalized_query || '%' THEN 0.5 ELSE 0 END
      ) AS sim_score
    FROM phrase_search_index psi
    WHERE
      psi.lang = lang_filter
      AND (
        -- Match via substring OR trigram similarity
        psi.search_text ILIKE '%' || normalized_query || '%'
        OR similarity(psi.search_text, normalized_query) > 0.1
      )
  )
  SELECT
    scored.id,
    scored.sim_score::REAL AS similarity_score,
    scored.popularity::INT AS popularity_score,
    scored.created_at
  FROM scored
  WHERE
    -- Cursor-based pagination: skip items we've already seen
    (cursor_created_at IS NULL AND cursor_id IS NULL)
    OR (scored.created_at, scored.id) < (cursor_created_at, cursor_id)
  ORDER BY
    -- Primary sort by user preference
    CASE WHEN sort_by = 'relevance' THEN scored.sim_score END DESC NULLS LAST,
    CASE WHEN sort_by = 'popularity' THEN scored.popularity END DESC NULLS LAST,
    -- Secondary sort for stable pagination
    scored.created_at DESC,
    scored.id DESC
  LIMIT result_limit;
END;
$$;

-- Grant execute permission to authenticated users
grant
execute on function search_phrases_smart (text, text, text, int, timestamptz, uuid) to authenticated;

grant
execute on function search_phrases_smart (text, text, text, int, timestamptz, uuid) to anon;

-- Function to refresh the materialized view
-- Called after phrase/translation/tag changes
create or replace function refresh_phrase_search_index () returns void language plpgsql security definer as $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY phrase_search_index;
END;
$$;

-- Grant execute permission
grant
execute on function refresh_phrase_search_index () to service_role;

-- Triggers to refresh the search index when data changes
-- Note: Using CONCURRENTLY requires the unique index we created above
-- Trigger function for phrase changes
create or replace function trigger_refresh_phrase_search () returns trigger language plpgsql security definer as $$
BEGIN
  -- Use pg_notify to debounce refreshes in production
  -- For now, refresh immediately (can be optimized later with a background job)
  PERFORM refresh_phrase_search_index();
  RETURN NULL;
END;
$$;

-- Create triggers on relevant tables
-- These fire AFTER changes to keep the search index up to date
create trigger refresh_search_on_phrase_change
after insert
or
update
or delete on phrase for each statement
execute function trigger_refresh_phrase_search ();

create trigger refresh_search_on_translation_change
after insert
or
update
or delete on phrase_translation for each statement
execute function trigger_refresh_phrase_search ();

create trigger refresh_search_on_tag_change
after insert
or
update
or delete on phrase_tag for each statement
execute function trigger_refresh_phrase_search ();

-- Initial population of the materialized view
refresh materialized view phrase_search_index;
