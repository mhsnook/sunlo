# scripts/

One-off maintenance scripts. Each is standalone — not part of the app bundle,
not part of CI. They connect directly to Supabase using the **service role
key**, so treat them with production-grade care.

Scripts in this directory share the same patterns: dry-run by default,
`--apply` to write, `--uid <uuid>` to scope to one user, env-var handling
documented once below under **Running against production**, and a 5-second
safety pause before any non-local write.

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
