-- Switch default embedding model from OpenRouter to Cloudflare Workers AI.
-- bge-m3 is multilingual (critical for cross-lingual phrase search) and
-- outputs 1024-dimension vectors, matching the existing schema.
update public.embedding_config
set
	model_name = '@cf/baai/bge-m3',
	model_provider = 'cloudflare-workers-ai'
where
	is_active = true
	and model_name = 'qwen/qwen3-embedding-8b';
