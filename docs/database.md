# Database Workflow & Conventions

## Commands

```bash
pnpm migrate       # write a migration from local schema changes
pnpm types         # regenerate src/types/supabase.ts
pnpm schema        # regenerate supabase/schemas/base.sql
pnpm seeds:data    # dump current seed data
pnpm seeds:corpus  # dump the search corpus only
pnpm db-reseed     # reseed the local database
pnpm db-reset      # supabase db reset
```

**Important**: review the `base.sql` and seed diffs before committing — a regeneration can silently drop things like the realtime publication list.

## Workflow

1. Use Supabase Studio (http://localhost:54323) to modify schema/data
2. When the feature works, run `pnpm migrate` to create the migration
3. Run `pnpm types && pnpm schema` to regenerate the types and `base.sql`

The whole schema is one file, `supabase/schemas/base.sql`. Migrations live in `supabase/migrations/`, and seed files (`supabase/seeds/seed-*.sql`) load in alphabetical order.

## Web sessions: the full stack on demand

Claude Code web sessions start with no Docker daemon, but the VM ships one.
`scripts/supabase-cloud.sh up` starts it, fetches the Supabase CLI, runs
`supabase start` with CI's service exclusions, and writes the keys to `.env`.
A cold boot is ≈3 minutes (image pulls), a warm one ≈40 s, so reach for it
only when the work needs auth, RLS, realtime, storage, or a scenetest run.
The `supabase-cloud-stack` skill carries the flow and the measured costs.

## Web sessions: validating migrations natively, in seconds

For schema-only checks, `scripts/db-native.sh` stands up a plain Postgres 16
and reproduces the minimal Supabase baseline (see `supabase/dev-native/`), with
no Docker and a ≈1 s warm reset, so you can exercise a migration without
booting the stack:

```bash
scripts/db-native.sh reset                              # bootstrap + base.sql + all seeds
scripts/db-native.sh apply supabase/migrations/<new>.sql  # does the new migration apply?
scripts/db-native.sh psql -c '\d some_table'            # poke around
```

**Use it to validate, not to author the committed artifacts.** It confirms
migrations apply and seeds load (that's the reliable win). It can also
`dump` (`base.sql`) and `types` (`supabase.ts`), but those go through
`pg_dump` / a standalone `postgres-meta` rather than the Docker-only
`supabase db dump` / `supabase gen types`, so the output is **not**
byte-identical — keep regenerating the committed `base.sql` and
`src/types/supabase.ts` locally or in CI with the real Supabase CLI. Known
limits: `auth.uid()` returns NULL (RLS is effectively off — don't test RLS
here), and `reset` builds from `base.sql` + applies new migrations on top
rather than replaying the full history (the plv8 migrations can't run
natively; CI still replays everything via Docker). Full detail lives in the
header of `scripts/db-native.sh`.

## Schema Patterns

- **Primary keys**: Always UUID with `id uuid default gen_random_uuid() not null`
- **Table names**: Singular (e.g., `phrase` not `phrases`)
- **Timestamps**: Use `created_at timestamp with time zone default now() not null`
- **User data**: Private tables use `uid` field with Row Level Security (RLS)
- **Soft delete**: users mark rows `deleted` or `archived`, never hard delete (it messes with realtime — see Gotchas).
- **Every row gets an `id`**, join tables included, so client collection keys are uniform. Where a pair must be unique, say so with a partial unique index over the live rows: `unique (a_id, b_id) where deleted = false`.
- **Tombstones**: if a removed row still holds active comments, blank its text and leave the row in place, public, so the replies keep a parent. `request_comment` is the only one today: `blank_removed_comment` clears `content`, and the UI hides the author. The `uid` column stays, because the UPDATE policy and the upvote joins key on it.

### The three soft-delete shapes in use

| Shape                                                                    | Example                                          | Where                                                 |
| ------------------------------------------------------------------------ | ------------------------------------------------ | ----------------------------------------------------- |
| Public, archived, still visible to its owner and admins                  | `phrase.archived`, `phrase_translation.archived` | `src/components/cards/admin-archive-phrase.tsx:8`     |
| Private, archived, only ever visible to its owner                        | `user_deck.archived`                             | `src/routes/_user/learn/-archive-deck-button.tsx:32`  |
| Public, not recoverable, keeps its replies and shows a "removed" message | `request_comment.deleted`                        | `src/components/comments/comment-with-replies.tsx:85` |

Join and upvote tables all use the first shape with `deleted` rather than `archived`.

## Row Level Security (RLS)

- Never expose tables with `uid` field without RLS
- RLS filters data automatically - can load whole tables for user collections
- Create public views for shared data, carefully vet what's exposed
- Use explicit `uid` checks in queries for faster query planning:
  ```typescript
  .eq('uid', userId!)
  ```

## User Data Management

- **Profile data**: Attach to Profile table (username, avatar, preferred languages)
- **User metadata**: Only use `user.user_metadata` for UI-critical fields (currently just `user_role`)
- Always validate user owns data before mutations

## Seed Data Conventions

All seed data uses relative date calculations from `current_date`:

```sql
created_at = current_date - 4 + interval '2 minute' day_session = (current_date - 4 + interval '2 minute' - interval '4 hour')::date
```

This ensures seed data remains relevant (cards "created 4 days ago" are always 4 days old). When modifying seeds, maintain this pattern for dates.

## Gotchas

**A realtime-published table must not narrow its SELECT policy on `deleted`.** Supabase tests an UPDATE frame against the subscriber's SELECT policy using the _new_ row, so `deleted = false or uid = auth.uid()` drops the very frame that says the row is gone — for everyone but its owner, whose client keeps showing it until the next fetch. Publish the table, or narrow the policy, never both.

The published soft-delete tables carry no `deleted` clause in their SELECT policies, which is why removals propagate: the three upvotes read plain `uid = auth.uid()`, and `request_comment` plus the three link tables (`comment_phrase_link`, `playlist_phrase_link`, `phrase_tag`) read `using (true)` — a removed comment is a blanked tombstone and a link row is bare ids, so there is nothing to hide. Before adding a soft-deleted table to `supabase_realtime`, drop the `deleted` clause from its SELECT policy first.

**This is an intermediate state, and #793 is the way out.** The four tables holding user-written text — `phrase`, `phrase_translation`, `phrase_request`, `phrase_playlist` — narrow their SELECT policies to hide a removed row's content, so none of them can publish, so **archiving one of them reaches nobody else's device.** A client that already holds the row keeps rendering it until the person reloads the app, and `refetchOnMount: false` in `src/lib/query-client.ts` means navigating does not count as a reload. The rule above is a workaround for that, not a design: it makes you pick between hiding the content and announcing the removal. #793 removes the choice — a trigger moves the content into a sidecar table on archive, so the row that streams is an empty husk, the policy can stay open, and one flag does the whole job.

**A partial unique index only constrains the live rows.** `unique (a_id, b_id) where deleted = false` lets a removed link and its replacement coexist, so anyone can re-add a pair someone else removed. Two _live_ rows for the same pair are still rejected.

**A full reset-and-regenerate is three commands**: `pnpm db-reset && pnpm types && pnpm schema`.
