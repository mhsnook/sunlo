-- Enable trigram extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Materialized view for phrase search with pre-computed search text
-- This combines phrase text, translations, and tags for efficient searching
CREATE MATERIALIZED VIEW phrase_search_index AS
SELECT
  p.id,
  p.lang,
  p.text,
  p.created_at,
  COALESCE(pm.count_learners, 0) AS popularity,
  LOWER(
    COALESCE(p.text, '') || ' ' ||
    COALESCE(string_agg(DISTINCT t.text, ' '), '') || ' ' ||
    COALESCE(string_agg(DISTINCT tag.name, ' '), '')
  ) AS search_text
FROM phrase p
LEFT JOIN phrase_translation t ON t.phrase_id = p.id AND t.archived = false
LEFT JOIN phrase_tag pt ON pt.phrase_id = p.id
LEFT JOIN tag ON tag.id = pt.tag_id
LEFT JOIN phrase_meta pm ON pm.id = p.id
GROUP BY p.id, pm.count_learners;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX idx_phrase_search_id ON phrase_search_index(id);

-- Index for language filtering
CREATE INDEX idx_phrase_search_lang ON phrase_search_index(lang);

-- Trigram index for fast fuzzy text matching
CREATE INDEX idx_phrase_search_trgm ON phrase_search_index USING GIN (search_text gin_trgm_ops);

-- Index for popularity sorting
CREATE INDEX idx_phrase_search_popularity ON phrase_search_index(popularity DESC);

-- Index for cursor-based pagination
CREATE INDEX idx_phrase_search_cursor ON phrase_search_index(created_at DESC, id);


-- RPC function for smart phrase search with similarity ranking
-- Supports cursor-based pagination for infinite scroll
CREATE OR REPLACE FUNCTION search_phrases_smart(
  query TEXT,
  lang_filter TEXT,
  sort_by TEXT DEFAULT 'relevance',
  result_limit INT DEFAULT 20,
  cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  cursor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  similarity_score REAL,
  popularity_score INT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE
SECURITY DEFINER
AS $$
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
GRANT EXECUTE ON FUNCTION search_phrases_smart(TEXT, TEXT, TEXT, INT, TIMESTAMPTZ, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION search_phrases_smart(TEXT, TEXT, TEXT, INT, TIMESTAMPTZ, UUID) TO anon;


-- Function to refresh the materialized view
-- Called after phrase/translation/tag changes
CREATE OR REPLACE FUNCTION refresh_phrase_search_index()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY phrase_search_index;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION refresh_phrase_search_index() TO service_role;


-- Triggers to refresh the search index when data changes
-- Note: Using CONCURRENTLY requires the unique index we created above

-- Trigger function for phrase changes
CREATE OR REPLACE FUNCTION trigger_refresh_phrase_search()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Use pg_notify to debounce refreshes in production
  -- For now, refresh immediately (can be optimized later with a background job)
  PERFORM refresh_phrase_search_index();
  RETURN NULL;
END;
$$;

-- Create triggers on relevant tables
-- These fire AFTER changes to keep the search index up to date

CREATE TRIGGER refresh_search_on_phrase_change
AFTER INSERT OR UPDATE OR DELETE ON phrase
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_phrase_search();

CREATE TRIGGER refresh_search_on_translation_change
AFTER INSERT OR UPDATE OR DELETE ON phrase_translation
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_phrase_search();

CREATE TRIGGER refresh_search_on_tag_change
AFTER INSERT OR UPDATE OR DELETE ON phrase_tag
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_phrase_search();


-- Initial population of the materialized view
REFRESH MATERIALIZED VIEW phrase_search_index;
