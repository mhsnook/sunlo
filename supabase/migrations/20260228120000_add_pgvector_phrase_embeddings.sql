-- Enable pgvector extension
create extension if not exists "vector" with schema "extensions";

-- Table to store phrase embeddings computed client-side
create table public.phrase_embedding (
  phrase_id uuid primary key references public.phrase(id) on delete cascade,
  embedding extensions.vector(384) not null,
  model text not null default 'all-MiniLM-L6-v2',
  updated_at timestamp with time zone not null default now()
);

-- HNSW index for fast cosine similarity search
create index phrase_embedding_hnsw_idx
  on public.phrase_embedding
  using hnsw (embedding extensions.vector_cosine_ops);

-- RLS: anyone can read, authenticated users can insert/update
alter table public.phrase_embedding enable row level security;

create policy "phrase_embedding_select"
  on public.phrase_embedding for select
  using (true);

create policy "phrase_embedding_insert"
  on public.phrase_embedding for insert
  to authenticated
  with check (true);

create policy "phrase_embedding_update"
  on public.phrase_embedding for update
  to authenticated
  using (true)
  with check (true);
