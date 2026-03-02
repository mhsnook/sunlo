-- RPC to batch upsert phrase embeddings from client-computed vectors
create or replace function public.upsert_phrase_embeddings(
  p_embeddings jsonb
) returns integer
language plpgsql security definer
as $$
declare
  row_count integer;
begin
  insert into public.phrase_embedding (phrase_id, embedding, updated_at)
  select
    (item->>'phrase_id')::uuid,
    (item->>'vector')::extensions.vector(384),
    now()
  from jsonb_array_elements(p_embeddings) as item
  on conflict (phrase_id) do update set
    embedding = excluded.embedding,
    updated_at = excluded.updated_at;

  get diagnostics row_count = row_count;
  return row_count;
end;
$$;
