# Database Workflow & Conventions

## Commands

```bash
# Create migration from local changes
pnpm run migrate

# Regenerate TypeScript types from database schema
pnpm run types

# Regenerate base schema file (curate before committing!)
pnpm run seeds:schema

# Dump current seed data
pnpm run seeds:data

# Reseed the local database
pnpm run db-reseed

# Regenerate schema + types + format in one step
pnpm run db-schema
```

**Important**: When regenerating `base.sql` and running the seeding script (`pnpm seeds:data`), be careful not to commit unintended deletions (like realtime table configurations). Always review the diff carefully.

## Workflow

1. Use Supabase Studio (http://localhost:54323) to modify schema/data
2. When feature works, run `pnpm run migrate` to create migration
3. Run `pnpm run seeds:schema` to update base.sql (review carefully!), update supabase types, run formatter
4. Run `pnpm run types` to regenerate TypeScript types

Schema definitions live in `supabase/schemas/`, migrations in `supabase/migrations/`, and seed files (`supabase/seed-*.sql`) load in alphabetical order.

## Web sessions / no Docker: validating migrations natively

The workflow above needs `supabase start`, which runs the stack as Docker
containers. Claude Code web sessions have no Docker, so use
`scripts/db-native.sh` — it stands up a plain Postgres 16 and reproduces the
minimal Supabase baseline (see `supabase/dev-native/`) so you can exercise a
migration without pulling to a local machine:

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
