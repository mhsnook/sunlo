-- Fix "column reference phrase_id is ambiguous" in chat_anchor_search.
--
-- chat_anchor_search is plpgsql, and its RETURNS TABLE column `phrase_id`
-- shadows the chat_corpus column of the same name inside the function
-- body. Qualify the column reference so it resolves to the table.
create or replace function "public"."chat_anchor_search" (
	anchor_pids uuid[],
	target_lang text,
	exclude_pids uuid[] default '{}'::uuid[],
	match_limit int default 20
) returns table (
	phrase_id uuid,
	matched_via text,
	matched_text text,
	matched_lang text,
	similarity real
) language plpgsql stable security invoker as $$
declare
	avg_embedding vector(1024);
begin
	select avg(embedding) into avg_embedding
	from chat_corpus
	where chat_corpus.source_type = 'phrase'
		and chat_corpus.phrase_id = any(anchor_pids);

	if avg_embedding is null then
		return;
	end if;

	return query
	select * from chat_search(
		avg_embedding,
		target_lang,
		exclude_pids,
		match_limit
	);
end;
$$;
