# scripts/

One-off maintenance scripts. Each is standalone — not part of the app bundle,
not part of CI. They connect directly to Supabase using the **service role
key**, so treat them with production-grade care.

Scripts in this directory share the same patterns: dry-run by default,
`--apply` to write, `--uid <uuid>` to scope to one user, env-var handling
documented once below under **Running against production**, and a 5-second
safety pause before any non-local write.

---

## `dump-new-seeds.ts`

Captures rows that changed since the last `supabase db reset` and emits
INSERT SQL with relative timestamps (`now() - interval 'N days'`), ready
to paste into the appropriate seed file.

### How it knows what changed

`seed.sql` inserts `seeded_at = now()` into `public.db_meta` on every
`db reset`. The script queries that value as its baseline and finds all
rows where `created_at > seeded_at` OR `updated_at > seeded_at` (the
latter catches profile edits, translation edits, etc. on existing rows).
If `db_meta` isn't populated yet (e.g. you haven't reset since adding the
migration), pass `--since` as a fallback.

### How rows are assigned to teams

Each table has a `partitionCol`. Two rules:

- `partitionCol = 'lang'` → row goes to the team whose `langs` set
  contains that value (e.g. `'hin'` → team 1, `'fra'` → team 2)
- anything else (`uid`, `added_by`, `sender_uid`, …) → row goes to the
  team whose `uids` set contains that value

Rows that don't match either team go to a **public** bucket (tagged
`seed-public.sql`). `phrase_tag` has no direct `lang` column — it joins
through `phrase.lang` automatically.

Team UIDs and lang sets are defined at the top of the script. Keep them
in sync with `scenetest/actors/default.ts` and `scenetest/actors/team2.ts`
when actors are added or renamed.

### Usage

```bash
# Typical session: dump new rows and push all timestamps back 1 day
deno run --env-file --allow-env --allow-net --allow-read --allow-write \
  scripts/dump-new-seeds.ts --shift-back 1

# Dump only (no time shift)
deno run --env-file --allow-env --allow-net --allow-read --allow-write \
  scripts/dump-new-seeds.ts

# Shift all seed file timestamps back 1 day without dumping
deno run --env-file --allow-env --allow-net --allow-read --allow-write \
  scripts/dump-new-seeds.ts --shift-back 1

# Preview what would be written (stdout, no files touched)
deno run --env-file --allow-env --allow-net \
  scripts/dump-new-seeds.ts --dry-run

# Only team 1's delta
deno run --env-file --allow-env --allow-net --allow-read --allow-write \
  scripts/dump-new-seeds.ts --team 1 --shift-back 1

# Full snapshot — every row for all tracked tables
deno run --env-file --allow-env --allow-net --allow-read --allow-write \
  scripts/dump-new-seeds.ts --all
```

Output goes to **stdout** with `-- TARGET FILE: supabase/seed-team1.sql`
markers so you know where each block belongs. Diagnostic lines are written
to **stderr** so they don't contaminate redirected output.

### CLI flags

| Flag                    | Effect                                                                          |
| ----------------------- | ------------------------------------------------------------------------------- |
| _(none)_                | Delta since `db_meta.seeded_at` (or `--since` fallback), all teams and tables.  |
| `--team <1\|2\|public>` | Only output rows belonging to that team (or the unassigned public bucket).      |
| `--tables <t1,t2,…>`    | Restrict to specific table names.                                               |
| `--since <interval>`    | Override baseline; e.g. `"2 days"`, `"6 hours"`. Ignored when `db_meta` is set. |
| `--all`                 | No time filter — dump all tracked rows regardless of age.                       |

### Required env vars

| Var                         | Notes                                        |
| --------------------------- | -------------------------------------------- |
| `VITE_SUPABASE_URL`         | Defaults to `http://127.0.0.1:54321`         |
| `SUPABASE_SERVICE_ROLE_KEY` | From `.env`; run `supabase status` to get it |

### Tracked tables

Language-partitioned: `phrase`, `phrase_request`, `phrase_playlist`,
`phrase_tag` (joined via `phrase.lang`)

UID-partitioned: `phrase_translation` (`added_by`), `playlist_phrase_link`,
`request_comment`, `chat_message` (`sender_uid`), `friend_request_action`
(`uid_by`), `phrase_request_upvote`, `user_profile`, `user_deck`,
`user_card`, `user_deck_review_state`, `user_card_review`,
`user_client_event`

To add a new table, add an entry to `TABLES` in the script with
`partitionCol`, `timestamps`, and optionally `dates` / `dateFromTimestamp`.

---

## `backfill-search-corpus.ts`

Populates the `search_corpus` table with denormalized phrase + translation

- request + playlist text and BGE-M3 embeddings (1024d). Both `/chats`
  and the semantic side of `/search` read from this table — without it,
  `/chats/$lang` returns empty results and `/search` falls back to
  trigram-only ranking.

`supabase db reset` wipes `search_corpus`. Run this script afterwards
(or any time the seed data or `src/features/chat/normalize.ts` rules
change) to repopulate it.

### Local

Local `.env` is loaded automatically. You need all four vars:

```bash
# Full populate — text + text_normalized + embedding (hits Workers AI):
pnpm tsx scripts/backfill-search-corpus.ts

# Re-normalize without re-embedding (skips Workers AI entirely):
pnpm tsx scripts/backfill-search-corpus.ts --normalize-only
```

Required env vars:

| Var                         | When               |
| --------------------------- | ------------------ |
| `VITE_SUPABASE_URL`         | always             |
| `SUPABASE_SERVICE_ROLE_KEY` | always             |
| `CLOUDFLARE_ACCOUNT_ID`     | full backfill only |
| `CLOUDFLARE_API_TOKEN`      | full backfill only |

`--normalize-only` updates `text` + `text_normalized` on existing rows
and never calls Workers AI. Use it after tweaking
`src/features/chat/normalize.ts` when you don't want to burn embedding
credits re-vectorizing things that barely changed. Rows that don't yet
exist in the corpus are skipped (run a full backfill first to seed
them).

### Against a remote project (preview branch, staging, prod)

Same env-var override pattern as `recompute-reviews.ts` — inline the
remote creds and they beat your local `.env`:

```bash
VITE_SUPABASE_URL="https://<ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
CLOUDFLARE_ACCOUNT_ID="..." \
CLOUDFLARE_API_TOKEN="..." \
pnpm tsx scripts/backfill-search-corpus.ts
```

The upsert is idempotent on `(source_type, source_id)`, so re-runs
update existing rows in place. Cost shape: ~10 batched calls of 32 to
Workers AI per ~300 rows, ~30 seconds total. Free-tier eligible at
prototype scale.

### CLI flags

| Flag               | Effect                                                                         |
| ------------------ | ------------------------------------------------------------------------------ |
| _(none)_           | Full backfill. Reads phrases + translations, normalizes, embeds, upserts.      |
| `--normalize-only` | Updates `text` + `text_normalized` on existing rows only. No Workers AI calls. |

---

## `reclassify-phase1-duplicates.ts`

Finds groups of `day_first_review = true` rows that share the same
`(uid, lang, phrase_id, direction, day_session)` and flips all but the
oldest to `day_first_review = false`. The oldest is the genuine phase-1
review; the rest are phase-3 re-reviews that got misclassified by a
historical bug (see readme/review-interface-flow-logic.md:21-23).

Run this **before** `recompute-reviews` when you have duplicate phase-1
warnings. Recommended flow:

```bash
tsx --tsconfig scripts/tsconfig.json scripts/reclassify-phase1-duplicates.ts          # dry-run
tsx --tsconfig scripts/tsconfig.json scripts/reclassify-phase1-duplicates.ts --apply  # flip
tsx --tsconfig scripts/tsconfig.json scripts/recompute-reviews.ts --apply             # re-normalize FSRS chain
```

The flipped rows keep their `score` and `created_at`. Their FSRS values get
overwritten by the subsequent `recompute-reviews` pass, which will mirror
the kept phase-1's values onto them.

---

## `recompute-reviews.ts`

Replays every card's review chain from `created_at` + `score` through the
same `calculateFSRS()` function the app uses at review time, and corrects
any `difficulty` / `stability` / `review_time_retrievability` values that
drifted. Phase-3 rows (`day_first_review = false`) are set to mirror the
same-session phase-1 review.

See the docblock at the top of `recompute-reviews.ts` for the full
algorithm. This README is about **how to run it safely**.

### Running locally against the local Supabase stack

```bash
# Start Supabase locally, make sure .env is populated
supabase start

# Dry run — always do this first
pnpm recompute-reviews

# If the summary looks right, apply
pnpm recompute-reviews --apply
```

Local `.env` is loaded automatically. Nothing more to do.

### Running against production

This is the part that needs care. Read the whole section before you run
anything.

#### 1. How env vars resolve

The script calls `import 'dotenv/config'` at the top. That auto-loads
`./.env` (from your cwd — the project root) into `process.env`.

**Precedence:** dotenv **does not override** variables that are already
set in the environment. So if you export or inline env vars before
invocation, those win; only missing ones get filled in from `.env`.

That's the hook for production runs: pass prod creds inline, and they'll
beat whatever's in your local `.env`.

#### 2. Get the prod credentials

You need two values from the Supabase dashboard (Project Settings → API):

- `VITE_SUPABASE_URL` — the project URL, e.g. `https://<project-ref>.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` — the `service_role` key (**not** anon).
  This bypasses RLS. Treat it like a root password. Never commit it.

#### 3. Back up the table first

The script only writes to `user_card_review` (no card-table writes needed —
the `user_card_plus` view projects review values through). But `--apply`
modifies existing rows in place; there's no automatic rollback.

From the Supabase SQL editor or a psql session pointed at prod:

```sql
create table user_card_review_backup_yyyymmdd as
select
	*
from
	user_card_review;
```

Or via pg_dump (using the pooler connection string from the dashboard):

```bash
pg_dump "$PROD_CONN_STRING" \
  --table=public.user_card_review \
  --data-only \
  --file=user_card_review_backup.sql
```

Keep the backup until you've verified the apply went well.

#### 4. Dry-run against production

Always. The `.ts` file itself is safe — it does no writes unless `--apply`
is passed — but check what it will do before flipping the switch.

```bash
VITE_SUPABASE_URL="https://<ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<prod-service-role-key>" \
tsx --tsconfig scripts/tsconfig.json scripts/recompute-reviews.ts
```

Look for:

- `Target: REMOTE (likely production)` in the header — confirms env vars
  are resolving to prod, not getting silently overridden by your local
  `.env`
- `Reviews examined:` / `Chains examined:` — should roughly match what
  you expect for prod volume
- `Reviews needing update:` — the count of rows `--apply` would change
- Sample diffs — eyeball a few for sanity (is the drift direction
  consistent? do phase-3 rows' target values match phase-1 of the same
  session?)

If the numbers look wrong, don't run `--apply`. Open the script, the
collections, or the DB and figure out why.

#### 5. Apply

Same command, add `--apply`:

```bash
VITE_SUPABASE_URL="https://<ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<prod-service-role-key>" \
tsx --tsconfig scripts/tsconfig.json scripts/recompute-reviews.ts --apply
```

When `--apply` is combined with a non-local URL, the script prints a
warning and sleeps 5 seconds before starting. If you see that banner and
the URL isn't the one you meant, `^C` aborts.

Writes are row-by-row `update ... eq id`. Each failure throws and stops
the script — partial applies are possible if the network drops, but the
script is **idempotent**: re-running picks up where it left off (rows
already correct drift under `EPSILON` and are skipped).

#### 6. Verify

Re-run without `--apply`:

```bash
VITE_SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." pnpm recompute-reviews
```

`Reviews needing update: 0` means every row matches the recomputed chain.

Spot-check a card you know was affected by the bug in the app — decks
list / review session / stats screen should show corrected difficulty +
stability.

### CLI flags

| Flag           | Effect                                                                                 |
| -------------- | -------------------------------------------------------------------------------------- |
| _(none)_       | Dry run. Prints summary + first 20 diffs.                                              |
| `--apply`      | Writes corrections to DB. Prompted with a 5s pause against prod.                       |
| `--verbose`    | Print every diff, not just the first 20. Still dry-run unless combined with `--apply`. |
| `--uid <uuid>` | Limit the scope to one user's reviews (for testing or partial fixes).                  |

### What the script assumes

- **Scores and `created_at` values are ground truth.** If the original bug
  corrupted those (not just the derived FSRS columns), this won't catch it.
- **The TS `calculateFSRS()` is canonical.** Any row whose stored FSRS
  values disagree with a fresh replay is "wrong." If you tune FSRS weights
  later, re-running will mass-update every row.
- **Phase-3 rows mirror same-session phase-1.** If no phase-1 exists for a
  phase-3's `day_session` (data anomaly), the phase-3 row is skipped, not
  invented.

### Rollback

There's no built-in undo. Your options:

1. Restore from the backup you took in step 3:

   ```sql
   truncate user_card_review;

   insert into
   	user_card_review
   select
   	*
   from
   	user_card_review_backup_yyyymmdd;
   ```

   (Careful: this locks the table and blocks writes while it runs. Prefer
   a per-row update-from-backup if writes are ongoing.)

2. Supabase PITR (Point-In-Time Recovery), if enabled on your plan. Rewinds
   the whole project to before the apply.

### Troubleshooting

**"SUPABASE_SERVICE_ROLE_KEY is required"**
You didn't inline it and it's not in `.env`. Or you exported it in a
different shell. `echo $SUPABASE_SERVICE_ROLE_KEY` to check.

**"Target: LOCAL" when you meant production**
Your inline `VITE_SUPABASE_URL` got dropped. Some shells treat
`FOO=bar command` differently across multi-line invocations — make sure
both env assignments are on the same logical line as `pnpm`, or use
`env VITE_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm ...`.

**RLS errors on apply**
You used the anon key, not service role. The script can't bypass RLS
without it.

**Script hangs at "Loading reviews..."**
Large tables take time — paginated 1000/page. For a prod DB with
hundreds of thousands of reviews this is a few minutes, not seconds.
