CREATE MATERIALIZED VIEW "public"."search_text_index"
  AS  WITH phrase_tags AS (
         SELECT pt.phrase_id,
            string_agg(t.name, ' '::text) AS tag_names
           FROM (public.phrase_tag pt
             JOIN public.tag t ON ((t.id = pt.tag_id)))
          WHERE (pt.deleted = false)
          GROUP BY pt.phrase_id
        )
 SELECT 'phrase'::text AS source_type,
    p.id AS source_id,
    p.id AS entity_id,
    'phrase'::text AS entity_type,
    (p.lang)::text AS entity_lang,
    (p.lang)::text AS text_lang,
    p.text,
    lower((p.text || COALESCE((' '::text || ptags.tag_names), ''::text))) AS text_normalized,
    p.created_at AS entity_created_at
   FROM (public.phrase p
     LEFT JOIN phrase_tags ptags ON ((ptags.phrase_id = p.id)))
  WHERE (p.archived = false)
UNION ALL
 SELECT 'translation'::text AS source_type,
    t.id AS source_id,
    t.phrase_id AS entity_id,
    'phrase'::text AS entity_type,
    (p.lang)::text AS entity_lang,
    (t.lang)::text AS text_lang,
    t.text,
    lower(t.text) AS text_normalized,
    p.created_at AS entity_created_at
   FROM (public.phrase_translation t
     JOIN public.phrase p ON ((p.id = t.phrase_id)))
  WHERE ((t.archived = false) AND (p.archived = false))
UNION ALL
 SELECT 'request'::text AS source_type,
    r.id AS source_id,
    r.id AS entity_id,
    'request'::text AS entity_type,
    (r.lang)::text AS entity_lang,
    (r.lang)::text AS text_lang,
    r.prompt AS text,
    lower(r.prompt) AS text_normalized,
    r.created_at AS entity_created_at
   FROM public.phrase_request r
  WHERE (r.deleted = false)
UNION ALL
 SELECT 'playlist'::text AS source_type,
    pl.id AS source_id,
    pl.id AS entity_id,
    'playlist'::text AS entity_type,
    (pl.lang)::text AS entity_lang,
    (pl.lang)::text AS text_lang,
        CASE
            WHEN (COALESCE(pl.description, ''::text) <> ''::text) THEN ((pl.title || '
'::text) || pl.description)
            ELSE pl.title
        END AS text,
    lower(
        CASE
            WHEN (COALESCE(pl.description, ''::text) <> ''::text) THEN ((pl.title || ' '::text) || pl.description)
            ELSE pl.title
        END) AS text_normalized,
    pl.created_at AS entity_created_at
   FROM public.phrase_playlist pl
  WHERE (pl.deleted = false);

CREATE INDEX search_text_index_entity_id_idx ON public.search_text_index USING btree (entity_id);

CREATE INDEX search_text_index_entity_lang_idx ON public.search_text_index USING btree (entity_lang);

CREATE UNIQUE INDEX search_text_index_source_idx ON public.search_text_index USING btree (source_type, source_id);

CREATE INDEX search_text_index_text_normalized_trgm_idx ON public.search_text_index USING gin (text_normalized public.gin_trgm_ops);

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."search_text_index" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."search_text_index" TO "service_role";

REVOKE ALL ON TABLE "public"."search_text_index" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."search_text_index" TO "postgres";
