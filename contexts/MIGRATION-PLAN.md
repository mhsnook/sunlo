# Vercel → Cloudflare Pages Migration Plan

## Why we're doing this

1. **Cloudflare AI bindings.** Workers AI, Vectorize, and AI Gateway are available as native bindings from Pages Functions — zero-latency inference, no API key management, built-in caching and analytics. For a language-learning app, the relevant capabilities are: multilingual text generation (Llama 3.1/4, Mistral), multilingual embeddings (`bge-m3`, 100+ languages), and speech-to-text (Whisper). These work today from Pages Functions with `env.AI.run()`.

2. **Values alignment.** Cloudflare has been a consistent advocate for the free, open, and secure internet. We don't want to fund Vercel's vendor-lock-in strategy, and this move should happen before we hit a paid tier — not after.

3. **Future platform capabilities.** Beyond AI, Cloudflare Pages Functions give us native bindings to Hyperdrive (connection pooling for Supabase Postgres), Vectorize (semantic search over phrases), KV (edge caching), and R2 (audio/media storage). None of these require a hosting migration to use, but bindings make them simpler and faster.

## Current state

| Aspect | Current (Vercel) |
|---|---|
| **App type** | Pure SPA (Vite + React 19, TanStack Router) |
| **Routing** | SPA catch-all via `vercel.json`: `/(.*) → /index.html` |
| **Edge logic** | Vercel Edge Middleware (`middleware.ts`) — OG meta tags for social crawlers |
| **Env vars** | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (build-time) |
| **Build** | `pnpm build` → `dist/` |
| **Preview deploys** | Vercel automatic per-branch |
| **Supabase plan** | Pro (branching available) |
| **Vercel SDK usage** | None — no `@vercel/*` packages |

This is a clean migration. The only Vercel-specific code is `vercel.json` (one rewrite) and `middleware.ts` (edge middleware for OG tags).

---

## Phase 1: Cloudflare Pages project setup

### 1a. Create the project

Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.

| Setting | Value |
|---|---|
| Repository | `mhsnook/sunlo` |
| Production branch | `main` (or `next`) |
| Build command | `pnpm build` |
| Build output directory | `dist` |

Cloudflare auto-detects pnpm from the `packageManager` field in `package.json`.

### 1b. Environment variables

**Production Supabase credentials:** Use the [Cloudflare–Supabase integration](https://developers.cloudflare.com/workers/databases/third-party-integrations/supabase/) to auto-inject credentials. In the Pages project Settings → Integrations → click "Add Integration" on the Supabase card → authenticate with your Supabase account → select your org and project. This automatically sets `SUPABASE_URL` and `SUPABASE_KEY` as secrets. (Note: these are runtime secrets for Pages Functions. You still need the `VITE_`-prefixed build-time vars below for the SPA client.)

**Production** (Cloudflare Pages → Settings → Environment variables):

| Variable | Value | Encrypted? |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://<your-project>.supabase.co` | No |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Yes |
| `NODE_VERSION` | `22` | No |

**Preview** (all non-production branches):

| Variable | Value | Encrypted? |
|---|---|---|
| `VITE_SUPABASE_URL` | URL of the persistent `next` Supabase branch (see Phase 4) | No |
| `VITE_SUPABASE_ANON_KEY` | Anon key of the `next` Supabase branch | Yes |
| `NODE_VERSION` | `22` | No |

Cloudflare Pages supports **Production** and **Preview** env var scopes. All preview branches share the same Preview env vars — there is no per-branch filtering in the dashboard. This is fine for our setup because all preview branches will share the same Supabase staging database (see Phase 4).

---

## Phase 2: SPA routing

Cloudflare Pages does not read `vercel.json`. SPA catch-all routing uses a `_redirects` file in the build output.

### 2a. Create `public/_redirects`

```
/* /index.html 200
```

Vite copies `public/` contents to `dist/` at build time. The `200` status code means "rewrite" (serve `index.html` content but keep the URL), not "redirect".

### 2b. Delete `vercel.json`

No longer needed.

---

## Phase 3: Port OG middleware to a Cloudflare Pages Function

The current `middleware.ts` is Vercel Edge Middleware that intercepts social-crawler requests and returns OG meta tags. The Cloudflare equivalent is a **Pages Function**.

### 3a. Create `functions/_middleware.ts`

Cloudflare convention: files in `functions/` at the repo root are deployed as Workers. A `_middleware.ts` file runs on every request (like Vercel's middleware).

```typescript
import { createClient } from '@supabase/supabase-js'

interface Env {
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY: string
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context
  const userAgent = request.headers.get('user-agent')

  if (!isCrawler(userAgent)) {
    return next()
  }

  const url = new URL(request.url)
  const path = url.pathname

  const hasOGRoute = OG_ROUTES.some(r => r.pattern.test(path))
  if (!hasOGRoute) {
    return next()
  }

  const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
  const ogData = await fetchOGData(path, supabase)

  if (!ogData) {
    return next()
  }

  const baseUrl = `${url.protocol}//${url.host}`
  const html = generateOGHtml(ogData, baseUrl)

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}

// Move all helpers from current middleware.ts into this file:
// LANGUAGES, CRAWLER_PATTERNS, OG_ROUTES, isCrawler(),
// getLanguageName(), escapeHtml(), generateOGHtml(), fetchOGData()
```

**Key differences from the Vercel version:**
- Env vars via `context.env` (not `process.env`)
- `next()` to pass through (not returning `undefined`)
- Route matching inside the function (Vercel used `export const config.matcher`)
- Supabase JS client works unchanged — it uses `fetch` internally, which Cloudflare Workers support

### 3b. Delete root `middleware.ts`

The Vercel middleware file is replaced by the Pages Function.

### 3c. Create `wrangler.toml`

```toml
name = "sunlo"
compatibility_date = "2025-04-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "dist"

[ai]
binding = "AI"
```

This enables:
- `npx wrangler pages dev dist` for local testing of the Pages Function
- The AI binding (available in Pages Functions as `context.env.AI`)
- Node.js compatibility for packages that need it

---

## Phase 4: Staging database via Supabase branching

### The problem

Vercel's Supabase integration automatically syncs preview-branch database credentials into preview deployments. Cloudflare has no equivalent integration. We need an alternative that keeps production data isolated from preview/feature branch testing.

### The approach: persistent `next` branch

Since we're already on Supabase Pro, we can use Supabase Branching to create a **persistent preview branch** named `next` that mirrors the `next` Git branch. All Cloudflare preview deployments share this single staging database.

| Environment | Supabase target | Cloudflare scope |
|---|---|---|
| Production (`main`) | Production project | Production env vars |
| All preview branches | Persistent `next` Supabase branch | Preview env vars |
| Local dev | Local Supabase (`supabase start`) | `.env` file |

### 4a. Enable Supabase Branching

1. Supabase Dashboard → your project → Settings → Branching → Enable
2. Connect the GitHub repository if not already connected
3. The `next` branch in Git will get a corresponding Supabase preview branch with its own Postgres, Auth, and Storage

### 4b. Create the persistent `next` branch

Supabase's GitHub integration creates preview branches for PRs by default. For a persistent branch tied to the `next` Git branch:

1. Push a commit (or open and close a PR) targeting `next` to trigger branch creation
2. Note the preview branch's **database URL** and **anon key** from the Supabase dashboard (Branching → select the `next` branch)
3. Enter these as the **Preview** environment variables in Cloudflare Pages (Phase 1b)

### 4c. Migration flow

| Event | What happens |
|---|---|
| Dev writes migration locally | Tests against local Supabase (`supabase db reset`) |
| PR opened | CF preview deploys against the `next` staging database |
| PR merged to `next` | Supabase auto-applies new migrations to the `next` branch |
| `next` merged to `main` | Supabase applies migrations to production; CF production redeploys |

Migrations are synced automatically by Supabase's GitHub integration — no custom GitHub Actions needed for this.

### 4d. Resetting the staging database

Over time, test data accumulates. Reset options:

- **Manual:** Supabase Dashboard → Branching → delete and recreate the `next` branch (re-runs all migrations + seeds)
- **Scripted:** GitHub Action triggered manually or on schedule that calls the Supabase Management API to reset the branch
- **After release:** Add a step to your release process that resets the `next` branch after merging to `main`

After a reset, update the Preview env vars in Cloudflare if the branch URL or anon key changes (they may stay the same on recreate — check Supabase's behavior).

### 4e. Limitations and fallback

**Known unknowns:** Supabase Branching is designed for ephemeral per-PR branches. Using it for a persistent staging branch may have rough edges — auto-teardown timers, stale credentials, or migration conflicts. If this doesn't work well in practice, the fallback is straightforward:

**Fallback: second Supabase project.** Create a `sunlo-staging` project (can be free tier). Manage migrations manually with a GitHub Action that runs `supabase db push --linked` when `next` is updated. This is more work but fully predictable.

---

## Phase 5: Update Supabase auth redirect URLs

### 5a. Update `supabase/config.toml`

Replace the Vercel preview URL patterns:

```toml
# Before
additional_redirect_urls = [
  "https://sunlo-tanstack-*-michaelsnook.vercel.app/*",
  "https://sunlo-tanstack-*-michaelsnooks-projects.vercel.app/*",
  "https://www.sunlo.app/*",
  "http://localhost:5173/*",
  "https://www.sunlo.app/getting-started",
  "http://localhost:5173/getting-started"
]

# After
additional_redirect_urls = [
  "https://*.sunlo.pages.dev/*",
  "https://www.sunlo.app/*",
  "https://www.sunlo.app/getting-started",
  "http://localhost:5173/*",
  "http://localhost:5173/getting-started"
]
```

(Replace `sunlo` with your actual Cloudflare Pages project name if different.)

### 5b. Update Supabase Dashboard (production)

In Supabase Dashboard → Authentication → URL Configuration:
1. Add `https://*.sunlo.pages.dev/*`
2. Keep `https://www.sunlo.app/*`
3. Remove the Vercel patterns after cutover is verified

**During the transition period, keep both Vercel and Cloudflare patterns so neither deployment breaks auth.**

---

## Phase 6: Custom domain

1. Cloudflare Pages → Custom domains → Add `sunlo.app`
2. If DNS is already on Cloudflare, it auto-configures
3. If DNS is elsewhere, add CNAME: `@ → <project>.pages.dev`
4. SSL is automatic

---

## Phase 7: Cloudflare platform capabilities (post-migration)

These are not required for the migration itself, but become available once we're on Cloudflare Pages. The AI binding is configured in Phase 3c.

### 7a. Workers AI — translation and generation

Available immediately via the `AI` binding in any Pages Function:

```typescript
// functions/api/translate.ts
export const onRequestPost: PagesFunction<{ AI: Ai }> = async (context) => {
  const { prompt, targetLang } = await context.request.json()
  const result = await context.env.AI.run(
    '@cf/meta/llama-3.1-8b-instruct-fast',
    { messages: [{ role: 'user', content: `Translate "${prompt}" to ${targetLang}` }] }
  )
  return Response.json(result)
}
```

**Pricing:** $0.011 per 1,000 Neurons. Free tier: 10,000 Neurons/day. Workers Paid plan ($5/mo) required to exceed the free tier.

**Relevant models:**
- Text generation: Llama 3.1 8B, Llama 4 Scout 17B, Mistral Small 3.1 24B
- Multilingual embeddings: `@cf/baai/bge-m3` (100+ languages)
- Speech-to-text: Whisper large v3 turbo

### 7b. AI Gateway — caching and analytics

AI Gateway sits in front of Workers AI calls (or external providers like OpenAI/Anthropic) and provides:
- **Response caching** — repeated identical prompts return cached results (up to 90% latency reduction for common translations)
- **Analytics** — request volume, latency, token usage, cost
- **Rate limiting** — per-user or global
- **Retries and fallback** — automatic retry with fallback to alternative models

The gateway itself is free. Enable it by passing a gateway ID:

```typescript
const result = await context.env.AI.run(
  '@cf/meta/llama-3.1-8b-instruct-fast',
  { messages },
  { gateway: { id: 'sunlo-ai-gateway' } }
)
```

### 7c. Vectorize — semantic phrase search

A vector database for storing embeddings alongside phrase data. Enables "find similar phrases" and semantic search across the phrase library:

1. Create an index: `npx wrangler vectorize create sunlo-phrases --dimensions=1024 --metric=cosine`
2. Generate embeddings with `@cf/baai/bge-m3` (multilingual, 1024 dimensions)
3. Query from a Pages Function via the `VECTORIZE` binding

### 7d. Hyperdrive — Supabase connection pooling

Cloudflare's connection pooler for external Postgres databases. Sits between your Pages Functions and Supabase, reducing connection overhead and query latency:

- Create: `npx wrangler hyperdrive create sunlo-db --connection-string="postgres://..."`
- Use from a Pages Function via the `HYPERDRIVE` binding
- Particularly valuable if you add server-side data fetching (e.g., for the OG middleware, or future API routes)

### 7e. R2 — media storage

Object storage for audio files (pronunciation recordings), images, and other media. Can complement or replace Supabase Storage if needed. Pricing is generous: 10GB free, no egress fees.

---

## Phase 8: Cleanup and testing

### Files to create

| File | Purpose |
|---|---|
| `public/_redirects` | SPA catch-all routing |
| `functions/_middleware.ts` | OG tags for social crawlers (ported from `middleware.ts`) |
| `wrangler.toml` | Pages config, AI binding, local dev |

### Files to delete

| File | Reason |
|---|---|
| `vercel.json` | Vercel-specific routing |
| `middleware.ts` | Replaced by `functions/_middleware.ts` |

### Files to modify

| File | Change |
|---|---|
| `.gitignore` | Add `.wrangler/` |
| `supabase/config.toml` | Replace Vercel redirect URLs with Cloudflare URLs |

### Testing checklist

- [ ] `pnpm build` succeeds
- [ ] SPA routing works — direct navigation to `/learn/hin/feed` loads the app
- [ ] OG tags work — `curl -A "Twitterbot" https://<project>.pages.dev/learn/hin`
- [ ] Auth flow works — sign in, magic link redirect lands correctly
- [ ] Preview deploys work — push a branch, verify preview URL and staging database
- [ ] Production and preview use different Supabase instances
- [ ] Custom domain resolves with SSL

### Cutover steps

1. Deploy to Cloudflare Pages and verify at `<project>.pages.dev`
2. Add both Vercel and Cloudflare redirect URLs to Supabase auth config
3. Switch DNS to Cloudflare Pages
4. Verify custom domain, auth, and OG tags on the production URL
5. Remove Vercel redirect URLs from Supabase
6. Disconnect Vercel Git integration / delete Vercel project

---

## Summary

**Migration scope:** ~3 files created, ~2 files deleted, ~2 files modified. No changes to the SPA build, no new dependencies for the core app.

**Risk:** Low. The app is a pure SPA with no Vercel SDK dependencies. The OG middleware port is straightforward. The staging database setup via Supabase Branching is the only piece with uncertainty — if it doesn't behave well as a persistent branch, the fallback (second Supabase project) is simple.

**What we gain:**
- Native AI bindings (Workers AI, AI Gateway, Vectorize) for future language-learning features
- Hyperdrive connection pooling for Supabase
- Alignment with a company investing in the open web
- Automatic preview deploys with staging database isolation
- No vendor lock-in to Next.js or Vercel's ecosystem
