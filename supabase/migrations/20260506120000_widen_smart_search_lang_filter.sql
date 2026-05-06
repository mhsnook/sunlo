-- Widen search_phrases_smart's lang_filter from a single text to text[]
-- to match the semantic RPC's contract (search_by_query, search_by_anchors).
-- null = search across all langs; array = filter to those langs.
--
-- Postgres can't change a function's signature via `create or replace`,
-- so the old definition gets dropped first.
drop function if exists "public"."search_phrases_smart" (text, text, text, int, timestamptz, uuid);

create or replace function "public"."search_phrases_smart" (
	query text,
	lang_filter text[] default null,
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
  normalized_query := LOWER(TRIM(query));

  IF normalized_query = '' OR LENGTH(normalized_query) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH scored AS (
    SELECT
      psi.id,
      psi.created_at,
      psi.popularity,
      GREATEST(
        similarity(psi.search_text, normalized_query),
        CASE WHEN psi.search_text ILIKE '%' || normalized_query || '%' THEN 0.4 ELSE 0 END,
        CASE WHEN psi.search_text ILIKE normalized_query || '%' THEN 0.6 ELSE 0 END,
        CASE WHEN psi.search_text ILIKE '% ' || normalized_query || '%' THEN 0.5 ELSE 0 END
      ) AS sim_score
    FROM phrase_search_index psi
    WHERE
      (lang_filter IS NULL OR psi.lang = ANY(lang_filter))
      AND (
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
    (cursor_created_at IS NULL AND cursor_id IS NULL)
    OR (scored.created_at, scored.id) < (cursor_created_at, cursor_id)
  ORDER BY
    CASE WHEN sort_by = 'relevance' THEN scored.sim_score END DESC NULLS LAST,
    CASE WHEN sort_by = 'popularity' THEN scored.popularity END DESC NULLS LAST,
    scored.created_at DESC,
    scored.id DESC
  LIMIT result_limit;
END;
$$;

grant
execute on function "public"."search_phrases_smart" (text, text[], text, int, timestamptz, uuid) to anon,
authenticated;
