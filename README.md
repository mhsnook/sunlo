# Sunlo.app

A react SPA and a Supabase project.

## Local Setup

**tl;dr:** Install docker desktop, the Supabase CLI, and PNPM packages (`pnpm i`), run the Supabase DB start (or reset) (`supabase start` or `supabase db reset`) and run the vite server (`pnpm dev`).

### Supabase back-end

- Install [Docker Desktop](https://docs.docker.com/desktop/)
- Install [Supabase cli](https://supabase.com/docs/guides/local-development/cli/getting-started)
- `supabase start` to set up the Supabase project for the first time
- `supabase db reset` to run migrations and seeds

### React front-end

- `pnpm install`
- `cp .env.example .env`
- populate the environment variables in .env with the outputs from `supabase start`
- `pnpm dev`

Access the in the browser at `http://127.0.0.1:5173`.

## Database management

[Full list of Supabase CLI commands is here.](https://supabase.com/docs/reference/cli/supabase-status)

### Migrations

1. Use the local admin at [http://localhost://54323](http://localhost://54323) to make changes to your dev DB. You can point and click to add or modify columns, or use the SQL terminal to create or modify views and functions.
2. One your feature is working, use `pnpm run migrate` to create migrations based on your local changes.
3. `pnpm run seeds:schema` to re-create the base.sql schema. Be sure to use a formatter and only commit things you're sure of. (Oftentimes `base.sql` will be created with some key lines removed, like the command that turns on realtime for required tables (because your local doesn't have it turned on), so you have to not commit those deletions.)
4. `pnpm run types` to regenerate typescript types

The migrations should run when the main branch deploys. Or you can `supabase db push` to make it so.

[Read more about working with Supabase migrations.](https://supabase.com/docs/guides/local-development/cli/getting-started)

### To Modify the Seeds

We have a script capped `dump-new-seeds.ts` which is useful for taking local database state and turning it into seeds, specifically for this app.

- run the seeds with `supabase db reset`
- then modify data in the app and run ``

### Search corpus

The `/chats` chat-style search feature and the semantic side of
`/search` read from a `search_corpus` table that holds denormalized
phrase + translation + request + playlist text plus BGE-M3 embeddings.
`supabase db reset` wipes that table; populate it with:

```bash
pnpm tsx scripts/backfill-search-corpus.ts
```

This requires Cloudflare Workers AI credentials in `.env`
(`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`) and takes ~30 seconds
on seed-sized data. If you don't have those, `/chats/$lang` returns
empty results and `/search` falls back gracefully to trigram-only
ranking — no other surface breaks.

Use `pnpm dev:local` (sets `VITE_CHAT_USE_MOCK=true`) to develop the
chat UI against canned mock data without populating the corpus or
calling Workers AI.

See [`scripts/README.md`](./scripts/README.md) for details on the
backfill script's flags (e.g. `--normalize-only` for cheap re-runs
after rule changes), running against a remote project, and the cost
shape.

## The React App

- This app is a full SPA as an architectural choice so that we can use Tauri to compile it to
  native apps.
-     We use Tanstack's Router in a React app bundled by Vite, as the front end framework.
- Data is fetched from the Supabase API using Tanstack DB's QueryCollections, loading up
  whole tables and slices of tables into the local Collections in memory, and then using
  live queries to combine, select, join, filter, and aggregate the data as the UI requies.
- Mostly when we mutate data we are using Tanstack Query's useMutation, and in the onSuccess for
  the mutation we will run an update to the local collection after the response data comes back:

```typescript
onSuccess: (data) => {
	someCollection.utils.writeInsert(SomeSchema.parse(data))
	toast.success('New deck created!')
}
```

- Realtime connections are used for friend requests and chat messages. They are quite easy to set
  up these listeners in a useEffect, to receive updates and then either `utils.writeInsert` or
  `utils.writeUpdate` the new record. It remains to be seen how they affect performance when the
  system has more users, so be mindful.

## Deployment

The app is deployed to **Vercel**.

### Vercel-Specific Features

**Social Previews (Open Graph):** The app uses
[Vercel Edge Middleware](https://vercel.com/docs/functions/edge-middleware)
(`middleware.ts`) to serve Open Graph meta tags to social media crawlers. Since the app is
a pure SPA with no SSR, this middleware intercepts crawler requests and returns a minimal
HTML page with OG tags for link previews on Facebook, Twitter, LinkedIn, WhatsApp, etc.

This feature **only works on Vercel** - if you deploy elsewhere, social link previews will
not work without implementing an equivalent solution for your platform.

## Using Tauri for Native Apps

It has always been our intention to cross-compile the JS app for use in a Tauri shell to make
native versions of the app, but at this time we aren't maintaining or supporting the Tauri build.

The technology and its industry support are improving rapidly so by the time we are finished with
some other core features, it will make sense to come back and take another try at it.
