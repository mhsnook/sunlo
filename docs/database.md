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

# Apply seeds
pnpm run seeds:apply
```

**Important**: When regenerating `base.sql` and running the seeding script (`pnpm seeds:data`), be careful not to commit unintended deletions (like realtime table configurations). Always review the diff carefully.

## Workflow

1. Use Supabase Studio (http://localhost:54323) to modify schema/data
2. When feature works, run `pnpm run migrate` to create migration
3. Run `pnpm run seeds:schema` to update base.sql (review carefully!), update supabase types, run formatter
4. Run `pnpm run types` to regenerate TypeScript types

Schema definitions live in `supabase/schemas/`, migrations in `supabase/migrations/`, and seed files (`supabase/seed-*.sql`) load in alphabetical order.

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
