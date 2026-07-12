# Language-partition sync — the code we want to write 🚧

**Status: proposed, not shipped.** This is the lesson-6 exercise applied to
sunlo itself: write the application code we _wish_ we could write, then read
off exactly what framework has to exist underneath it. Nothing here compiles
today. The gaps are enumerated honestly in [Flag for review](#flag-for-review).

## The angst this answers

Today every mutation carries its own persistence choreography: an
`onInsert/onUpdate/onDelete` handler that calls supabase, appends `.select()`
to get the row back, decides `{ refetch: false }`, and (increasingly)
`should()`-asserts that the returned row matches the optimistic one. Every
public collection is a full-table fetch of every language at once. Realtime is
bolted on for exactly two tables (`chat_message`, `friend_request_action`) via
hand-rolled channels in `useSocialRealtime`. The computed columns on
`phrase_meta` (`count_learners`, `avg_difficulty`, `avg_stability`) can't be
predicted client-side _or_ delivered by a base-table event, so they silently
go stale until someone full-refetches.

The proposal collapses all of that into two ideas:

1. **A language is a room.** `lang` becomes a proper partition: it moves to
   the root of the URL, and the `/$lang` route layout is what subscribes you
   to that language's wire — phrases, translations, tags, requests, comments,
   playlists. You are realtime-synced to exactly one language at a time.
   You're also always in a second room: **yourself** — `uid:{me}` carries your
   chats, notifications, friend events, decks, cards, reviews (this is where
   `useSocialRealtime` and `useNotificationsRealtime` go to die, happily).
2. **Inside a room, the wire is the source of truth.** Writes are optimistic
   collection inserts with _no handler code_; the confirmation is your own
   change coming back off the wire. Server-computed values are handled by
   marking the row dirty and recalculating — a first-class verb, not an ad-hoc
   refetch. Outside your rooms, reads are plain snapshot fetches and that's
   fine.

RLS stays the security kernel, exactly as now: worst case is a broken UI,
never leaked data. Zod stays at every wire boundary. Live queries and
components don't change at all — they were already written the way we want.

## 1. Collections declare their partition, not their persistence

```ts
// features/phrases/collections.ts — the dream
export const phrasesCollection = defineSyncedCollection({
	id: 'phrases',
	schema: PhraseSchema,
	getKey: (p: PhraseType) => p.id,
	read: { from: 'phrase_meta', columns: PHRASE_META_COLUMNS }, // the view
	write: { to: 'phrase' }, // the base table
	partitionBy: 'lang',
	derived: ['count_learners', 'avg_difficulty', 'avg_stability'],
})

export const phraseTranslationsCollection = defineSyncedCollection({
	id: 'phrase_translations',
	schema: TranslationSchema,
	getKey: (t: TranslationType) => t.id,
	read: { from: 'phrase_translation' },
	write: { to: 'phrase_translation' },
	partitionBy: 'lang',
})
```

Compare with today's `src/features/phrases/collections.ts`: the `read`/`write`
split is the view/base-table split we already do by hand, and everything else
in that file — all three handlers per collection, ~120 lines of
`transaction.mutations.map(...)` supabase calls — is gone. Not moved, gone:
the framework knows how to write a row to `write.to` (intersect the schema
with the table's columns), and it does not need a bespoke success path because
confirmation arrives off the wire (§3).

`derived` names the columns that only the server can compute — the ones a
base-table echo can't carry. They're what `markDirty` (§4) recalculates.

## 2. The route enters the room

Language moves to the URL root. The `/$lang` layout _is_ the partition
boundary — entering it attaches the wire, leaving it detaches:

```ts
// routes/$lang.tsx — was /learn/$lang; now the partition root
export const Route = createFileRoute('/$lang')({
	loader: async ({ params: { lang } }) => {
		// Idempotent. Leaves the previous language room if different.
		await langRoom.enter(lang)
	},
	onLeave: () => langRoom.scheduleLeave(), // grace period, see flag 4
})
```

`enter(lang)` does exactly two things:

1. **Slices** every `partitionBy: 'lang'` collection to
   `eq(row.lang, lang)` and pins that slice as the _covering query_. This is
   the tanstack-db PR #6 machinery: with `dedupeQueriesOn: ['lang']`, every
   narrower live query mounted anywhere under the route subtree —
   `useLanguagePhrases`, a tag filter, one request's comment tree — is proven
   included in the slice and served from it. Zero additional fetches for the
   whole language section.
2. **Subscribes** one channel, topic `lang:{lang}`. Every INSERT/UPDATE/DELETE
   on a partitioned table with that lang arrives as a broadcast, gets parsed
   by the collection's Zod schema, and is written through
   `writeInsert`/`writeUpdate`/`writeDelete`. One socket topic per language —
   the PartyDB "room", spelled in Supabase.

The user room `uid:{me}` is the same shape, attached once at the `_user`
layout for the life of the session, carrying the tables where the natural
partition is _you_: `chat_message`, `notification`, `friend_request_action`,
`user_deck`, `user_card`, `user_card_review`. Two rooms, always: your language
and yourself.

## 3. Writes: no handlers, the echo is the confirmation

```tsx
// a component, anywhere under /$lang — this is the ENTIRE mutation
const addTranslation = (text: string) => {
	const tx = phraseTranslationsCollection.insert({
		id: crypto.randomUUID(),
		phrase_id: phrase.id,
		lang,
		text,
		added_by: userId,
	})
	tx.isPersisted.promise.then(
		() => toastSuccess('Translation added'),
		() => toastError('Failed to add translation')
	)
}
```

Unchanged from today at the call site — that's deliberate; the component layer
was already right. What changes is everything underneath:

- The optimistic row lands in the same tick (as now).
- The framework POSTs the row to `write.to`. A write error still throws and
  rolls back the optimistic state (as now).
- **Confirmation is the row's own broadcast echo**, matched by the
  client-generated id. When the echo lands, the synced state is written and
  the optimistic overlay drops. No `.select()` round-trip, no
  `{ refetch: false }` decision, no `should()` row-comparison — the echo _is_
  the server row, delivered on the same pipe every other client gets it on.
- Cascades come off the wire too: deleting a comment broadcasts the cascaded
  reply and phrase-link deletes as their own events, so the "orphaned replies
  linger until the next stale refetch" caveat in today's
  `commentsCollection.onDelete` stops existing.

The deprecated `useMutation`-plus-`writeInsert` pattern and the current
handler pattern both dissolve into this. `docs/mutations.md` becomes about
three paragraphs long.

## 4. Derived state: mark the row dirty, then recalculate

Some values genuinely live on the server: `phrase_meta.count_learners` changes
because someone _else's_ card was created; FSRS averages change on reviews.
The wire tells us _that_ something changed, not the new computed value. So the
room wiring — the one place in the app allowed to think about refetching —
says exactly what it means:

```ts
// the lang room's table wiring — declarative, colocated with the collection defs
langRoom.wire({
	phrase: phrasesCollection,
	phrase_translation: phraseTranslationsCollection,
	phrase_tag: phraseTagLinksCollection,
	lang_tag: langTagsCollection,
	phrase_request: phraseRequestsCollection,
	request_comment: commentsCollection,
	comment_phrase_link: commentPhraseLinksCollection,
	phrase_playlist: phrasePlaylistsCollection,
})

// and the cross-table ripples, stated as ripples:
userRoom.on('user_card', (change) => {
	cardsCollection.applyWire(change)
	// count_learners / avg_* changed server-side for this phrase
	phrasesCollection.markDirty(change.row.phrase_id)
})
```

`markDirty(key)` schedules a coalesced recalculation: N dirty keys within the
debounce window become one `select ... where id in (…)` against `read.from`
(the view), written through as synced state. It is the legal, bounded,
by-key replacement for `collection.utils.refetch()` — the hard rule in
CLAUDE.md stops being a rule you follow and becomes a thing the API won't let
you get wrong: full-table refetch simply isn't a verb anymore.

## 5. Outside the room: just fetch it

Chats need a preview of a phrase from some other language; a friend's profile
shows decks you don't study. No subscription, no partition ceremony:

```tsx
const { data: phrase } = useOnePhrase(pid) // same hook as inside the room
```

This is PR #6's load-by-key path: if any room or prior query already holds the
row, it's served from cache; otherwise it's a single-row fetch. It's a
snapshot — it can go stale, and that is _correct_ for a preview of a language
you're not in. If the user taps through, they cross into `/$lang/...`, the
room attaches, and the row is now live. Staleness is scoped to exactly the
things you're not looking at.

## What this deletes

- Every `onInsert/onUpdate/onDelete` handler on partitioned collections —
  roughly 500 lines across `phrases`, `requests`, `playlists`, `deck`.
- Every `{ refetch: false }` and every `.select()`-to-confirm.
- The `should()` server-row-matches assertions (the echo is the server row).
- Full-table `queryFn`s fetching every language's content on first paint.
- `useSocialRealtime` and `useNotificationsRealtime` as hand-rolled channel
  effects — they become two `userRoom.wire()` entries.
- The `collection.utils.refetch()` hard rule, by making the API unable to
  express the mistake.

## What has to exist for this to run

Named plainly, PartyDB-cookbook style — this is the framework we'd "go back
and write":

- **In tanstack-db (PR #6 and successors):** predicate-inclusion dedupe with
  `dedupeQueriesOn: ['lang']` and load-by-key exist in the PR. Still needed:
  **predicate pushdown into the fetch** — the covering slice must run
  `queryFn({ where: eq(lang) })` as a `WHERE lang =` fetch instead of a
  full-table load, or the room's first paint still downloads the world. Also
  needed: a public **by-key coalesced refetch** (`markDirty`/`refetchKeys`)
  and **write-through of wire events** as synced (not optimistic) state with
  echo-to-transaction matching by key.
- **In Supabase:** one trigger per partitioned table calling
  `realtime.broadcast_changes('lang:' || coalesce(NEW.lang, OLD.lang), …)`,
  with topic access authorized through RLS policies on `realtime.messages`.
  Broadcast-from-database, not `postgres_changes` — see flag 5.
- **In sunlo:** the `defineSyncedCollection` wrapper (a thin composition of
  the above), `langRoom`/`userRoom` (subscribe, Zod-parse, write-through,
  dirty-tracking), the `/$lang` route move, and the schema change in flag 1.

## Flag for review

1. **Denormalize `lang` onto the comment tree.** `phrase`,
   `phrase_translation`, `lang_tag`, `phrase_request`, `phrase_playlist`,
   `chat_message`, decks/cards/reviews already carry `lang` — the partition is
   almost honest. `request_comment`, `comment_phrase_link`, `phrase_tag`, and
   `message_tag_link` inherit it through a parent. Adding a `lang` column
   (stamped by trigger from the parent, indexed) keeps the framework dumb: one
   partition column, one broadcast topic, one `WHERE` clause everywhere. The
   alternative — a `via(parentCollection, 'request_id')` lookup — infects the
   framework with join logic and a fetch-ordering dependency. Recommend
   denormalizing; it's four columns and a trigger each.
2. **Echo reliability.** A websocket can drop between the POST succeeding and
   the echo arriving; broadcast delivery is at-most-once. So confirmation
   needs a fallback: if no echo matches a pending transaction within ~5s, do a
   by-key fetch of the written row (the same `markDirty` machinery). And on
   channel rejoin after a gap, the room must reconcile — refetch the slice
   with `updated_at > last_seen` rather than trusting it saw everything.
   This is the real cost of "the wire is the source of truth": the wire needs
   a backstop, and it should be written once, in the room, not per-mutation.
3. **Ordering and self-echo.** The echo path requires receiving your own
   broadcasts and tolerating echo-before-POST-returns and double-application
   (write-through must be idempotent by key). All solvable, all framework, all
   invisible to app code — but they're where the bugs will live.
4. **Route move is a breakage surface.** `/learn/$lang/*` → `/$lang/*` is
   mechanical (dot-notation renames) plus permanent redirects for old links.
   `chats.$lang` stays outside the language room — chat is user-room data that
   merely mentions a lang. Rapid lang-switching should not thrash: `leave()`
   wants a grace period (keep the old room's slice pinned ~30s) so bouncing
   between two languages doesn't refetch both repeatedly.
5. **Why broadcast triggers, not `postgres_changes`.** Filtered
   `postgres_changes` subscriptions run per-subscriber RLS checks on every
   event and cap out quickly; Supabase's own guidance is to prefer
   broadcast-from-database for fan-out. Broadcast also gives us the topic
   (`lang:{code}`) as a first-class thing — which _is_ the room abstraction —
   and lets a single DB trigger define what the wire carries, next to the RLS
   that defines who may hear it. The cost: per-table triggers to write and
   maintain, and events carry whatever the trigger sends (base columns — hence
   `derived` + `markDirty`).
6. **Derived columns are eventually consistent.** `count_learners` lags one
   debounce window behind the event that dirtied it. For learner counts and
   difficulty averages that's obviously fine; nothing correctness-bearing may
   ever go in `derived`.

## Relationship to PartyDB

This is the cookbook's shape with the pieces relabeled: the Durable Object
room becomes a broadcast topic; `loadViewer` + read predicates become RLS
(already written, already enforced, already per-viewer); the socket fan-out
becomes `realtime.broadcast_changes`; and the client collection API is the
same one in both worlds — tanstack-db with optimistic writes and live queries.
If sunlo ever outgrows Supabase realtime, the app code above is exactly what
it would write against PartyDB too. That's the point of writing the dream
code first: it's the stable layer; everything under it is swappable.
