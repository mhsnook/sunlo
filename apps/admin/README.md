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
3. It connects as `admin_reader` with [postgres.js](https://github.com/porsager/postgres) through Hyperdrive ("Deploying", below), and checks `public.admin_user` for the token's user. Anyone else gets a 403.
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

## The crew

The dashboard opens on the crew room: a group chat between the admins and six AI agents named for their jobs. Each agent posts when it runs, and @mentions the others. Questions for an admin carry buttons. Each agent also has a workspace page with its job, its to-do list, what is open with you, its memory, and a 1:1 chat.

| Agent     | Job                 | Status                                    |
| --------- | ------------------- | ----------------------------------------- |
| Product   | Product manager     | Runs: daily at 07:00 UTC, and when called |
| Monitor   | Site reliability    | Planned                                   |
| Moderator | Community moderator | Planned                                   |
| Languages | Language lead       | Planned                                   |
| Curator   | Library curator     | Planned                                   |
| Growth    | Growth              | Planned                                   |

The roster lives in `shared/crew.ts`. A planned agent has a workspace page, and messages for it wait in the room until it starts.

### Where things live

- **The agents** are [Flue](https://flueframework.com) agents in `.flue/agents/`. `@flue/vite` builds each one into a Durable Object in this Worker (`FlueProductAgent`, bound as `FLUE_PRODUCT_AGENT`) and stores its conversations there. `.flue/agents/use-crew-member.ts` holds what every agent shares: the model, the tools, and the context each run starts with.
- **The room** is the `CrewRoom` Durable Object (`worker/crew/room.ts`), one instance named `team`. It is an [Agents SDK](https://developers.cloudflare.com/agents/) `Agent` with no model. Its SQLite holds the timeline, each agent's to-dos, memory and open items, and CLEF's decision log. It is not in Postgres, so no migration touches it. The app connects to it with `useAgent` at `/api/crew/live`, which reconnects on its own. The room's synced state holds each agent's status, and its socket messages announce new messages and workspace changes. A WebSocket cannot carry headers, so the app sends the Supabase token as `?token=`, and `worker/api.ts` accepts a query token on that route only.
- **The routes** are in `.flue/app.ts`, which adds `/api/crew/*` and `/api/agents/*` to the admin API from `worker/api.ts`. `.flue/cloudflare.ts` exports the room and runs the 07:00 cron.

### How a message reaches an agent

CLEF decides where each admin message goes, and the compose bar shows its decision on a chip before you send:

1. A message that ends in "..." **stacks**: it wakes nobody, and it rides along with your next message that does.
2. An @mention of a started agent **sends** the message to that agent.
3. Otherwise a small Workers AI model (`CLEF_MODEL`) chooses between **sending** it to an agent and **leaving it in the room**. Agents read the room at their next run either way.

Click the chip to change the decision before you send. After you send, the note under your message opens the same menu: correct it there, and any agent the message should have woken wakes now.

The room logs every decision in `clef_decision`: what CLEF suggested, what the message did, your correction if you made one, and, for each agent the message woke, whether its run posted anything ("posted") or nothing ("silent"). The rows where you changed or corrected CLEF are its labels, and CLEF reads the latest 20 the next time it decides.

A message sent to an agent becomes a signal in that agent's `team` conversation. The 1:1 chat on a workspace page is a separate conversation, `dm-<admin uid>`, which only that admin can open.

### What an agent can do

Every run starts with the time, the agent's workspace, and the room messages since its last run. The tools:

- `activity_between`: signups, reviews and each reviewer, new decks, and library and chat counts for a window
- `run_sql`: one SELECT, run as `admin_reader` with an 8-second timeout and at most 200 rows
- `post_to_crew`: a message in the room, optionally with 2 or 3 buttons
- `propose_change`: a "Change to the plan" card. "Do it" saves the decision to the agent's memory and adds a to-do; "Not yet" saves that to memory.
- `add_todo`, `update_todo`, `remember`, `forget`, `add_open_item`, `close_open_item`, `read_room`: the workspace

Every agent runs on the Workers AI model in `CREW_MODEL` (`@cf/moonshotai/kimi-k2.6` today), through the Worker's `AI` binding, so no model API key is needed. Any Workers AI model that takes tools works, and changing the var is the only step. Flue retries a failed run at most 3 times, because every attempt is a paid model run.

### Filing GitHub issues

`worker/crew/github.ts` files issues on `mhsnook/sunlo` (the `GITHUB_REPO` var) as a GitHub App, for Monitor when it starts. No agent has the GitHub tools yet. Without the three secrets below, no agent ever will.

The repository is public, so the tools enforce these limits in code, whatever the prompt says:

- **No personal data.** An issue or comment that contains an email address, a user's id or a username is refused, and the agent is told to rewrite it.
- **No duplicates.** The agent keeps every issue it files in its SQLite. It checks that list first, and it can comment only on its own issues.
- **Rate limits.** At most 2 issues per run and 5 per 24 hours, and 3 comments per run.
- **A label.** Every issue gets the `from-crew` label.

To set it up, once:

1. On GitHub, open **Settings › Developer settings › GitHub Apps › New GitHub App**. Name it, for example, "Sunlo Crew". Turn off **Webhook › Active**. Under **Repository permissions**, set **Issues** to **Read and write**. Leave everything else at No access. Create the app and note its **App ID**.
2. On the app's page, **Generate a private key**. GitHub downloads a `.pem` file in PKCS#1 format, and Workers can only read PKCS#8, so convert it:

   ```bash
   openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in sunlo-crew.pem -out sunlo-crew-pkcs8.pem
   ```

3. **Install App** on your account, with **Only select repositories** set to `mhsnook/sunlo`. The installation id is the number at the end of the page's URL (`github.com/settings/installations/<id>`).
4. In the repository, create the label `from-crew`, so the app does not depend on creating it.
5. Set the secrets from `apps/admin`, then delete both `.pem` files:

   ```bash
   pnpm exec wrangler secret put GITHUB_APP_ID
   pnpm exec wrangler secret put GITHUB_APP_INSTALLATION_ID
   pnpm exec wrangler secret put GITHUB_APP_PRIVATE_KEY < sunlo-crew-pkcs8.pem
   ```

If the key is still in PKCS#1 format, `githubFor()` throws an error that names the fix.

## Commands

Run these from the repo root:

```bash
pnpm admin:dev         # the app and the Worker, one Vite server at http://localhost:5174
pnpm admin:check       # typecheck the app, and the Worker with .flue/
pnpm admin:build       # production build: dist/client (the app) and dist/sunlo_admin (the Worker)
pnpm test:unit         # includes worker/**/*.test.ts
```

`vite dev` runs the Worker in workerd through `@cloudflare/vite-plugin`, so the app, `/api`, the crew room's WebSocket and the agents share one origin, as in production.

There is no deploy command: Cloudflare deploys on a merge to `main`.

## Local development

The Worker reads `apps/admin/.dev.vars`, copied from `.dev.vars.example`. `SUPABASE_URL` and `SUPABASE_ANON_KEY` come from `supabase status`. The database connection is the Hyperdrive binding's `localConnectionString` in `wrangler.jsonc`, which the dev server uses in place of the production Hyperdrive config. It connects to local Supabase as `admin_reader` with the password `admin_reader`, and the migration creates that role with no password, so set one once:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "alter role admin_reader password 'admin_reader'"
```

Roles belong to the Postgres cluster, not the database, so the password survives a `supabase db reset` as long as the local Supabase containers do. If the Worker reports a failed sign-in after a reset, run the command again. Never put the password in a seed file: `[db.seed]` loads every file in `supabase/seeds/` into preview and production databases too.

The `AI` binding always runs remotely, so the dev server needs `wrangler login` (or `CLOUDFLARE_API_TOKEN`), and agent runs and CLEF bill to that account. Without a login, start it with `ADMIN_REMOTE_BINDINGS=false pnpm admin:dev`. The room, the workspaces and the stats work. CLEF leaves every message in the room, and agent runs fail at the model call.

`worker/worker-configuration.d.ts` is generated by `wrangler types` on `pnpm install` and is not committed. Run `pnpm install` again after changing `wrangler.jsonc`. It does not know Flue's `FLUE_*` bindings, which `@flue/vite` adds at build time.

## How it shares code

- `@/…` resolves to the main app's `src/`, so `@/components/ui/button` and `@/lib/supabase-client` are the same files the main app uses.
- `~/…` resolves to `apps/admin/src/`.
- The main app must never import from `apps/admin`.
- `worker/` and `.flue/` are one TypeScript project (`tsconfig.worker.json`), and import nothing from `src/` except, in tests, the Zod schemas.
- `shared/` holds what both sides need: the crew roster and the crew API's Zod schemas.

## Deploying

Workers Builds (Cloudflare's Git integration) builds and deploys the `sunlo-admin` Worker on every push to `main`, and on no other branch. The dashboard settings are in `docs/deployment.md`, under "Cloudflare" › "Setup".

`wrangler.jsonc` serves `dist/client` as static assets with an SPA fallback and runs the Worker for `/api/*`, on the custom domain `admin.sunlo.app`. It has no `main`: `@flue/vite` generates the Worker entry, which serves `.flue/app.ts` and exports the room and agent Durable Objects. `vite build` also writes a redirect that points `wrangler deploy` at the built config, so the deploy command needs no flags. A new agent needs a new migration entry in `wrangler.jsonc`; never edit a deployed one. The custom domain needs the `sunlo.app` zone on the same Cloudflare account.

The Worker reaches the database through [Hyperdrive](https://developers.cloudflare.com/hyperdrive/), bound as `HYPERDRIVE` in `wrangler.jsonc`. The Hyperdrive config holds the production connection string for `admin_reader`, so the Worker has no database secret of its own. Hyperdrive is required, not an optimisation: Supabase signs its database certificates with its own CA, which a Worker's TLS socket cannot verify, and from Cloudflare's network that handshake hangs rather than failing. Hyperdrive makes the TLS connection on the Worker's behalf. If the database stops answering, every `/api` route returns a 500 after 15 seconds instead of hanging, and the Worker logs the reason.

GitHub issue filing needs three optional secrets, set with `wrangler secret put` or in the dashboard: `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID` and `GITHUB_APP_PRIVATE_KEY` ("Filing GitHub issues", above).

The build reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at build time, from the Workers Builds build variables. If either is missing, the build still succeeds but drops the Supabase SDK, and the app cannot sign in. Do not deploy by hand: a local build reads the root `.env`, which points at local Supabase.
