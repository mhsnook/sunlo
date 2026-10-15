CREATE OR REPLACE FUNCTION public.search_by_trigram (
  query             text,
  target_langs      text[]                   DEFAULT NULL::text[],
  exclude_ids       uuid[]                   DEFAULT '{}'::uuid[],
  match_limit       integer                  DEFAULT 20,
  cursor_created_at timestamp with time zone DEFAULT NULL::timestamp WITH time zone,
  cursor_id         uuid                     DEFAULT NULL::uuid
)
  RETURNS TABLE (
    entity_type  text,
    entity_id    uuid,
    matched_via  text,
    matched_text text,
    matched_lang text,
    similarity   real,
    created_at   timestamp with time zone
  )
  LANGUAGE plpgsql
  STABLE
  AS $function$
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
			sti.entity_id,
			sti.entity_type,
			sti.source_type,
			sti.text as matched_text,
			sti.text_lang as matched_lang,
			sti.entity_created_at,
			greatest(
				similarity(sti.text_normalized, normalized_query),
				case when sti.text_normalized ilike '%' || normalized_query || '%' then 0.4 else 0 end,
				case when sti.text_normalized ilike normalized_query || '%' then 0.6 else 0 end,
				case when sti.text_normalized ilike '% ' || normalized_query || '%' then 0.5 else 0 end
			) as sim_score
		from search_text_index sti
		where (target_langs is null or sti.entity_lang = any(target_langs))
			and sti.entity_id <> all(exclude_ids)
			and (
				sti.text_normalized ilike '%' || normalized_query || '%'
				or similarity(sti.text_normalized, normalized_query) > 0.1
			)
	),
	deduped as (
		select distinct on (mp.entity_id)
			mp.entity_id,
			mp.entity_type,
			mp.source_type,
			mp.matched_text,
			mp.matched_lang,
			mp.sim_score,
			mp.entity_created_at
		from match_pool mp
		order by mp.entity_id, mp.sim_score desc
	)
	select
		d.entity_type,
		d.entity_id,
		d.source_type as matched_via,
		d.matched_text,
		d.matched_lang,
		d.sim_score::real as similarity,
		d.entity_created_at as created_at
	from deduped d
	where (cursor_created_at is null and cursor_id is null)
		or (d.entity_created_at, d.entity_id) < (cursor_created_at, cursor_id)
	order by d.sim_score desc, d.entity_created_at desc, d.entity_id desc
	limit match_limit;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."search_by_trigram"(text, text[], uuid[], integer, timestamp WITH time zone, uuid) TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."search_by_trigram"(text, text[], uuid[], integer, timestamp WITH time zone, uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."search_by_trigram"(text, text[], uuid[], integer, timestamp WITH time zone, uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."search_by_trigram"(text, text[], uuid[], integer, timestamp WITH time zone, uuid) TO "postgres";
