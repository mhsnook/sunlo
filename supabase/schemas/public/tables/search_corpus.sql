CREATE TABLE "public"."search_corpus" (
  "source_type"     text                     NOT NULL,
  "source_id"       uuid                     NOT NULL,
  "entity_id"       uuid                     NOT NULL,
  "entity_type"     text                     NOT NULL,
  "entity_lang"     text                     NOT NULL,
  "text_lang"       text                     NOT NULL,
  "text"            text                     NOT NULL,
  "text_normalized" text                     NOT NULL,
  "embedding"       public.vector(1024)      NOT NULL,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "vectorized_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "search_corpus_entity_type_check" CHECK ((entity_type = ANY (ARRAY['phrase'::text, 'request'::text, 'playlist'::text]))),
  CONSTRAINT "search_corpus_pkey" PRIMARY KEY (source_type, source_id),
  CONSTRAINT "search_corpus_source_type_check" CHECK ((source_type = ANY (ARRAY['phrase'::text, 'translation'::text, 'request'::text, 'playlist'::text])))
);

ALTER TABLE "public"."search_corpus"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX search_corpus_embedding_hnsw_idx ON public.search_corpus USING hnsw (embedding public.vector_cosine_ops);

CREATE INDEX search_corpus_entity_id_idx ON public.search_corpus USING btree (entity_id);

CREATE INDEX search_corpus_entity_lang_idx ON public.search_corpus USING btree (entity_lang);

CREATE INDEX search_corpus_entity_type_idx ON public.search_corpus USING btree (entity_type);

CREATE INDEX search_corpus_text_normalized_idx ON public.search_corpus USING btree (text_normalized);

CREATE INDEX search_corpus_vectorized_at_idx ON public.search_corpus USING btree (vectorized_at);

CREATE TRIGGER skip_stale_corpus_upsert
  BEFORE UPDATE ON public.search_corpus
  FOR EACH ROW
  EXECUTE FUNCTION public.skip_stale_corpus_upsert();

CREATE POLICY "search_corpus_public_read" ON "public"."search_corpus"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."search_corpus" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."search_corpus" TO "service_role";

REVOKE ALL ON TABLE "public"."search_corpus" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."search_corpus" TO "postgres";
