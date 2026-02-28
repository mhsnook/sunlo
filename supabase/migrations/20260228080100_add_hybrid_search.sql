-- Phase 2: Hybrid Search RPC
-- Combines existing trigram search with vector similarity search
-- using Reciprocal Rank Fusion (RRF) for result merging.
create or replace function search_phrases_hybrid (
	query_text text,
	query_embedding extensions.vector (1024) default null,
	lang_filter text default null,
	semantic_weight real default 0.5,
	result_limit int default 20,
	cursor_created_at timestamptz default null,
	cursor_id uuid default null
) returns table (
	id uuid,
	trigram_score real,
	semantic_score real,
	combined_score real,
	popularity_score int,
	created_at timestamptz
) language plpgsql stable as $$
DECLARE
  normalized_query TEXT;
  k CONSTANT INT := 60; -- RRF constant (standard value)
BEGIN
  normalized_query := LOWER(TRIM(query_text));

  IF normalized_query = '' OR LENGTH(normalized_query) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH
  -- Trigram search (reuses logic from search_phrases_smart)
  trigram_results AS (
    SELECT
      psi.id,
      psi.created_at,
      psi.popularity,
      GREATEST(
        similarity(psi.search_text, normalized_query),
        CASE WHEN psi.search_text ILIKE '%' || normalized_query || '%' THEN 0.4 ELSE 0 END,
        CASE WHEN psi.search_text ILIKE normalized_query || '%' THEN 0.6 ELSE 0 END,
        CASE WHEN psi.search_text ILIKE '% ' || normalized_query || '%' THEN 0.5 ELSE 0 END
      ) AS score,
      ROW_NUMBER() OVER (ORDER BY
        GREATEST(
          similarity(psi.search_text, normalized_query),
          CASE WHEN psi.search_text ILIKE '%' || normalized_query || '%' THEN 0.4 ELSE 0 END,
          CASE WHEN psi.search_text ILIKE normalized_query || '%' THEN 0.6 ELSE 0 END,
          CASE WHEN psi.search_text ILIKE '% ' || normalized_query || '%' THEN 0.5 ELSE 0 END
        ) DESC
      ) AS rank
    FROM phrase_search_index psi
    WHERE
      (lang_filter IS NULL OR psi.lang = lang_filter)
      AND (
        psi.search_text ILIKE '%' || normalized_query || '%'
        OR similarity(psi.search_text, normalized_query) > 0.1
      )
    LIMIT result_limit * 3
  ),

  -- Vector similarity search (only if embedding provided)
  vector_results AS (
    SELECT
      pe.phrase_id AS id,
      p.created_at,
      COALESCE(pm.count_learners, 0)::INT AS popularity,
      (1.0 - (pe.embedding <=> query_embedding))::REAL AS score,
      ROW_NUMBER() OVER (ORDER BY pe.embedding <=> query_embedding) AS rank
    FROM phrase_embedding pe
    JOIN phrase p ON p.id = pe.phrase_id
    LEFT JOIN phrase_meta pm ON pm.id = pe.phrase_id
    JOIN embedding_config ec ON ec.id = pe.config_id AND ec.is_active = true
    WHERE
      query_embedding IS NOT NULL
      AND (lang_filter IS NULL OR p.lang = lang_filter)
      AND (1.0 - (pe.embedding <=> query_embedding)) > 0.15
    ORDER BY pe.embedding <=> query_embedding
    LIMIT result_limit * 3
  ),

  -- Reciprocal Rank Fusion: combine both result sets
  fused AS (
    SELECT
      COALESCE(t.id, v.id) AS id,
      COALESCE(t.created_at, v.created_at) AS created_at,
      COALESCE(t.popularity, v.popularity, 0) AS popularity,
      COALESCE(t.score, 0)::REAL AS t_score,
      COALESCE(v.score, 0)::REAL AS v_score,
      -- RRF formula: 1/(k+rank), weighted by semantic_weight
      (
        (1.0 - semantic_weight) * COALESCE(1.0 / (k + t.rank), 0) +
        semantic_weight * COALESCE(1.0 / (k + v.rank), 0)
      )::REAL AS rrf_score
    FROM trigram_results t
    FULL OUTER JOIN vector_results v ON t.id = v.id
  )

  SELECT
    fused.id,
    fused.t_score AS trigram_score,
    fused.v_score AS semantic_score,
    fused.rrf_score AS combined_score,
    fused.popularity::INT AS popularity_score,
    fused.created_at
  FROM fused
  WHERE
    (cursor_created_at IS NULL AND cursor_id IS NULL)
    OR (fused.created_at, fused.id) < (cursor_created_at, cursor_id)
  ORDER BY
    fused.rrf_score DESC,
    fused.created_at DESC,
    fused.id DESC
  LIMIT result_limit;
END;
$$;

-- Grant execute to authenticated and anon
grant
execute on function search_phrases_hybrid (text, extensions.vector, text, real, int, timestamptz, uuid) to authenticated;

grant
execute on function search_phrases_hybrid (text, extensions.vector, text, real, int, timestamptz, uuid) to anon;
