# Database Workflow & Conventions

## Commands

```bash
pnpm migrate       # write a migration from local schema changes
pnpm types         # regenerate src/types/supabase.ts
pnpm schema        # regenerate the supabase/schemas/ tree
pnpm seeds:data    # dump current seed data
pnpm seeds:corpus  # dump the search corpus only
pnpm db-reseed     # reseed the local database
pnpm db-reset      # supabase db reset
```

**Important**: review the schema-tree and seed diffs before committing.

## Workflow

1. Use Supabase Studio (http://localhost:54323) to modify schema/data
2. When the feature works, run `pnpm migrate` to create the migration
3. Run `pnpm types && pnpm schema` to regenerate the types and the schema tree

Migrations live in `supabase/migrations/`, and seed files (`supabase/seeds/seed-*.sql`) load in alphabetical order.

### The schema tree

`supabase/schemas/` holds the whole schema as one file per object: `public/tables/phrase.sql` carries the table with its indexes, triggers, policies and grants, and functions, views and types get folders of their own. Objects outside `public` that the app depends on live there too: the profile-creating triggers in `auth/tables/users.sql`, the avatar policies in `storage/tables/objects.sql`, the realtime publication in `_cluster/publications.sql`, and the `recount-all-upvotes` cron job in `_cluster/misc.sql`. `.pgdelta-export.json` lists the files pg-delta owns and the order it loads them in.

`pnpm schema` runs `supabase db schema declarative generate`, which writes the tree from the local database. It deletes a file whose object is gone, but only a file it wrote itself, so a hand-added file stays until you delete it. The tree is generated, so `.prettierignore` keeps prettier and oxfmt away from it.

`src/lib/realtime-publication.test.ts` reads the table files and `publications.sql` to check the realtime rule under Gotchas.

### The diff engine is pg-delta

`[experimental.pgdelta]` in `supabase/config.toml` makes pg-delta the engine behind `supabase db diff`, `db pull` and the declarative commands, so `pnpm migrate` needs no engine flag. The CLI pin in `package.json` and in `.github/workflows/test.yaml` must stay at 2.119 or later, because older CLIs refuse to parse that config block. pg-delta diffs policy changes, grants, default privileges, publication membership and `pg_cron` jobs, which the old migra engine skipped.

`pnpm migrate` diffs the local database against the migrations, so it never reads the tree. `supabase db schema declarative sync --no-apply` goes the other way: edit the tree, and it writes the migration. It also emits a few statements on every run that come from the shadow's base image rather than from Sunlo, so delete them from the generated file:

- `pg_net` is dropped and recreated in `extensions`. The migration that creates it names no schema, so the local database and the migration history disagree on where it lives.
- `pgjwt` comes back, because the base image ships it and a tree can't say an extension is absent. Migration `20260826120000_drop_pgjwt.sql` dropped it.
- The `public` schema gets back the stock comment and `pg_database_owner` grants that the migration history has removed.

## Web sessions / no Docker: validating migrations natively

The workflow above needs `supabase start`, which runs the stack as Docker
containers. Claude Code web sessions have no Docker, so use
`scripts/db-native.sh` — it stands up a plain Postgres 16 and reproduces the
minimal Supabase baseline (see `supabase/dev-native/`) so you can exercise a
migration without pulling to a local machine:

```bash
scripts/db-native.sh reset                              # bootstrap + schema tree + all seeds
scripts/db-native.sh apply supabase/migrations/<new>.sql  # does the new migration apply?
scripts/db-native.sh psql -c '\d some_table'            # poke around
```

**Use it to validate, not to author the committed artifacts.** It confirms
migrations apply and seeds load (that's the reliable win). `reset` loads the
tree with the standalone `@supabase/pg-delta` package, the engine the CLI
bundles, into a second Postgres cluster that serves as the shadow. It can
also `dump` (the schema tree) and `types` (`supabase.ts`), but a native dump
differs from `pnpm schema` in grant order, `vector`'s function comments and
some whitespace, and it adds a `_custom/README.md` scaffold. Keep regenerating
the committed tree and `src/types/supabase.ts` locally or in CI with the real
Supabase CLI. Known limits: `auth.uid()` returns NULL (RLS is effectively
off — don't test RLS here), and `reset` builds from the tree and `apply` puts
new migrations on top, rather than replaying the full history (the plv8
migrations can't run natively; CI still replays everything via Docker). Full
detail lives in the header of `scripts/db-native.sh`.

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
