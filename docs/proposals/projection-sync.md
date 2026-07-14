# Content updates off the wire 🚧

**Status: proposed, not shipped.** v3 — v1/v2 in git history arrived here the
long way. The rule of thumb, one line: **the ack carries the rows you
changed; the wire carries the rows everyone else changed; both land in the
collection the same way.**

## The question this answers

Can we stop hand-writing persistence choreography and stop loading the entire
database into browser memory, using what we already have — RLS, Zod schemas,
collections, and one new column?

Yes. The unlock is that this is three problems with one shared answer:

- **Realtime subscription**: listen to "everything in Hindi" → filter
  `postgres_changes` on a lang column.
- **Predicate pushdown**: fetch only "everything in Hindi" → `WHERE` on a
  lang column (the query-side work in tanstack-db PR #6:
  `dedupeQueriesOn`, load-by-key, pushdown).
- **Partition honesty**: a translation's own `lang` is the translation's
  language; the partition it belongs to is its _phrase's_ lang → a stamped
  `entity_lang` column.

Same column, three masters. Once `entity_lang` is on the tables, each table
multiplexes itself: full rows come down the wire, Zod-parse, upsert by key.
No translation layer in between.

## Schema: one column on three tables

`phrase`, `phrase_request`, `phrase_playlist`, `lang_tag` already carry
`lang` — they need nothing. Only the child tables need the stamp:

```sql
-- phrase_translation, request_comment, comment_phrase_link each get:
alter table phrase_translation
add column entity_lang text not null; -- the OWNING entity's lang

create index on phrase_translation (entity_lang);

create function stamp_translation_entity_lang () returns trigger as $$
begin
	select lang into new.entity_lang from phrase where id = new.phrase_id;
	return new;
end;
$$ language plpgsql;

create trigger stamp_entity_lang before insert on phrase_translation
for each row execute function stamp_translation_entity_lang ();
```

(`request_comment` and `comment_phrase_link` stamp from their
`phrase_request`. Comment links need no special treatment after all.)

Add the content tables to the realtime publication. They're public-read
under RLS already; realtime respects the same policies.

## Collections: declare, don't choreograph

```ts
// features/phrases/collections.ts — the dream, still
export const phraseTranslationsCollection = defineSyncedCollection({
	id: 'phrase_translations',
	schema: TranslationSchema,
	getKey: (t: TranslationType) => t.id,
	read: { from: 'phrase_translation' }, // queryFn with pushed-down predicates
	write: { to: 'phrase_translation' }, // ack rows write through (see below)
	wire: {
		table: 'phrase_translation',
		langColumn: 'entity_lang',
		pinColumn: 'phrase_id', // detail-page pinning, per-entity
	},
})
```

- **read** — the collection loads `WHERE entity_lang IN (active langs)`, not
  the full table. PR #6's `dedupeQueriesOn(['entity_lang'])` serves narrower
  live queries from that slice; load-by-key serves strays (a chat preview
  from a language you don't study) as cache-first single-row fetches.
- **write** — inserts/updates/deletes go to the base table with `.select()`
  appended. The returned rows ARE the ack: they write through as synced
  state, `isPersisted` resolves, optimistic overlay drops. This is
  `docs/mutations.md`'s existing advice, made automatic instead of
  hand-written per handler.
- **wire** — generates the realtime bindings below. No handler code per
  collection.

## The wire: tables multiplex themselves

Subscribing to a language means one channel with one binding per wired
collection — generated from the `wire` declarations, handled uniformly:

```ts
// lib/sync/scopes.ts — the whole runtime, conceptually
const langScope = (langs: Array<string>) =>
	supabase.channel(`sync:lang`).on(
		'postgres_changes',
		{
			event: '*',
			schema: 'public',
			table: wire.table,
			filter: `${wire.langColumn}=in.(${langs.join(',')})`,
		},
		(payload) => {
			if (payload.eventType === 'DELETE')
				collection.utils.writeDelete(payload.old.id) // tolerate absent
			else collection.utils.writeUpsert(schema.parse(payload.new))
		}
	)
```

The payload is the **full row** — the same shape the queryFn fetches, parsed
by the same Zod schema, upserted by the same key. Someone else's new
translation arrives whole; no follow-up fetch. Your own write's echo arrives
after the ack already wrote it; upsert-by-key makes that a harmless
overwrite.

Scopes compose from session + route, ref-counted with a grace period so
lang-bouncing doesn't thrash:

```ts
projection.compose(() => [
	langScope(myDeckLangs), // the languages I study — one in.() filter
	route.lang && langScope([route.lang]), // the language I'm browsing
	route.pid && pinScope('phrase', route.pid), // detail page, any language:
	// per-collection pinColumn bindings — phrase_id=eq.{pid} on translations,
	// tags; request_id=eq.{rid} on comments — same handler as above
	auth.userId && userScope(auth.userId), // chats, notifications (exists today
	// as useSocialRealtime — absorbed, not rewritten)
])
```

## The residual: view-computed columns

`phrase_meta`'s `count_learners` / `avg_difficulty` / `avg_stability` are the
one thing a base-table row can't carry. When a `phrase` row arrives off the
wire, patch its base columns immediately and schedule a coalesced by-key
`select from phrase_meta where id in (…)` for the stats. This is the only
"mark dirty and recalculate" left in the design, scoped to exactly one
collection — not the universal verb v2 tried to make it.

## Wasn't the corpus supposed to multiplex this?

It can, and the idea got us here — but it loses on the details:

1. Neither existing store can be watched: `search_corpus` is written async
   via pg_net (lags; silently skips no-session writes like Studio edits) and
   `search_text_index` is a matview, invisible to realtime. A multiplexer
   would be a _third_, synchronous corpus-shaped table.
2. Corpus rows are search documents. An UPDATE usefully carries new text,
   but an INSERT of a row you've never seen lacks `added_by`/`created_at` —
   someone else's new content still costs a fetch. Half off the wire.
3. The decisive one: predicate pushdown needs `entity_lang` **on the source
   tables** no matter what. Once it's there for the fetch path, the tables
   filter their own realtime and the multiplexer has no job left.

The corpus keeps its actual job (search), and gains from the same schema
move: the trigram matview and embed pipeline can read `entity_lang` off the
child tables instead of joining for it.

## Flag for review

1. **DELETE events ignore filters** and carry only the primary key. Mostly
   moot — requests/playlists/translations soft-delete (those are UPDATEs) —
   and the handler's "remove if present, else ignore" absorbs the rest.
   Hard-deleted `comment_phrase_link` rows arrive unfiltered; tolerable
   noise at our scale.
2. **Filtered `postgres_changes` has a scale ceiling** (per-subscriber
   checks). Fine now; if it's ever hit, the transport swaps to
   broadcast-from-database triggers without touching collections, scopes, or
   handlers — everything above the channel setup survives.
3. **`entity_lang` is stamped, not live** — same trade `search_corpus`
   already made. If phrase lang-editing ever becomes real, the phrase
   trigger cascades restamps.
4. **Framework surface in tanstack-db**: pushdown of the lang predicate into
   `queryFn`, `dedupeQueriesOn` + load-by-key (PR #6), a `writeUpsert`
   convenience, and scope-shaped pinning with ref-counts. The sunlo-side
   `defineSyncedCollection`/`projection` wrappers are thin over these.
5. **Fix the embed pipeline's auth gap regardless** (independent of all of
   this): replace the borrowed-JWT pg_net push with a pg_cron sweep over the
   existing `vectorized_at` staleness — self-healing for Studio edits,
   dropped calls, and backfills.
6. **Migration path is incremental.** Nothing here is all-or-nothing: wire
   one collection (translations) behind the existing ones, prove the loop on
   one screen, then convert table by table. Each converted collection
   deletes its handlers and its full-table queryFn as it lands.
