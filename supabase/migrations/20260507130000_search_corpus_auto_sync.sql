-- Auto-sync the search index after every change to phrases / translations
-- / requests / playlists / tags. Two tracks, each suited to its cost shape:
--
--   1) Trigram side: a materialized view (search_text_index) projects the
--      searchable text per source row. Refreshed eagerly via triggers on
--      every source-table write — pure SQL, no jobs, no async magic.
--      Always current. search_by_trigram queries the view directly.
--
--   2) Embedding side: a trigger on each source table fires pg_net to call
--      the new embed-corpus-row edge function, which computes the embedding
--      via Workers AI and upserts into search_corpus. Async (the trigger
--      doesn't block) so source-table writes don't pay Workers AI latency.
--      Eventual consistency — embeddings lag source writes by ~hundreds of
--      ms typically.
--
-- The two corpus stores stay separate by purpose: search_text_index is the
-- trigram corpus (text + text_normalized), search_corpus is the embedding
-- corpus (everything plus the vector). Both have one row per (source_type,
-- source_id), so they parallel each other.
-- ----------------------------------------------------------------------
-- 0. Schema prep
--
-- Two structural changes search_corpus + phrase need to support
-- vectorized_at staleness tracking:
--
-- a) phrase didn't have updated_at. Add it + a generic bump trigger on
--    UPDATE so every edit advances the column. Also extend the
--    phrase_meta view to project it (the embed function reads through
--    the view).
-- b) search_corpus had a synthetic id PK + a unique constraint on
--    (source_type, source_id). The natural key is unique; the synthetic
--    id was unused. Drop id and promote the natural key to PK. Add a
--    vectorized_at column — set on every embed-function upsert to the
--    source row's updated_at, so a quick `source.updated_at >
--    corpus.vectorized_at` query tells us what's stale.
-- ----------------------------------------------------------------------
alter table "public"."phrase"
add column if not exists "updated_at" timestamptz not null default now();

create or replace function "public"."bump_phrase_updated_at" () returns "trigger" language "plpgsql" as $$
begin
	new.updated_at := clock_timestamp();
	return new;
end;
$$;

drop trigger if exists "bump_phrase_updated_at" on "public"."phrase";

create trigger "bump_phrase_updated_at" before
update on "public"."phrase" for each row
execute function "public"."bump_phrase_updated_at" ();

-- Extend phrase_meta to project the new column. CREATE OR REPLACE on a
-- view allows column additions at the end of the select list.
create or replace view "public"."phrase_meta"
with
	("security_invoker" = 'true') as
with
	"tags" as (
		select
			"pt"."phrase_id" as "t_phrase_id",
			(
				"json_agg" (distinct "jsonb_build_object" ('id', "tag"."id", 'name', "tag"."name")) filter (
					where
						("tag"."id" is not null)
				)
			)::"jsonb" as "tags"
		from
			(
				"public"."phrase_tag" "pt"
				left join "public"."tag" "tag" on (("tag"."id" = "pt"."tag_id"))
			)
		group by
			"pt"."phrase_id"
	)
select
	"phrase"."id",
	"phrase"."lang",
	"phrase"."text",
	"phrase"."created_at",
	"phrase"."added_by",
	"phrase"."only_reverse",
	"phrase"."archived",
	coalesce("stats"."count_learners", (0)::bigint) as "count_learners",
	"stats"."avg_difficulty",
	"stats"."avg_stability",
	coalesce("tags"."tags", '[]'::"jsonb") as "tags",
	"phrase"."updated_at"
from
	(
		(
			"public"."phrase" "phrase"
			left join "public"."phrase_stats" "stats" on (("stats"."phrase_id" = "phrase"."id"))
		)
		left join "tags" on (("tags"."t_phrase_id" = "phrase"."id"))
	);

-- search_corpus: drop synthetic id, promote natural key to PK, add
-- vectorized_at. Existing rows keep their data; vectorized_at defaults
-- to now() so a backfill-populated corpus reads as "freshly vectorized
-- as of when the migration ran" until the next embed completes.
alter table "public"."search_corpus"
drop constraint if exists "search_corpus_pkey";

alter table "public"."search_corpus"
drop constraint if exists "search_corpus_source_type_source_id_key";

alter table "public"."search_corpus"
drop column if exists "id";

alter table "public"."search_corpus"
add primary key ("source_type", "source_id");

alter table "public"."search_corpus"
add column if not exists "vectorized_at" timestamptz not null default now();

create index if not exists "search_corpus_vectorized_at_idx" on "public"."search_corpus" ("vectorized_at");

-- Stale-write guard: pg_net dispatches happen out-of-order, so an older
-- embed can land after a newer one. Drop the older one at the row level
-- so callers don't have to read-then-write to avoid clobbering.
create or replace function "public"."skip_stale_corpus_upsert" () returns "trigger" language "plpgsql" as $$
begin
	if tg_op = 'UPDATE' and new.vectorized_at < old.vectorized_at then
		return null;
	end if;
	return new;
end;
$$;

drop trigger if exists "skip_stale_corpus_upsert" on "public"."search_corpus";

create trigger "skip_stale_corpus_upsert" before
update on "public"."search_corpus" for each row
execute function "public"."skip_stale_corpus_upsert" ();

-- ----------------------------------------------------------------------
-- 1. Materialized view: search_text_index (trigram corpus)
-- ----------------------------------------------------------------------
create materialized view if not exists "public"."search_text_index" as
with
	"phrase_tags" as (
		select
			"pt"."phrase_id",
			"string_agg" ("t"."name", ' ')::text as "tag_names"
		from
			"public"."phrase_tag" "pt"
			join "public"."tag" "t" on "t"."id" = "pt"."tag_id"
		group by
			"pt"."phrase_id"
	)
select
	'phrase'::"text" as "source_type",
	"p"."id" as "source_id",
	"p"."id" as "entity_id",
	'phrase'::"text" as "entity_type",
	"p"."lang"::text as "entity_lang",
	"p"."lang"::text as "text_lang",
	"p"."text" as "text",
	"lower" ("p"."text" || coalesce(' ' || "ptags"."tag_names"::text, '')) as "text_normalized",
	"p"."created_at" as "entity_created_at"
from
	"public"."phrase" "p"
	left join "phrase_tags" "ptags" on "ptags"."phrase_id" = "p"."id"
where
	"p"."archived" = false
union all
select
	'translation'::"text",
	"t"."id",
	"t"."phrase_id",
	'phrase'::"text",
	"p"."lang"::text,
	"t"."lang"::text,
	"t"."text",
	"lower" ("t"."text"),
	"p"."created_at"
from
	"public"."phrase_translation" "t"
	join "public"."phrase" "p" on "p"."id" = "t"."phrase_id"
where
	"t"."archived" = false
	and "p"."archived" = false
union all
select
	'request'::"text",
	"r"."id",
	"r"."id",
	'request'::"text",
	"r"."lang"::text,
	"r"."lang"::text,
	"r"."prompt",
	"lower" ("r"."prompt"),
	"r"."created_at"
from
	"public"."phrase_request" "r"
where
	"r"."deleted" = false
union all
select
	'playlist'::"text",
	"pl"."id",
	"pl"."id",
	'playlist'::"text",
	"pl"."lang"::text,
	"pl"."lang"::text,
	case
		when coalesce("pl"."description", '') <> '' then "pl"."title" || E'\n' || "pl"."description"
		else "pl"."title"
	end,
	"lower" (
		case
			when coalesce("pl"."description", '') <> '' then "pl"."title" || ' ' || "pl"."description"
			else "pl"."title"
		end
	),
	"pl"."created_at"
from
	"public"."phrase_playlist" "pl"
where
	"pl"."deleted" = false;

create unique index if not exists "search_text_index_source_idx" on "public"."search_text_index" ("source_type", "source_id");

create index if not exists "search_text_index_entity_id_idx" on "public"."search_text_index" ("entity_id");

create index if not exists "search_text_index_entity_lang_idx" on "public"."search_text_index" ("entity_lang");

create index if not exists "search_text_index_text_normalized_trgm_idx" on "public"."search_text_index" using "gin" ("text_normalized" "public"."gin_trgm_ops");

alter materialized view "public"."search_text_index" owner to "postgres";

grant
select
	on "public"."search_text_index" to "anon",
	"authenticated";

-- ----------------------------------------------------------------------
-- 2. Refresh triggers — keep the materialized view in step with source
-- table writes. CONCURRENTLY needs the unique index above.
-- ----------------------------------------------------------------------
create or replace function "public"."trigger_refresh_search_text_index" () returns "trigger" language "plpgsql" security definer as $$
begin
	if exists (
		select 1 from pg_matviews
		where matviewname = 'search_text_index' and ispopulated
	) then
		refresh materialized view concurrently search_text_index;
	else
		refresh materialized view search_text_index;
	end if;
	return null;
end;
$$;

alter function "public"."trigger_refresh_search_text_index" () owner to "postgres";

create trigger "refresh_text_index_on_phrase_change"
after insert
or
update of "text",
"lang",
"archived"
or delete on "public"."phrase" for each statement
execute function "public"."trigger_refresh_search_text_index" ();

create trigger "refresh_text_index_on_translation_change"
after insert
or
update of "text",
"lang",
"archived",
"phrase_id"
or delete on "public"."phrase_translation" for each statement
execute function "public"."trigger_refresh_search_text_index" ();

create trigger "refresh_text_index_on_request_change"
after insert
or
update of "prompt",
"lang",
"deleted"
or delete on "public"."phrase_request" for each statement
execute function "public"."trigger_refresh_search_text_index" ();

create trigger "refresh_text_index_on_playlist_change"
after insert
or
update of "title",
"description",
"lang",
"deleted"
or delete on "public"."phrase_playlist" for each statement
execute function "public"."trigger_refresh_search_text_index" ();

-- phrase_tag has no UPDATE-of-meaningful-columns case (the table is just
-- (phrase_id, tag_id)); insert/delete is what re-shapes a phrase's tags.
create trigger "refresh_text_index_on_tag_change"
after insert
or delete on "public"."phrase_tag" for each statement
execute function "public"."trigger_refresh_search_text_index" ();

-- Initial population.
refresh materialized view "public"."search_text_index";

-- ----------------------------------------------------------------------
-- 3. Update search_by_trigram to query the materialized view.
--
-- The MV already filters out archived/deleted entities (in its WHERE), so
-- we no longer need a live_pool CTE. Triggers keep it current.
-- ----------------------------------------------------------------------
create or replace function "public"."search_by_trigram" (
	query text,
	target_langs text[] default null,
	exclude_ids uuid[] default '{}'::uuid[],
	match_limit int default 20,
	cursor_created_at timestamptz default null,
	cursor_id uuid default null
) returns table (
	entity_type text,
	entity_id uuid,
	matched_via text,
	matched_text text,
	matched_lang text,
	similarity real,
	created_at timestamptz
) language plpgsql stable security invoker as $$
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
$$;

-- search_by_trigram now queries search_text_index, not search_corpus.
-- Drop the redundant trigram index on search_corpus.
drop index if exists "public"."search_corpus_text_normalized_trgm_idx";

-- ----------------------------------------------------------------------
-- 4. pg_net + embed triggers (semantic / async track).
--
-- Each row-level trigger fires a single async HTTP POST to the
-- embed-corpus-row edge function with (source_type, source_id). The edge
-- function loads the source, computes the embedding via Workers AI, and
-- upserts into search_corpus. If the source is no longer visible
-- (archived / deleted / missing), the corpus row is deleted instead.
--
-- Triggers fire only on column changes that actually affect the embedded
-- text. Updates to upvote_count, count_learners, updated_at etc. don't
-- re-fire the trigger — no wasted Workers AI calls. Archive flips DO
-- fire (the edge function recognizes them and runs the cheap delete
-- branch, no Workers AI call).
--
-- Auth model: embed-corpus-row has verify_jwt = true AND requires
-- role = 'authenticated' in the JWT claims. The trigger forwards the
-- calling user's auth header from the PostgREST session — that's the
-- only legitimate caller of this function. RLS on the source tables
-- ensures only authenticated users can mutate them, so any trigger
-- fire is from an authenticated user with a JWT in scope.
--
-- Edge cases:
--   - Direct admin edits via Studio fire the trigger but have no
--     PostgREST session, so no auth header. The trigger skips the
--     dispatch (corpus briefly stale until the next app-driven edit
--     or a backfill run).
--   - Backfill script doesn't touch source tables — it writes directly
--     to search_corpus — so no triggers fire from its connection.
--   - Random internet POSTs are rejected by the runtime's JWT
--     verification before the function code runs.
--
-- Configuration (Vault-backed):
--   - vault secret 'project_url' — the Supabase project URL. The
--     migration creates a local-dev default ('http://api.supabase.internal:8000')
--     iff it doesn't already exist. Production: override via
--       select vault.create_secret('https://<proj>.supabase.co', 'project_url')
--     in the SQL editor (or update_secret if it already exists).
-- ----------------------------------------------------------------------
create extension if not exists "pg_net";

-- Idempotent: only inserts the local-dev default when no project_url
-- secret exists yet. Production environments add their own via the SQL
-- editor and the migration leaves them alone.
do $$
begin
	if not exists (select 1 from vault.secrets where name = 'project_url') then
		perform vault.create_secret(
			'http://api.supabase.internal:8000',
			'project_url'
		);
	end if;
end $$;

create or replace function "public"."trigger_notify_corpus_embed_change" () returns "trigger" language "plpgsql" security definer as $$
declare
	source_type_arg text := tg_argv[0];
	affected_id uuid;
	project_url text;
	headers_raw text;
	auth_header text;
begin
	headers_raw := current_setting('request.headers', true);
	if headers_raw is null
		or (headers_raw::json->>'authorization') is null
	then
		-- No PostgREST session = direct DB edit (Studio admin, psql).
		-- Skip the dispatch; the next app-driven edit or backfill run
		-- will re-sync.
		return null;
	end if;
	auth_header := headers_raw::json->>'authorization';

	-- For phrase_tag rows, the entity that needs re-embedding is the
	-- parent phrase. Other tables: the row itself.
	if tg_table_name = 'phrase_tag' then
		affected_id := coalesce((new).phrase_id, (old).phrase_id);
	else
		affected_id := coalesce((new).id, (old).id);
	end if;

	select decrypted_secret into project_url
	from vault.decrypted_secrets
	where name = 'project_url';

	perform net.http_post(
		url := project_url || '/functions/v1/embed-corpus-row',
		headers := jsonb_build_object(
			'Content-Type', 'application/json',
			'Authorization', auth_header
		),
		body := jsonb_build_object(
			'source_type', source_type_arg,
			'source_id', affected_id
		)
	);
	return null;
end;
$$;

alter function "public"."trigger_notify_corpus_embed_change" () owner to "postgres";

create trigger "embed_corpus_on_phrase_change"
after insert
or
update of "text",
"lang",
"archived"
or delete on "public"."phrase" for each row
execute function "public"."trigger_notify_corpus_embed_change" ('phrase');

create trigger "embed_corpus_on_translation_change"
after insert
or
update of "text",
"lang",
"archived",
"phrase_id"
or delete on "public"."phrase_translation" for each row
execute function "public"."trigger_notify_corpus_embed_change" ('translation');

create trigger "embed_corpus_on_request_change"
after insert
or
update of "prompt",
"lang",
"deleted"
or delete on "public"."phrase_request" for each row
execute function "public"."trigger_notify_corpus_embed_change" ('request');

create trigger "embed_corpus_on_playlist_change"
after insert
or
update of "title",
"description",
"lang",
"deleted"
or delete on "public"."phrase_playlist" for each row
execute function "public"."trigger_notify_corpus_embed_change" ('playlist');

-- Tag changes affect the parent phrase's text_normalized (tags are
-- folded in). The trigger fires with source_type='phrase' and the edge
-- function re-embeds the affected phrase. No UPDATE clause: the
-- (phrase_id, tag_id) pair is what defines the link; UPDATE-in-place
-- would rarely be meaningful.
create trigger "embed_corpus_on_tag_change"
after insert
or delete on "public"."phrase_tag" for each row
execute function "public"."trigger_notify_corpus_embed_change" ('phrase');
