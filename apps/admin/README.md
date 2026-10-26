# Sunlo Admin

The team dashboard at `admin.sunlo.app`. It is a separate Vite app that shares the main app's Supabase project, types and UI components, and deploys on its own to Cloudflare as the `sunlo-admin` Worker, which serves the app's static files and its `/api`.

## Sign-in

Admins sign in with their normal Sunlo email and password. The admin app keeps its own session, because the browser stores a Supabase session per origin, so signing in on `sunlo.app` does not sign you in here.

Any Sunlo account can sign in, but only accounts listed in `public.admin_user` see the dashboard. The Worker checks that table itself on every `/api` request, so the UI check is a convenience, not the security boundary. To add an admin:

```sql
insert into public.admin_user (uid) values ('<the user uuid>');
```

## How data flows

The dashboard's numbers come from `worker/`, a [Hono](https://hono.dev) app that runs SQL against the database as `admin_reader`, a read-only Postgres role (`supabase/migrations/20261023120000_admin_reader_role.sql`). A new chart is a new query in `worker/stats.ts` and a Zod schema in `src/lib/stats.ts`, not a migration.

1. The app calls `GET /api/activity-overview?days=7` or `GET /api/user-activity?days=7&limit=20` on its own origin, with `Authorization: Bearer <access token>` from the admin's Supabase session.
2. The Worker verifies the token with `supabase.auth.getClaims()` and requires `role = 'authenticated'`, so the public anon key gets a 401.
3. It connects as `admin_reader` with [postgres.js](https://github.com/porsager/postgres) through Supabase's transaction pooler, and checks `public.admin_user` for the token's user. Anyone else gets a 403.
4. It runs the query and returns one JSON object, which the app parses with the Zod schemas in `src/lib/stats.ts`.

`admin_reader` has `bypassrls`, so it counts across every user's rows, and `default_transaction_read_only`, so it cannot write through any path. It reads every public table except these:

| Table               | admin_reader sees                 | Hidden                                   |
| ------------------- | --------------------------------- | ---------------------------------------- |
| `chat_message`      | `id`, `sender_uid`, `created_at`  | the message, who received it, read state |
| `notification`      | `id`, `uid`, `type`, `created_at` | who acted and on what                    |
| `user_client_event` | `id`, `uid`, `created_at`         | error messages, context and URLs         |
| `db_meta`           | nothing                           | everything                               |
| `auth.*`            | nothing directly                  | passwords, tokens, identities            |

It reads `auth.users` only through the view `admin.user_account`, which exposes `id`, `email`, `created_at` and `last_sign_in_at`. The view exists because the role that runs migrations does not own `auth.users` and cannot grant on it; a view it owns reads the table on `admin_reader`'s behalf. The `admin` schema is not in PostgREST's exposed schemas, so the API never serves it.

Writes, when the admin app gets them, go through the admin's own Supabase session and RLS, so the row history names a person. `admin_reader` never writes, and nothing here uses the service-role key.

## The usage reporter

The dashboard opens with "Since you last checked in": a short report written by an agent that reads the database and remembers what it told you last time.

- **What it is:** `worker/reporter/agent.ts`, a Cloudflare Agents SDK Durable Object named `Reporter`. One instance, `team`, serves every admin. Its own SQLite holds each admin's reports and the notes the agent chooses to keep, so its memory lives in the Durable Object, not in Postgres.
- **When it runs:** opening the dashboard calls `POST /api/reporter/check-in`. The window starts where your last finished report ended (the last 7 days on your first visit) and ends now. A check-in within 30 minutes of a report that is writing or done returns that report instead of starting a new run. "Write a fresh report" skips that rule.
- **How it works:** the check-in schedules `writeReport` on the Durable Object, so the run outlives the request. The run is an AI SDK `generateText` tool loop (at most 15 steps) on Workers AI, through the Agents SDK's model provider and the Worker's `AI` binding, so it needs no model API key. The `REPORTER_MODEL` var in `wrangler.jsonc` names the model (`@cf/moonshotai/kimi-k2.6` today); any Workers AI model that takes tools works, and changing it is the only step. The loop has these tools, plus the GitHub tools below when they are set up:
  - `activity_between`: a preset query with signups, reviews and each reviewer, new decks, and library and chat counts for a window
  - `run_sql`: one SELECT of the agent's own, run as `admin_reader` with an 8-second timeout and at most 200 rows
  - `remember` and `forget`: notes kept for future reports, listed under the report as "What the reporter remembers"
- **How the app follows it:** the app polls `GET /api/reporter/reports/:id` every 3 seconds until the report is done or failed. A failed run records its error on the report and is never retried automatically, because a retry pays for the whole model run again.
- **Cost:** every report is one model run with a handful of tool calls, billed to the Cloudflare account as Workers AI usage.

Local development: the `AI` binding always runs remotely, so `pnpm admin:worker:dev` needs `wrangler login` (or `CLOUDFLARE_API_TOKEN`) for reports to run.

### Filing GitHub issues

When three more secrets are set, the reporter also gets `list_my_issues`, `file_issue` and `comment_on_issue`, and files issues on `mhsnook/sunlo` (the `GITHUB_REPO` var) as its own GitHub App. It files only for something that looks broken in the product or the data, never for usage commentary. Without the secrets it has no GitHub tools, and reports work as before.

The repository is public, so the tools enforce these limits in code, whatever the prompt says:

- **No personal data.** An issue or comment that contains an email address, a user's id or a username is refused, and the agent is told to rewrite it.
- **No duplicates.** The agent keeps every issue it files in its SQLite. It checks that list first, and it can comment only on its own issues.
- **Rate limits.** At most 2 issues per run and 5 per 24 hours, and 3 comments per run.
- **A label and a footer.** Every issue gets the `from-reporter` label and ends with "Filed by the Sunlo usage reporter."

To set it up, once:

1. On GitHub, open **Settings › Developer settings › GitHub Apps › New GitHub App**. Name it, for example, "Sunlo Reporter". Turn off **Webhook › Active**. Under **Repository permissions**, set **Issues** to **Read and write**. Leave everything else at No access. Create the app and note its **App ID**.
2. On the app's page, **Generate a private key**. GitHub downloads a `.pem` file in PKCS#1 format, and Workers can only read PKCS#8, so convert it:

   ```bash
   openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in sunlo-reporter.pem -out sunlo-reporter-pkcs8.pem
   ```

3. **Install App** on your account, with **Only select repositories** set to `mhsnook/sunlo`. The installation id is the number at the end of the page's URL (`github.com/settings/installations/<id>`).
4. In the repository, create the label `from-reporter`, so the app does not depend on creating it.
5. Set the secrets from `apps/admin`, then delete both `.pem` files:

   ```bash
   pnpm exec wrangler secret put GITHUB_APP_ID
   pnpm exec wrangler secret put GITHUB_APP_INSTALLATION_ID
   pnpm exec wrangler secret put GITHUB_APP_PRIVATE_KEY < sunlo-reporter-pkcs8.pem
   ```

If the key is still in PKCS#1 format, the report says GitHub filing is unavailable and why, and the rest of the report still runs.

## Commands

Run these from the repo root:

```bash
pnpm admin:dev         # http://localhost:5174, reads the root .env; proxies /api to :8788
pnpm admin:worker:dev  # the Worker, http://localhost:8788, reads apps/admin/.dev.vars
pnpm admin:check       # typecheck the app and the Worker
pnpm admin:build       # production build into apps/admin/dist
pnpm test:unit         # includes worker/*.test.ts
```

There is no deploy command: Cloudflare deploys on a merge to `main`.

## Local development

The Worker needs `apps/admin/.dev.vars`, copied from `.dev.vars.example`. `SUPABASE_URL` and `SUPABASE_ANON_KEY` come from `supabase status`. The database connection is the Hyperdrive binding's `localConnectionString` in `wrangler.jsonc`, which `wrangler dev` uses in place of the production Hyperdrive config. It connects to local Supabase as `admin_reader` with the password `admin_reader`, and the migration creates that role with no password, so set one once:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "alter role admin_reader password 'admin_reader'"
```

Roles belong to the Postgres cluster, not the database, so the password survives a `supabase db reset` as long as the local Supabase containers do. If the Worker reports a failed sign-in after a reset, run the command again. Never put the password in a seed file: `[db.seed]` loads every file in `supabase/seeds/` into preview and production databases too.

`worker/worker-configuration.d.ts` is generated by `wrangler types` on `pnpm install` and is not committed. Run `pnpm install` again after changing `wrangler.jsonc`.

## How it shares code

- `@/…` resolves to the main app's `src/`, so `@/components/ui/button` and `@/lib/supabase-client` are the same files the main app uses.
- `~/…` resolves to `apps/admin/src/`.
- The main app must never import from `apps/admin`.
- `worker/` is its own TypeScript project (`tsconfig.worker.json`) and imports nothing from `src/` except, in tests, the Zod schemas.

## Deploying

Workers Builds (Cloudflare's Git integration) builds and deploys the `sunlo-admin` Worker on every push to `main`, and on no other branch. The dashboard settings are in `docs/deployment.md`, under "Cloudflare" › "Setup".

`wrangler.jsonc` serves `dist/` as static assets with an SPA fallback and runs `worker/index.ts` for `/api/*`, on the custom domain `admin.sunlo.app`. The custom domain needs the `sunlo.app` zone on the same Cloudflare account.

The Worker reaches the database through [Hyperdrive](https://developers.cloudflare.com/hyperdrive/), bound as `HYPERDRIVE` in `wrangler.jsonc`. The Hyperdrive config holds the production connection string for `admin_reader`, so the Worker has no database secret of its own. Hyperdrive is required, not an optimisation: Supabase signs its database certificates with its own CA, which a Worker's TLS socket cannot verify, and from Cloudflare's network that handshake hangs rather than failing. Hyperdrive makes the TLS connection on the Worker's behalf. If the database stops answering, every `/api` route returns a 500 after 15 seconds instead of hanging, and the Worker logs the reason.

The usage reporter's GitHub issues need three optional secrets, set with `wrangler secret put` or in the dashboard: `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID` and `GITHUB_APP_PRIVATE_KEY` ("Filing GitHub issues", above).

The build reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at build time, from the Workers Builds build variables. If either is missing, the build still succeeds but drops the Supabase SDK, and the app cannot sign in. Do not deploy by hand: a local build reads the root `.env`, which points at local Supabase.
