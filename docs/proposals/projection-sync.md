# Projection sync — the code we want to write 🚧

**Status: proposed, not shipped.** The lesson-6 exercise applied to sunlo:
write the application code we _wish_ we could write, then read off exactly
what framework has to exist underneath it. Nothing here compiles today; the
gaps are enumerated in [Flag for review](#flag-for-review).

**Revision note (v2).** v1 (in git history as `language-partition-sync.md`)
partitioned every table by its own `lang` column and confirmed writes by
matching realtime echoes. Two things broke it. First,
`phrase_translation.lang` is the _translation's_ language — a Hindi phrase's
English translation belongs to the Hindi partition, and no column on the
translation row says so. Second, the search corpus tables already solved that
exact problem: every searchable unit rolls up to
`(entity_id, entity_type, entity_lang)`, where `entity_lang` is the _owning_
entity's lang. v2 promotes that rollup from a search implementation detail to
the spine of sync itself — and in doing so, the wire stops carrying rows and
starts carrying **signals**, which collapses the whole design onto one client
verb: mark the row dirty, then recalculate.

## The idea in three sentences

1. **Every user has a projection**: the slice of the database they care about
   right now — the languages they study, the language they're browsing, the
   entity on the screen, and themselves. The projection is a small set of
   predicates, composed by routes and session state, changing as they move.
2. **A skinny synchronous registry** — same rollup schema as `search_corpus`,
   none of its weight — broadcasts a signal on every content change,
   addressed by `entity_lang` and `entity_id`.
3. **Clients answer every signal with the same verb**: `markDirty(key)` — a
   coalesced by-key refetch from the collection's read source. Confirmation
   of your own writes, other people's edits, cascade deletes, and
   server-computed columns are all the _same case_.

RLS stays the security kernel: worst case is a broken UI, never leaked data.
Zod stays at the wire boundary. Live queries and components don't change —
they were already written the way we want.

## 1. Collections declare read, write, and routing — not persistence

```ts
// features/phrases/collections.ts — the dream
export const phrasesCollection = defineSyncedCollection({
	id: 'phrases',
	schema: PhraseSchema,
	getKey: (p: PhraseType) => p.id,
	read: { from: 'phrase_meta', columns: PHRASE_META_COLUMNS }, // the view
	write: { to: 'phrase' }, // the base table
	signals: 'phrase', // registry source_type that routes back to me
})

export const phraseTranslationsCollection = defineSyncedCollection({
	id: 'phrase_translations',
	schema: TranslationSchema,
	getKey: (t: TranslationType) => t.id,
	read: { from: 'phrase_translation' },
	write: { to: 'phrase_translation' },
	signals: 'translation',
})
```

Compare with today's `src/features/phrases/collections.ts`: the
`onInsert/onUpdate/onDelete` handlers — ~120 lines per file of
`transaction.mutations.map(...)` supabase calls, `.select()` confirmations,
`{ refetch: false }` decisions, `should()` assertions — are gone. Not moved:
gone. The framework writes rows to `write.to`; how the client learns the
outcome is §4, and it isn't handler code.

Note there is no `partitionBy` and no `derived` list (v1 had both). A
collection doesn't know or care which partition it's in — the _registry_
knows each row's `entity_lang` — and derived view columns need no special
machinery because recalculation always reads `read.from`, the view.

## 2. The projection is composed, not configured

```ts
// lib/sync/projection.ts — the session's live subscription set
// A scope is a predicate over the registry: by entity_lang or by entity_id.
projection.compose(() => [
	...myDecks.map((d) => langScope(d.lang)), // the languages I study
	route.lang && langScope(route.lang), // the language I'm browsing
	route.entity && entityScope(route.entity), // the detail page I'm on
	auth.userId && userScope(auth.userId), // chats, notifications, decks, cards
])
```

Routes contribute scopes declaratively; language moves to the root of the URL
so the browsing scope is just a param:

```ts
// routes/$lang.tsx — was /learn/$lang
export const Route = createFileRoute('/$lang')({
	loader: ({ params: { lang } }) => projection.add(langScope(lang)),
})

// routes/$lang/phrase.$pid.tsx — pin one entity live, even outside my langs
export const Route = createFileRoute('/$lang/phrase/$pid')({
	loader: ({ params: { pid } }) => projection.add(entityScope('phrase', pid)),
})
```

Scopes are ref-counted with a grace period, so bouncing between two languages
doesn't thrash subscriptions. And scope inclusion is _predicate inclusion_:
`entityScope('phrase', pid)` for a Hindi phrase is already covered by
`langScope('hin')` if that's attached, so the projection subscribes nothing
new — the same algebra tanstack-db PR #6 uses to serve narrower live queries
from broader ones (`dedupeQueriesOn`), applied to subscriptions. One mental
model on both sides of the wire.

Entering a scope also loads it: `langScope('hin')` pins covering slices of
each content collection (`WHERE entity's lang = 'hin'`, pushed down into the
fetch) so every narrower live query under the route is served locally, per
PR #6.

## 3. The registry: the corpus schema, promoted to the sync spine

`search_corpus` and `search_text_index` already model the hard part — one row
per source unit, rolled up to the owning entity, with the owning entity's
lang:

> For translation rows: parent phrase's id (so translation matches roll up
> under their phrase) … For a Hindi phrase's English translation row,
> `entity_lang='hin'` (the phrase's lang).

But neither store can be the wire. The embedding corpus is written _async_
(pg_net → edge function → Workers AI → upsert: hundreds of ms lag, and
skipped entirely for no-auth-header writes like Studio edits). The trigram
corpus is a materialized view — realtime can't watch matview refreshes. Both
are also lossy on purpose: they only include _searchable_ text units, so
comments and comment↔phrase links aren't in them.

So: a third sibling, skinny and synchronous, with the same shape and wider
coverage —

```sql
create table content_registry (
	source_type text not null, -- 'phrase' | 'translation' | 'request'
	-- | 'comment' | 'comment_phrase_link' | 'playlist' | 'tag' | …
	source_id uuid not null,
	entity_id uuid not null, -- rollup: the thing whose page re-renders
	entity_type text not null, -- 'phrase' | 'request' | 'playlist'
	entity_lang text not null, -- the OWNING entity's lang, always
	updated_at timestamptz not null,
	primary key (source_type, source_id)
);
```

Maintained by synchronous row-level triggers on each content table — the same
trigger points the corpus pipeline already proved out, minus the async hop.
Each write upserts its registry row (computing `entity_lang` via parent
lookup where needed: a comment's lang is its request's lang, resolved once,
in SQL, in the transaction) and broadcasts the signal to two topics:

```
sync:lang:{entity_lang}   — the language rooms
sync:entity:{entity_id}   — the pinned-detail rooms
```

A signal is tiny and carries no row data:

```json
{
	"source_type": "translation",
	"source_id": "…",
	"entity_id": "…",
	"op": "UPDATE"
}
```

This kills v1's "denormalize `lang` onto the comment tree" migration: no app
table changes at all. The rollup lives in one place, computed where it's
cheap and transactional. (Later, the trigram matview and the embed pipeline
could _consume_ the registry instead of maintaining parallel trigger sets —
one spine, three projections of it — but that's consolidation, not a
prerequisite.)

## 4. One verb: mark dirty, then recalculate

The entire client wire handler:

```ts
projection.onSignal(({ source_type, source_id, op }) => {
	const collection = bySignalType[source_type] // from `signals:` declarations
	if (op === 'DELETE') collection.utils.writeDelete(source_id)
	else collection.markDirty(source_id)
})
```

`markDirty(key)` coalesces: N dirty keys inside the debounce window become one
`select … where id in (…)` against `read.from`, written through as synced
state. Look at what unified into this one path:

- **Your own write's confirmation.** `insert()` lands optimistically, the
  framework POSTs to `write.to`, your own signal comes back, the by-key fetch
  returns the server row, synced state is written, the optimistic overlay
  drops. No echo-matching, no `.select()` choreography, no `should()`
  assertion — the recalculated row _is_ the server's answer.
- **Everyone else's writes.** Same signal, same fetch. Chat previews,
  request comment threads, new phrases in your language: off the wire.
- **Cascade deletes.** The trigger fires per cascaded row; each child emits
  its own DELETE signal. Today's "orphaned replies linger until the next
  stale refetch" caveat in `commentsCollection.onDelete` stops existing.
- **Server-computed columns.** `count_learners`, `avg_difficulty`,
  `avg_stability` need no `derived` list: the recalculation reads
  `phrase_meta`, so computed columns are simply _always right_ after any
  recalc of that key.
- **Reconnect catch-up.** After a socket gap, one query replaces per-table
  reconciliation: `select … from content_registry where <my scopes> and
updated_at > :last_seen` → a batch of dirty keys → the same coalesced
  fetch. The registry table is the backstop the wire needs anyway; that's
  why it's a table and not just triggers.

The cost, stated plainly: every remote change is signal + one round trip,
where v1's fat echoes carried the row. That's the trade — see flag 2.

At the component layer, nothing changes from today's best pattern:

```tsx
const tx = phraseTranslationsCollection.insert({
	id: crypto.randomUUID(),
	phrase_id,
	lang,
	text,
	added_by: userId,
})
tx.isPersisted.promise.then(
	() => toastSuccess('Translation added'),
	() => toastError('Failed to add translation')
)
```

## 5. Outside the projection: snapshots, or pin it

Content outside your scopes reads as a plain snapshot — PR #6's load-by-key
path, cache-first, single-row fetch on miss, allowed to go stale. A chat
preview of a Tagalog phrase when you study Hindi is _supposed_ to be a
snapshot. But unlike v1's binary in-the-room/out-of-the-room, any detail page
can pin its entity live with `entityScope(...)` — visiting that Tagalog
phrase's page gets you live translations and comments for exactly that
entity, without subscribing to all of Tagalog.

## What this deletes

- Every `onInsert/onUpdate/onDelete` handler on content collections, every
  `{ refetch: false }`, every `.select()`-to-confirm, every `should()`
  row-match assertion.
- Full-table `queryFn`s that download every language on first paint.
- `useSocialRealtime` / `useNotificationsRealtime` as hand-rolled channel
  effects — `userScope` carries chat, notifications, friend events, decks,
  cards, reviews (these are `uid`-partitioned, RLS-scoped; their signals ride
  the `sync:user:{uid}` topic with the same registry shape, `entity_lang`
  replaced by `uid`).
- v1's echo-matching machinery — never built, already deleted.
- The `collection.utils.refetch()` hard rule, by making the full-table
  refetch inexpressible: `markDirty` is the only refetch verb that exists.

## What has to exist

- **tanstack-db (PR #6 and successors):** predicate-inclusion dedupe and
  load-by-key exist in the PR. Still needed: predicate _pushdown into the
  fetch_ (a scope's covering slice must run `WHERE lang =` server-side, not
  full-table), a public coalesced by-key refetch (`markDirty` /
  `refetchKeys`), write-through of fetched rows as synced (not optimistic)
  state keyed to pending transactions, and scope-shaped pinning with
  ref-counts + grace period.
- **Supabase:** the `content_registry` table; per-content-table synchronous
  triggers (upsert registry row + `realtime.broadcast_changes` to the two
  topics); RLS policies on `realtime.messages` authorizing topic access
  (public for `sync:lang:*` and `sync:entity:*`, owner-only for
  `sync:user:{uid}`).
- **sunlo:** `defineSyncedCollection` (thin composition of the above),
  `projection` + scope helpers, the `/learn/$lang` → `/$lang` route move with
  redirects.

## Flag for review

1. **Registry coverage is a judgment call.** Inclusion criterion: "content
   someone could be looking at when it changes" — wider than the search
   corpus (add `request_comment`, `comment_phrase_link`, `lang_tag`,
   `message_tag_link`), narrower than the whole schema (user-private tables
   ride `userScope`, not the content registry). Each included table costs
   one trigger; each omitted table is a thing that silently doesn't sync.
2. **Signal-only wire = +1 round trip per remote change.** Coalescing
   amortizes bursts (a cascade delete of a 20-comment thread is one signal
   batch → one `in (…)` fetch), but a chatty surface would feel it. The
   escape hatch is per-table payload fattening — include the row in the
   broadcast for hot tables (chat_message) and skip the fetch — an
   optimization that reuses the same topics and handlers. Start signal-only;
   fatten with evidence.
3. **Stats signals are the chatty edge.** `count_learners` changes when
   _anyone_ creates a card; `avg_difficulty`/`avg_stability` change on every
   review. Signal-per-review would flood `sync:lang:*` topics. Options:
   don't signal stats at all (they refresh whenever the phrase is dirtied
   for any other reason — probably fine); or a debounced server-side rollup
   (pg_cron sweeping `phrase_stats` changes into coarse signals). Decide by
   watching, not up front.
4. **Delivery is at-most-once and that's now okay.** v1 needed echo-timeout
   fallbacks per pending write. v2's backstop is structural: any missed
   signal is caught by the reconnect catch-up query (registry `updated_at >
last_seen`) or, worst case, by the fetch-on-write-settle if a
   transaction's signal never arrives. Idempotent by-key write-through makes
   duplicate signals (lang topic + entity topic overlap) harmless.
5. **Prototype path without any of this:** `postgres_changes` supports
   `in`-filters, so `entity_lang=in.(hin,tgl)` and `entity_id=eq.{pid}`
   subscriptions against a registry table work _today_ — good enough to
   validate the projection UX on one screen before writing broadcast
   triggers, RLS-on-messages, or any tanstack-db changes. Known scaling
   ceiling, fine for a spike.
6. **`entity_lang` is stamped, not live.** Same trade the corpus already
   made ("doesn't auto-update if a phrase's lang changes — which doesn't
   happen in practice"). If lang-editing ever becomes real, the phrase
   trigger must cascade restamps to its children's registry rows.

## Relationship to PartyDB

Still the cookbook shape, one level up. Recipe 6's `Viewer` was a
per-connection answer to "what may you see"; the projection is the
per-session answer to "what do you care about" — and both compile to the
same two lowerings: a SQL `WHERE` for bulk reads (scope slices, catch-up
queries) and a topic/predicate match for fan-out. The registry is the room
directory: topics are cheap because computing "which rooms does this change
belong to" happens once, in the trigger, next to the RLS that decides who may
listen. If sunlo outgrows Supabase realtime, everything above §3 survives
verbatim — swap the registry's transport, keep the projection, keep the verb.
