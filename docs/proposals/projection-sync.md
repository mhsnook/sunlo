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

**Amendment (v2.1).** The write's own HTTP response is the ack — not the
signal coming back around. That makes the write path a four-beat loop
(optimistic → ack → server-side enhancement → convergence off the wire) where
the wire has _zero correctness duties_ for your own writes, and the
enhancement step can grow arbitrarily rich. §4 tells the whole story.

## The idea in three sentences

1. **Every user has a projection**: the slice of the database they care about
   right now — the languages they study, the language they're browsing, the
   entity on the screen, and themselves. The projection is a small set of
   predicates, composed by routes and session state, changing as they move.
2. **A skinny synchronous registry** — same rollup schema as `search_corpus`,
   none of its weight — broadcasts a signal on every content change,
   addressed by `entity_lang` and `entity_id`.
3. **Clients answer every signal with the same verb**: `markDirty(key)` — a
   coalesced by-key refetch from the collection's read source. Other
   people's edits, cascade deletes, server-computed columns, and the
   enhanced aftermath of your own writes are all the _same case_.

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

## 4. The four-beat loop, and the one verb

**Your own writes** are a four-beat loop. The wire is only the last beat, and
nothing waits on it:

1. **Optimistic.** `collection.insert(row)` — the UI updates this tick.
2. **Ack.** The framework writes the row to `write.to` and the HTTP response
   is the confirmation: persisted, RLS passed. `isPersisted` resolves, the
   toast fires, the returned row is written through as synced state. _Done
   worrying._ A rejection throws here and rolls the optimistic state back.
3. **Enhancement.** The server transforms at its leisure, entirely in
   triggers and crons: the registry stamp, stats rollups, upvote counts,
   trigram refresh, embeddings — arbitrary logic can accrete here precisely
   because no client is waiting on it.
4. **Convergence.** The change comes back down the wire like anyone else's
   change (below), and your local copy picks up whatever beat 3 computed. If
   it takes 300ms, nobody cares — beat 2 already answered.

This is what lets more and more operations become plain CRUD-plus-trigger.
An upvote today is an insert plus client-side count bookkeeping; in this
loop it's _just the insert_ — a trigger (or rapid cron) recomputes the
count, that update stamps the registry, and everyone converges, including
you.

**Everyone else's writes** — here's the walkthrough, concretely. Priya fixes
a typo in a translation on a Hindi phrase you have on screen:

1. Her app updates the row in `phrase_translation` (her beats 1–2).
2. In that same transaction, the trigger updates the row's line in the
   registry and shouts on `sync:lang:hin`:
   `{ source_type: 'translation', source_id: '4f3a…', entity_id: '9c2e…', op: 'UPDATE' }`.
   Note what the shout does _not_ contain: the new text.
3. Your browser hears it. The app's single wire handler looks at
   `source_type`, finds the collection that declared `signals: 'translation'`,
   and — since the shout carried no data — puts `4f3a…` on a shortlist:
   _stale, refetch soon_. That is the entirety of `markDirty`.
4. ~100ms later the shortlist flushes as one ordinary select —
   `from('phrase_translation').select().in('id', [...shortlist])` — the fresh
   rows are written into the collection, live queries re-run, Priya's fix is
   on your screen.

The entire client wire handler:

```ts
projection.onSignal(({ source_type, source_id, op }) => {
	const collection = bySignalType[source_type] // from `signals:` declarations
	if (op === 'DELETE') collection.utils.writeDelete(source_id)
	else collection.markDirty(source_id)
})
```

Nobody "keeps track of what to update" — there is no plan to maintain. The
shout names the row; the shortlist holds it for a beat; the refetch replaces
the local copy by key. Idempotency falls out: refetching a row you already
have overwrites it with itself, so duplicate shouts (lang topic + entity
topic overlap, or your own write's echo arriving after beat 2 already wrote
it) are harmless. And the same shortlist unifies every case that used to be
special:

- **Cascade deletes.** The trigger fires per cascaded row; each child emits
  its own DELETE shout. Today's "orphaned replies linger until the next
  stale refetch" caveat in `commentsCollection.onDelete` stops existing.
- **Server-computed columns.** `count_learners`, `avg_difficulty`,
  `avg_stability` need no special handling: the refetch reads `read.from` —
  the view — so computed columns are simply _always right_ after any recalc
  of that key.
- **Reconnect catch-up.** Laptop slept through twenty shouts? On reconnect,
  ask the registry one question — `where <my scopes> and updated_at >
:last_seen` — and put everything it returns on the same shortlist through
  the same flush. The registry's timestamp column is the whole recovery
  story; that's why it's a table and not just triggers.

The cost, stated plainly: hearing a shout isn't having the data — each remote
change costs the one extra select in step 4 (coalesced across everything
shouted in the same window). v1's fatter echoes carried the row and skipped
that fetch, at the price of per-table wire formats. See flag 2 for the
middle path.

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
   fallbacks per pending write; v2.1 needs none — your own writes are
   confirmed by the ack (beat 2), so a lost signal can only delay
   _enhancement_, never correctness. Missed signals are caught structurally
   by the reconnect catch-up query (registry `updated_at > last_seen`), and
   idempotent by-key write-through makes duplicates harmless.
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
7. **Fix the embed pipeline's auth-header gap independently.** Today the
   embed trigger borrows the calling user's JWT to invoke the edge function,
   so no-session writes (Studio, psql) silently skip vectorization. The fix
   that fits the four-beat loop: stop pushing from the trigger. The
   `vectorized_at` staleness machinery already exists — a pg_cron sweep that
   selects stale rows (`source.updated_at > corpus.vectorized_at`, or
   registry-driven once it exists) and calls the embed function with its own
   credential makes embedding a self-healing beat-3 chore: Studio edits,
   dropped pg_net calls, and backfills all converge on the next sweep. Worth
   doing even if nothing else in this document ships.

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
