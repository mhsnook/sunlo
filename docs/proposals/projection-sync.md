# The read model and the concierge 🚧

**Status: proposed, not shipped.** v5 — v1–v4 in git history. Two lines now:
**writes go to the normalized tables; reads come from a compiled entity
corpus.** And: **each user has a Durable Object directing their sync — the
client's whole contract is `apply(changes)` or `resnapshot(scope)`.**

## The loop

1. **Collections on the client**, as now.
2. **Optimistic writes with immediate move-on** for most mutations, written
   directly to Supabase — RLS stays the write kernel.
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
   and other cross-language metadata are their own tiny collections. They
   are not stuffed into the bundles.
6. **Each user has a concierge: a per-user Durable Object.** The client
   holds one socket to it and tells it a projection — the languages I
   study, the language I'm browsing, the entity I'm looking at. The DO
   watches the corpus on the user's behalf and, per change, decides what
   comes down: a batch of updates, or the instruction to take a fresh
   snapshot. To the client, sync "exists in the same cloud" as the data.

The client never reads the normalized content tables and never touches
realtime plumbing. `phrase_meta`, the `phrasesFull` live collection, and the
search RPCs were already groping toward the read model — `phrasesFull`
reimplements in the browser, on every render, the composition the corpus
triggers do once at write time.

## The read model

```sql
create table entity_doc (
	entity_type text not null, -- 'phrase' | 'request' | 'playlist'
	entity_id uuid not null,
	entity_lang text not null,
	doc jsonb not null, -- the bundle: entity + bounded children
	rev bigint not null default nextval('entity_doc_rev'), -- the log cursor
	updated_at timestamptz not null default now(),
	primary key (entity_type, entity_id)
);

create index on entity_doc (entity_lang, rev);
```

- **Compiled by triggers** on the content tables — the `phrase_meta` /
  `phrasesFull` composition, moved to write time. A translation edit
  recompiles its phrase's doc in the same transaction.
- **`rev` makes the table a log as well as a store.** "What changed in
  Hindi since rev 41210?" is one indexed query. Every consumer below —
  concierge deltas, snapshot workers, drift sweeps, the embed pipeline —
  is a reader of this log.
- **The embedding lives OFF this table.** Vector churn shouldn't advance
  the sync log. `search_corpus` keeps the vectors, keyed to
  `(entity_type, entity_id)`, and becomes a _consumer_ of the read model —
  as does the trigram index. One compilation, three consumers; the embed
  pipeline goes cron-over-staleness (`rev > vectorized_rev`), which also
  fixes today's borrowed-JWT/Studio-edit gap.
- **Grain is mixed, deliberately.** Bounded children (translations, tag
  links) bundle into the doc. Unbounded children (comments) are their own
  corpus rows sharing `entity_id`/`entity_lang` — same slice, same log —
  because a document that rewrites wholesale on every comment to a hot
  request pays WAL volume proportional to doc size, not delta size.
  `source_type` distinguishes the grains, as in `search_corpus` today.

## The concierge

One Durable Object per user. It holds the user's sockets (all their
devices), their projection, and a cursor per socket. Its downstream contract
is two verbs; its upstream contract is three:

```
concierge → client
  { type: 'apply', changes: [...docs and rows...] }
  { type: 'resnapshot', scope: 'lang:hin', asOfRev: 41210 }

client → concierge
  { type: 'hello', jwt, projection: [...scopes], cursors: {...} }
  { type: 'projection', add: [...], remove: [...] }
  { type: 'jwt', token } // refresh; the DO reads AS the user
```

- **This is v2's registry manager, relocated to where it stops being
  miserable.** The signal→data resolution still happens — but the "+1 round
  trip" is DO→Postgres (same region, pooled, batched), not
  browser→Postgres over hotel wifi. The DO reads the log and fetches the
  affected docs in one indexed query, then pushes _data_. The client never
  sees a signal, a shortlist, or a debounce window.
- **Delta vs snapshot is a server-side judgment.** Fourteen rows behind →
  `apply`. Three days behind, or a projection change adding a whole
  language → `resnapshot`, and the client pulls the slice from a snapshot
  worker that can cache per `(lang, rev)` — common-language snapshots are
  shared across users and CDN-able.
- **Security adds no trusted surface.** The DO's private reads (chats,
  notifications, decks, cards — the user scope rides the same socket) use
  the user's own JWT, so RLS applies to the DO exactly as to a browser.
  Public corpus reads use anon. The concierge does slicing, never
  security.
- **Poke plumbing is content-free and loss-tolerant.** An after-commit
  trigger pokes a per-lang router DO ("hin changed, rev 41211"), which
  pokes the user DOs whose projections include that lang; each concierge
  reads `rev > cursor` and decides. A lost poke delays convergence until
  the next poke or heartbeat — never corrupts it, because the cursor query
  is the source of truth, not the poke.
- **Multi-device falls out**: two tabs and a phone are three sockets on one
  concierge, per-socket cursors, one shared projection.
- **Writes stay direct to Supabase for now** (steps 2–3). The concierge
  _could_ mediate writes later — offline queues, batching, conflict
  handling — that seam is the point of having it, but don't spend it yet.

## The client

Collections hold documents. `usePhrase(pid)` reads one doc — the
`phrasesFull` client-side join retires. The handler for the entire sync
protocol is ~30 lines: `apply` batches through
`writeUpsert`/`writeDelete`; `resnapshot` re-runs the scope's fetch and
swaps. supabase-realtime-js leaves the client bundle entirely. The
tanstack-db work in PR #6 remains the query-side of the same idea:
`dedupeQueriesOn(['entity_lang'])` serves narrower live queries from the
slice, load-by-key serves strays as cache-first snapshots, and predicate
pushdown keeps every fetch `WHERE`-scoped instead of full-table.

## What this is, said out loud

v4 asked "did we just reinvent ElectricSQL shapes?" — the corpus is the
include-tree shapes lack, and the delivery half was hand-rolled
`postgres_changes`. v5 answers the delivery half properly, and the honest
name for the result is **PartyDB with Postgres as the system of record**:
the per-user DO is the cookbook's server (recipes 5–6), per-lang router DOs
are the parties/rooms, the corpus is the shape store, `rev` is the `?since`
backlog cursor, and "slicing, not security" is the same posture — with RLS,
not a `Viewer`, as the read-rule kernel underneath. Sunlo becomes the
proving ground for the framework, with the one part PartyDB doesn't
prescribe — a compiled multi-table read model — contributed by the corpus.
Electric remains a possible snapshot/log transport underneath the same
contract; nothing above the concierge would notice.

## Flag for review

1. **The real cost is the second runtime.** Workers + Durable Objects means
   deploys, secrets, monitoring, and a JWT-refresh lifecycle on the socket
   — sunlo is currently one Supabase and a static SPA. Everything else in
   v5 is small; this is the line item to be sure about. The incremental
   path: prove the corpus + `rev` log first (v4's client-direct wire works
   against it at prototype scale), then stand up the concierge without
   changing the data model.
2. **Write-time compilation cost.** `jsonb_agg` per write instead of per
   read — right trade for a read-heavy app; benchmark if request
   comment-tails grow long. Mixed grain is the pressure valve.
3. **Doc schema versioning.** The bundle shape is now an API between the
   compiler and every consumer. Zod `EntityDocSchema` per entity_type plus
   a `doc_version` field so old clients detect docs they don't understand
   and resnapshot.
4. **Poke fan-out topology.** Trigger → router DO → user DOs is the
   sketch; the router needs a subscription map (which users care about
   which langs) that must itself survive DO eviction. Keep it rebuildable
   from the concierges' `hello`s, not authoritative.
5. **Backfill and drift.** One idempotent `recompile_entity(type, id)`
   used by the triggers, the initial backfill, and a periodic drift sweep —
   the read model must stay cheap to rebuild from scratch or it will be
   feared.
6. **Cursor semantics at the edges.** Per-socket cursors must be advanced
   only after the client acks an `apply` batch (or resnapshot completes),
   or a dropped batch silently gaps the device until the next resnapshot.
   Small protocol detail, easy to get wrong, worth a scene test of its own.
