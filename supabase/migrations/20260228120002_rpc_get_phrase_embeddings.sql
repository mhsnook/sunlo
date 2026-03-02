-- RPC to fetch all embeddings for a given language
create or replace function public.get_phrase_embeddings(p_lang text)
returns table (phrase_id uuid, embedding extensions.vector)
language sql stable
as $$
  select pe.phrase_id, pe.embedding
  from public.phrase_embedding pe
  join public.phrase p on p.id = pe.phrase_id
  where p.lang = p_lang;
$$;
