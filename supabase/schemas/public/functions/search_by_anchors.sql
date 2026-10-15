CREATE OR REPLACE FUNCTION public.search_by_anchors (
  anchor_ids   uuid[],
  target_langs text[]  DEFAULT NULL::text[],
  exclude_ids  uuid[]  DEFAULT '{}'::uuid[],
  match_limit  integer DEFAULT 20
)
  RETURNS TABLE (
    entity_type  text,
    entity_id    uuid,
    matched_via  text,
    matched_text text,
    matched_lang text,
    similarity   real
  )
  LANGUAGE plpgsql
  STABLE
  AS $function$
declare
	avg_embedding vector(1024);
begin
	-- Average over primary rows (phrase + request + playlist), not
	-- translations. Translations capture the entity's meaning in another
	-- language; including them in the centroid would smear the semantic
	-- anchor toward whatever target language the translations happen to
	-- be in.
	--
	-- search_corpus.entity_id is qualified because PL/pgSQL with RETURNS
	-- TABLE creates implicit OUT parameters for each return column; an
	-- unqualified `entity_id` would clash with the OUT parameter and
	-- raise "column reference 'entity_id' is ambiguous" at call time.
	select avg(embedding) into avg_embedding
	from search_corpus
	where source_type in ('phrase', 'request', 'playlist')
		and search_corpus.entity_id = any(anchor_ids);

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
$function$;

GRANT EXECUTE ON FUNCTION "public"."search_by_anchors"(uuid[], text[], uuid[], integer) TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."search_by_anchors"(uuid[], text[], uuid[], integer) TO "service_role";

REVOKE ALL ON FUNCTION "public"."search_by_anchors"(uuid[], text[], uuid[], integer) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."search_by_anchors"(uuid[], text[], uuid[], integer) TO "postgres";
