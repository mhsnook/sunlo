# The entity corpus is the read model 🚧

**Status: proposed, not shipped.** v4 — v1–v3 in git history. One line:
**writes go to the normalized tables; reads come from a compiled entity
corpus; the wire is that one table.**

## The loop

1. **Collections on the client**, as now.
2. **Optimistic writes with immediate move-on** for most mutations.
3. **Some writes hold for the ack** — including RPCs — and every write path
   makes best effort to return the affected rows with the ack
   (`.select()`, RPCs that `RETURN` rows: today's `docs/mutations.md`
   advice, kept).
4. **The server compiles the content tables into an entity corpus** —
   `search_corpus`-style, maintained by synchronous in-transaction triggers
   (no pg_net, no HTTP, no borrowed JWTs). Translations bundle with their
   phrase. Comments bundle with their request. Tag links bundle into the
   entity they tag. Every corpus row carries `entity_id`, `entity_type`,
   `entity_lang` — the _owning_ entity's lang, so a Hindi phrase's English
   translation travels in the Hindi slice.
5. **Universal tables stay universal**: `languages`, tag names/descriptions
   and other cross-language metadata are their own tiny collections with
   their own low-volume realtime. They are not stuffed into the bundles.
6. **The client watches one table.** Content subscriptions are slices of the
   corpus — by `entity_lang` for the languages you study/browse, by
   `entity_id` for the detail page you're on — delivered by tailing the WAL
   (Supabase `postgres_changes` today). The corpus is all-public, so the
   subscription logic is _slicing, not security_. Private data (chats,
   notifications, decks, cards) stays on user-scoped subscriptions exactly
   as it works today.

The client never reads the normalized content tables. That's the move that
makes everything else fall out: it's a read-model/write-model split, and
`phrase_meta`, the `phrasesFull` live collection, and the search RPCs were
already groping toward the read model — `phrasesFull` reimplements in the
browser, at read time, the composition the corpus triggers do once at write
time.

## The read model

```sql
create table entity_doc (
	entity_type text not null, -- 'phrase' | 'request' | 'playlist'
	entity_id uuid not null,
	entity_lang text not null,
	doc jsonb not null, -- the bundle: entity + bounded children
	rev bigint not null default nextval('entity_doc_rev'), -- resume cursor
	updated_at timestamptz not null default now(),
	primary key (entity_type, entity_id)
);

create index on entity_doc (entity_lang, rev);
```

- **Compiled by triggers** on the content tables — the `phrase_meta` /
  `phrasesFull` composition, moved to write time. A translation edit
  recompiles its phrase's doc in the same transaction.
- **`rev` is the offset.** Reconnect catch-up is
  `where entity_lang in (…) and rev > :last_seen` — exact and monotonic, no
  timestamp ties. (Stolen from ElectricSQL's shape log; see below.)
- **The embedding lives OFF this table.** A vector upsert is an UPDATE
  event; on the watched table it would re-broadcast the doc plus ~8–16KB of
  floats to every subscriber. `search_corpus` keeps the vectors, keyed to
  `(entity_type, entity_id)`, and becomes a _consumer_ of the read model —
  as does the trigram index. One compilation, three consumers (sync, trigram,
  embeddings); the embed pipeline goes cron-over-staleness (`rev >
vectorized_rev`), which also fixes today's borrowed-JWT/Studio-edit gap.
- **Grain is mixed, deliberately.** Bounded children (translations, tag
  links) bundle into the doc. Unbounded children (comments) are their own
  corpus rows sharing `entity_id`/`entity_lang` — same slice, same wire —
  because a document that rewrites wholesale on every comment to a hot
  request pays WAL volume proportional to doc size, not delta size, and
  realtime payloads have caps. `source_type` on the row (as in
  `search_corpus` today) is what distinguishes the grains.

## The wire

```ts
// snapshot: an ordinary select, sliced
const snapshot = supabase
	.from('entity_doc')
	.select()
	.in('entity_lang', activeLangs)

// live: tail the WAL on the same slice
supabase.channel('sync:content').on(
	'postgres_changes',
	{
		event: '*',
		schema: 'public',
		table: 'entity_doc',
		filter: `entity_lang=in.(${activeLangs.join(',')})`,
	},
	(payload) => {
		if (payload.eventType === 'DELETE')
			docs.utils.writeDelete(keyOf(payload.old)) // PK survives on deletes
		else docs.utils.writeUpsert(EntityDocSchema.parse(payload.new))
	}
)

// pinned detail page (any language): same handler, entity_id filter
// catch-up after a gap: select … where rev > lastSeenRev — then resubscribe
```

Slices compose from session + route — the languages of my decks, the
language I'm browsing, the entity I'm looking at — ref-counted with a grace
period. Everything outside my slices reads as a cache-first snapshot
(load-by-key), which is correct for a preview of a language I'm not in.

## The client

Collections hold documents. `usePhrase(pid)` reads one doc — no live-query
joins to assemble a phrase from three collections; `phrasesFull` retires.
The tanstack-db work in PR #6 is the query-side of the same idea:
`dedupeQueriesOn(['entity_lang'])` proves narrower live queries are covered
by the slice; predicate pushdown makes the snapshot fetch `WHERE entity_lang
in (…)` instead of the whole table; load-by-key serves strays. Writes are
unchanged from steps 2–3 — the collection's write path targets the
normalized tables/RPCs and the ack's returned rows settle `isPersisted`; the
corpus doc arriving on the wire moments later is a harmless upsert-by-key.

## So… did we just reinvent ElectricSQL shapes?

Yes — split down the middle, and the split is instructive:

- **We built the half Electric doesn't have.** An Electric shape is a
  single-table `WHERE` clause; there are no joins. Syncing
  phrase+translations+tags through Electric means three shapes and
  client-side reassembly. The corpus compilation _is_ the include-tree,
  materialized in the database — it converts a multi-table sync problem into
  the single-table problem every transport handles well.
- **We're reinventing the half Electric does better.** Its shape log is
  gapless, offset-addressed, resumable, CDN-friendly. Our tail is
  at-most-once `postgres_changes` plus a `rev` catch-up query — same idea,
  hand-rolled. Acceptable at our scale; not better.
- **Same security posture.** Electric punts auth to a proxy in front of the
  shape API; we punt it by making the read model all-public and keeping
  private data on user-scoped channels. "Slicing, not security" is their
  stance too.

Which yields the convergence worth writing down: **because the read model is
one public table, Electric becomes trivially adoptable later as pure
transport** — `entity_doc WHERE entity_lang = 'hin'` is exactly the shape
Electric is good at. Build the corpus, and the transport (postgres_changes
now; Electric or anything else when the per-subscriber-filter ceiling bites)
is a swappable detail no app code sees.

## Flag for review

1. **Write-time compilation cost.** The `jsonb_agg` composition runs per
   write instead of per read — the right trade for a read-heavy app, but
   it's the thing to benchmark if request comment-tails grow long. Mixed
   grain (comments as own rows) is the pressure valve.
2. **Payload caps.** Supabase realtime drops oversized events. Bundles must
   stay bounded (hence mixed grain); a doc approaching the cap is a design
   smell, not a config problem.
3. **`postgres_changes` per-subscriber filtering** still costs the realtime
   server per event per subscriber — but with no RLS on the hot path (public
   table) the ceiling is far higher than filtered private tables, and the
   Electric escape hatch above needs zero app-code change.
4. **Doc schema versioning.** The bundle shape is now an API. A Zod
   `EntityDocSchema` per entity_type, and a `doc_version` field so old
   clients can detect docs they don't understand and fall back to refetch.
5. **Deletes carry only the PK** (`entity_type`, `entity_id`) — sufficient
   to remove the doc; soft-deletes (requests, playlists) are UPDATEs with
   `deleted: true` compiled into the doc and filtered in live queries.
6. **Backfill and drift.** One idempotent `recompile_entity(type, id)`
   function used by the triggers, the initial backfill, and a periodic
   drift-check sweep — the read model must be cheap to rebuild from scratch
   or it will be feared.
