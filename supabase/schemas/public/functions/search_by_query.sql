CREATE OR REPLACE FUNCTION public.search_by_query (
  query_embedding public.vector,
  target_langs    text[]        DEFAULT NULL::text[],
  exclude_ids     uuid[]        DEFAULT '{}'::uuid[],
  match_limit     integer       DEFAULT 20
)
  RETURNS TABLE (
    entity_type  text,
    entity_id    uuid,
    matched_via  text,
    matched_text text,
    matched_lang text,
    similarity   real
  )
  LANGUAGE sql
  STABLE
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."search_by_query"(public.vector, text[], uuid[], integer) TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."search_by_query"(public.vector, text[], uuid[], integer) TO "service_role";

REVOKE ALL ON FUNCTION "public"."search_by_query"(public.vector, text[], uuid[], integer) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."search_by_query"(public.vector, text[], uuid[], integer) TO "postgres";
