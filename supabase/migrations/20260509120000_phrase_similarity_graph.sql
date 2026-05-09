-- phrase_similarity_graph: returns a node + edge set for a force-directed
-- visualization of phrase similarity within one language.
--
-- Strategy:
--   1. Pick the top `node_limit` phrases for `target_lang` from search_corpus
--      (newest non-archived, with a primary "phrase" row that has an
--      embedding). Cap is small because the UI does an O(n²) force sim.
--   2. Compute pairwise cosine similarity inside that node set.
--   3. For each node, keep the top `edges_per_node` edges above
--      `min_similarity`. Edges are stored undirected (src < dst).
--
-- Returned shape:
--   {
--     "nodes": [{ "id": uuid, "text": text }, ...],
--     "edges": [{ "source": uuid, "target": uuid, "similarity": real }, ...]
--   }
--
-- Cheap enough at node_limit≈80 that we just run it on every page load.
create or replace function "public"."phrase_similarity_graph" (
	target_lang text,
	node_limit int default 80,
	edges_per_node int default 4,
	min_similarity real default 0.55
) returns jsonb language sql stable security invoker as $$
	with target_phrases as (
		select sc.entity_id as id, sc.text, sc.embedding
		from search_corpus sc
		join phrase p on p.id = sc.entity_id
		where sc.entity_type = 'phrase'
			and sc.source_type = 'phrase'
			and sc.entity_lang = target_lang
			and p.archived = false
		order by sc.created_at desc
		limit node_limit
	),
	pair_edges as (
		select
			least(a.id, b.id) as src,
			greatest(a.id, b.id) as dst,
			1 - (a.embedding <=> b.embedding) as similarity
		from target_phrases a
		join target_phrases b on a.id <> b.id
	),
	dedup_edges as (
		select distinct src, dst, similarity from pair_edges
	),
	ranked as (
		select
			src, dst, similarity,
			row_number() over (partition by src order by similarity desc) as rn_src,
			row_number() over (partition by dst order by similarity desc) as rn_dst
		from dedup_edges
		where similarity >= min_similarity
	),
	kept_edges as (
		select src, dst, similarity
		from ranked
		where rn_src <= edges_per_node or rn_dst <= edges_per_node
	)
	select jsonb_build_object(
		'nodes', coalesce(
			(select jsonb_agg(jsonb_build_object('id', id, 'text', text))
				from target_phrases),
			'[]'::jsonb
		),
		'edges', coalesce(
			(select jsonb_agg(jsonb_build_object(
				'source', src, 'target', dst, 'similarity', similarity::real
			))
				from kept_edges),
			'[]'::jsonb
		)
	);
$$;

alter function "public"."phrase_similarity_graph" (text, int, int, real) owner to "postgres";

grant
execute on function "public"."phrase_similarity_graph" (text, int, int, real) to anon,
authenticated;
