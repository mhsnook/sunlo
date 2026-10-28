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

The dashboard opens on the **Common Room**: a group chat between you and AI agents named for their jobs. Each agent posts when it runs, and @mentions the others. The whole crew reads it, so it is the all-hands overview.

**Common Knowledge**, a panel in the Common Room, holds the few things every agent should always know about you, such as your name and how to refer to you. You write it; every agent reads it at the top of every run, and is told never to save memories of its own about how to address you.

**The Situation Report**, beside the Common Room on a wide screen, is the Command room's document on where Sunlo and each room stand now. Riker keeps it, and you edit it in the panel; every agent reads all of it after Common Knowledge, and an officer whose subject it describes wrong tells Riker. It holds at most 4,000 characters, since every run reads all of it.

**Voice.** Every compose bar has a mic: press it, talk, and press it again, and what you said lands in the draft for you to read before sending. The speaker button beside it turns on voice replies, which reads each new reply aloud in the agent's own voice as it arrives. Any agent message also has its own read-aloud button. The Worker does both with Workers AI: Deepgram Nova 3 for speech to text and Aura 2 for text to speech (`worker/voice.ts`).

### Rooms

Each **room** is a subject, at `/room/<room>`, where you talk with the officers who work on it and anything that needs you arrives as a card. Its **principal** runs it and answers it first. A room can also have an **associate**, a second, more thorough voice that the principal can always call on: Data works with Riker in the Command room. The sidebar lists the Common Room, then the four rooms, each with a count of unread messages and a count of the cards that wait on you.

| Room             | Principal                | Associate          | Job                  | Status                                                 |
| ---------------- | ------------------------ | ------------------ | -------------------- | ------------------------------------------------------ |
| Command room     | Cmdr Riker (`command-1`) | Data (`command-2`) | First officer        | Runs: weekly brief on Sunday at 04:00, and when called |
| Product room     | Geordi (`product-1`)     |                    | Product manager      | Runs: daily at 07:00 UTC, and when called              |
| Library room     | Hoshi (`library-1`)      |                    | Learning content     | Planned                                                |
| Learnership room | Guinan (`learnership-1`) |                    | Growth and retention | Planned                                                |

The roster lives in `shared/crew.ts`: each room's key, and each officer's key, name, rank, room and role (`principal` or `associate`). An officer's key is its seat: the room, then 1 for the principal and 2 for an associate. The code names agents only by key; the names are display text for the app and the prompts, so a name can change without a migration. An officer answers to its name as a handle (@data) and to its key (@command-2). A room's key is a handle too: @product reaches whoever runs the Product room. A planned officer has a place in its room, and what you write there waits until it starts.

In a room, what you write goes to the principal unless you @mention the associate. A crew member from another room is not woken there: the principal takes the request to the Common Room, where everyone can see it. When the principal and the associate talk a question through, you can watch and interject; they take at most 8 turns in a row before you speak.

The **room log** beside the thread holds each member's profile card, to-dos, what is open with you, and memory, and you can edit or prune the memory there. The Command room's log also holds the charter, the weekly settings and Data's playbook.

Every agent keeps one Flue conversation, `memory` (`CONVERSATION` in `worker/crew/room.ts`), which covers the Common Room and its own room. A message reaches it the same way from either place, so it never runs twice at once and keeps one memory of the day. No agent reads another subject's room.

What needs you arrives in the room as a card:

- **Decide**: your call, and the matter is on hold until you answer.
- **Confirm**: the agent acted in your stead, on a reversible matter that a kept charter entry or an earlier answer of yours covers, and asks whether that was right.
- **Escalate**: it needs more than the crew has, with a brief you could hand to a Claude Code session.
- **Worth knowing**: nothing to answer.
- **Change to the plan**: a change an officer proposes. "Do it" saves the decision to its memory and adds a to-do; "Not yet" saves that to memory.

Every card can also be dismissed, with or without a line of feedback. The agent hears why, and feedback becomes one of its memories, so it learns what you do not want.

### The Command room: Riker and Data

Riker is your proxy. He knows three things well: the **charter** (your principles and lessons, which you curate together), where the agents overlap or disagree, and the directives he has given the other rooms. Everything else he asks the expert for. Data argues from the evidence: he runs the database queries and takes more steps on a bigger model (`MODEL_COMMAND_2`). He also keeps a **playbook**: the metrics you like in each domain and how you like charts drawn, which he learns from your reactions.

The Command room has three more kinds of card:

- **For the charter**: a principle or lesson Riker or Data proposes. It counts only once you keep it.
- **Weekly brief**: the week, folded until you open it.
- **Pre-meeting report**: Data's numbers for the brief's agenda, folded the same way. Data files one whenever a meeting starts without one; if you ask him for a pre-meeting briefing first, that is the report.

Anything you want to add to an answer, write in the room: your answers, and the times you overrule Riker, are how the Command room learns you.

**The weekly cycle.** An hourly cron finds Sunday 04:00 in your time zone (set in the room log; Cloudflare crons are UTC only) and has Riker post the week's brief in the Command room. From then on, a banner on every other page invites you to the weekly meeting until it happens, and "Start the weekly meeting" in the Command room begins it. Every meeting starts from Data's pre-meeting report; when Data files it, Riker reads it and comments in the room. Riker keeps a ledger of directives for the other rooms until you say the meeting is done; his prompt asks for this, and nothing in the code enforces it. Then he closes the meeting with minutes in the Common Room, followed by one directive to each room's principal, with priorities and suggested edits, each marked as a command or a suggestion. The officer applies what it accepts, and the room posts a receipt of the edits it actually made ("👍 3 edits: …"), built from its workspace changes rather than from its own account.

### Components in messages

Any agent can put components in its markdown as a fenced block whose language names the component and whose body is JSON: `chart` (line, bar or area), `stats` (a row of headline numbers) and `table` (sortable, optionally filterable). The catalog and its schemas are in `shared/blocks.ts`, and `src/components/crew/blocks.tsx` draws them with the app's own components, in the Common Room and in every subject's room. It is the generative-UI pattern without MDX: an agent describes a component and the app decides how it looks, and no agent-written markup or code ever runs. Every tool that posts text refuses a block that does not parse and tells the agent what to fix, so a broken block never reaches you.

### Where things live

- **The agents** are [Flue](https://flueframework.com) agents in `.flue/agents/`. Each agent's Flue identity is its key, set with its `agentName` static, and `@flue/vite` builds each one into a Durable Object in this Worker named after it (`FlueProduct1Agent`, bound as `FLUE_PRODUCT_1_AGENT`). Changing an identity is a `renamed_classes` migration in `wrangler.jsonc`, and it starts the agent's Flue conversation afresh, because Flue keys a conversation by the identity; memory and everything else in `CrewRoom` stays. `.flue/agents/use-crew-member.ts` holds what every agent shares: the model, the tools, and the context each run starts with.
- **The room** is the `CrewRoom` Durable Object (`worker/crew/room.ts`), one instance named `crew` (`ROOM`). The production room holds real data, so a schema change is an in-place migration in its constructor that is safe to run twice, never a new instance name. It is an [Agents SDK](https://developers.cloudflare.com/agents/) `Agent` with no model. Its SQLite holds the Common Room and every subject's room, each agent's to-dos, memory and open items, the charter, and CLEF's decision log. It is not in Postgres, so no migration touches it. The app connects to it with `useAgent` at `/api/crew/live`, which reconnects on its own. The room's synced state holds each agent's status, the weekly cycle and each room's count of open cards, and its socket messages announce new messages and workspace changes. A WebSocket cannot carry headers, so the app sends the Supabase token as `?token=`, and `worker/api.ts` accepts a query token on that route only.
- **The routes** are in `.flue/app.ts`, which adds `/api/crew/*` to the admin API from `worker/api.ts`. `.flue/cloudflare.ts` exports the room and runs the hourly cron: `product-1`'s daily run at 07:00 UTC, and `command-1`'s brief.

### How a message reaches an agent

CLEF decides where each Common Room message goes when you send it:

1. A message that ends in "..." **stacks**: it wakes nobody, and it rides along with your next message that does.
2. An @mention of a started agent **sends** the message to that agent.
3. Otherwise a small Workers AI model (`CLEF_MODEL`) chooses between **sending** it to one agent and **leaving it in the room**. When more than one agent could answer, or CLEF cannot tell who, it sends the message to Riker, who passes it on. Agents read the room at their next run either way.

While you type, the chip above the compose bar shows the first two rules as they apply, and otherwise says CLEF decides when you send. The model runs only on send. Click the chip to pick a place yourself before you send. After you send, the note under your message opens the same menu: correct it there, and any agent the message should have woken wakes now.

The room logs every decision in `clef_decision`: what CLEF suggested, what the message did, your correction if you made one, and, for each agent the message woke, whether its run posted anything ("posted") or nothing ("silent"). The rows where you picked a place or corrected CLEF are its labels, and CLEF reads the latest 20 the next time it decides.

A message that wakes an agent becomes a signal in its `memory` conversation: a `<common-room-message>` from the Common Room, or a `<room-message>` from its own room, and the agent answers where it was asked. CLEF decides for the Common Room only; in a subject's room, the principal answers unless you name the associate.

### Room documents

Each room keeps named Markdown documents, which its officers and you write: the Command room keeps the Situation Report and the Business plan and status, and the Product room keeps the Roadmap. They can hold checklists, tables, the crew's chart, stats and table blocks, and Mermaid diagrams such as gantt charts. The app draws Mermaid itself, and shows a diagram that does not draw as its source.

The room log lists a room's documents. Open one to read it, edit it, or look through its revisions and restore an older one; a restore saves the old text as a new revision. Every save names the revision it started from, and the room refuses a save from anything but the current revision, so nobody overwrites a change they have not seen. An agent's briefing lists its room's documents with their revisions but not their text; it reads one with `read_document` when it needs it. The revision rules live in `worker/crew/documents.ts`, and the tables (`document`, `document_revision`) in `worker/crew/room.ts`.

### What an agent can do

Every run starts with a briefing that `worker/crew/briefing.ts` writes: the time, Common Knowledge, the Situation Report, the list of the room's documents, the cards in the agent's room, its workspace, and what is new in the Common Room and in its room since its last run. The Command room's members also get the charter and the weekly cycle. The tools:

- `activity_between`: signups, reviews and each reviewer, new decks, and library and chat counts for a window
- `run_sql`: one SELECT, run as `admin_reader` with an 8-second timeout and at most 200 rows
- `post_to_common_room`: a message in the Common Room, optionally with 2 or 3 buttons
- `post_to_room`: a message in the agent's own room
- `bring_to_admin`: a card in the agent's own room
- `propose_change`: a "Change to the plan" card in the agent's own room
- `read_document`: any room's document, with its revision
- `write_document`: a new revision of one of the agent's own room's documents, or a new document, from the revision it read
- `add_todo`, `update_todo`, `remember`, `forget`, `add_open_item`, `close_open_item`, `read_room`: the workspace
- Riker and Data also have `propose_charter`. Riker has `write_brief`, `start_meeting` (for a meeting the admin asks for outside the Command room) and `close_meeting`, and Data has `note_playbook` and `file_report`.

Every agent runs on the Workers AI model in `CREW_MODEL` (`@cf/moonshotai/kimi-k2.6` today) unless its seat has a setting of its own: `MODEL_COMMAND_2` and `MODEL_PRODUCT_1` (`@cf/moonshotai/kimi-k2.7-code`). They run through the Worker's `AI` binding, so no model API key is needed. Any Workers AI model that takes tools works, and changing the var is the only step. Flue retries a failed run at most 3 times, because every attempt is a paid model run.

### GitHub: milestones and epics

The Roadmap, a Product room document, is the plan. GitHub (`mhsnook/sunlo`, the `GITHUB_REPO` var) holds the part of it that is ready to build, as milestones and epics, and `product-1` keeps them current. An epic is an ordinary issue labelled `epic`, with a checklist of PR-sized steps, inside a milestone; Claude Code sessions take their work from it. The Roadmap links to GitHub by convention, such as `- [ ] Onboarding (#812)`, and no code parses it.

- **Anything new is a card first.** `draft_issue`, `draft_milestone` and `draft_comment` put a draft on a card in the agent's room. You can edit the draft on the card, then "File it", and the Worker publishes exactly what the card holds (`POST /api/crew/messages/:id/file`). The agent hears back with the number, and with both versions when you edited it; it keeps what it learns as writing-style memories (`note_writing_style`), shown in the room log as "How you like issues written".
- **After that, the agent edits directly.** `edit_issue` and `edit_milestone` change any issue or milestone: an epic's body and checklist, titles, labels, milestones, due dates and state. Each change appears in the run's receipt, built from what the tool did.
- **Reading:** `read_issue`, `list_milestones`, `list_epics` and `github_changes_since`. `command-1` has these read tools only (`githubAccess` in `shared/crew.ts`).
- **What stays in code** (`worker/crew/github.ts`, `.flue/tools/github.ts`): every write, at the tap for a card and in the tool for an edit, is refused if it contains an email address, a user's id or a username, because the repository is public. A run may draft at most 5 cards (`DRAFTS_PER_RUN`) and make at most 20 edits (`EDITS_PER_RUN`). Every filed issue gets the `from-crew` label.
- Before its first edit, `product-1`'s prompt has it propose, as one card, how the existing milestones and epics map onto the Roadmap. It reads what changed on GitHub on its daily run.
- "Copy brief" on a card copies its text, with the link once it is filed, for pasting into a Claude Code session.

Without the three secrets below, no agent has GitHub tools, and each briefing says so.

To set it up, once:

1. On GitHub, open **Settings › Developer settings › GitHub Apps › New GitHub App**. Name it, for example, "Sunlo Crew". Turn off **Webhook › Active**. Under **Repository permissions**, set **Issues** to **Read and write** (it covers labels and milestones) and **Pull requests** to **Read-only**. Leave everything else at No access. Create the app and note its **App ID**.
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

6. Previews do not inherit production secrets. Set the same three in the previews' base configuration, which each new preview copies when it is created (a preview that already exists keeps what it had):

   ```bash
   pnpm exec wrangler preview base-config secret put GITHUB_APP_ID
   pnpm exec wrangler preview base-config secret put GITHUB_APP_INSTALLATION_ID
   pnpm exec wrangler preview base-config secret put GITHUB_APP_PRIVATE_KEY < sunlo-crew-pkcs8.pem
   ```

   A preview files on the same public repository as production.

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

Workers Builds (Cloudflare's Git integration) builds and deploys the `sunlo-admin` Worker on every push to `main`. A push to any other branch builds a [Worker Preview](https://developers.cloudflare.com/workers/previews/) instead, at `<branch>-sunlo-admin.<account subdomain>.workers.dev`, from the `previews` block in `wrangler.jsonc`. A preview has its own crew room and agents, reads the production database through the same read-only Hyperdrive config, signs admins in against production Supabase, and runs no crons. The dashboard settings are in `docs/deployment.md`, under "Cloudflare" › "Setup".

`wrangler.jsonc` serves `dist/client` as static assets with an SPA fallback and runs the Worker for `/api/*`, on the custom domain `admin.sunlo.app`. It has no `main`: `@flue/vite` generates the Worker entry, which serves `.flue/app.ts` and exports the room and agent Durable Objects. `vite build` also writes a redirect that points `wrangler deploy` at the built config, so the deploy command needs no flags. A new agent needs a new migration entry in `wrangler.jsonc`; never edit a deployed one. The `previews` block inherits nothing from the top level, so a new var or binding goes in both places. The custom domain needs the `sunlo.app` zone on the same Cloudflare account.

The Worker reaches the database through [Hyperdrive](https://developers.cloudflare.com/hyperdrive/), bound as `HYPERDRIVE` in `wrangler.jsonc`. The Hyperdrive config holds the production connection string for `admin_reader`, so the Worker has no database secret of its own. Hyperdrive is required, not an optimisation: Supabase signs its database certificates with its own CA, which a Worker's TLS socket cannot verify, and from Cloudflare's network that handshake hangs rather than failing. Hyperdrive makes the TLS connection on the Worker's behalf. If the database stops answering, every `/api` route returns a 500 after 15 seconds instead of hanging, and the Worker logs the reason.

GitHub issue filing needs three optional secrets, set with `wrangler secret put` or in the dashboard: `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID` and `GITHUB_APP_PRIVATE_KEY` ("GitHub: milestones and epics", above).

A pull request that touches only `apps/admin/` (and `scenetest/TEST_IDS.md`) skips the `scenetest`, `bundle-size` and `prod-bundle-scan` jobs in `.github/workflows/test.yaml`, because those test the main app and take about twelve minutes; the `changes` job in that workflow decides, and `pr-checks` and `unit` still run.

On Workers Builds, `vite.config.ts` sets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `wrangler.jsonc`: `vars` on `main`, and `previews.vars` on any other branch. The app and the Worker therefore always point at the same Supabase project, and the dashboard needs no build variables. Do not deploy by hand: a local build reads the root `.env`, which points at local Supabase, and a local build with those two variables missing silently drops the Supabase SDK (`docs/deployment.md`, "Build Environment Footgun").
