# Vercel → Cloudflare Pages Migration Plan

## Current State Summary

| Aspect | Current (Vercel) |
|---|---|
| **App type** | Pure SPA (Vite + React, no SSR) |
| **Routing** | SPA catch-all via `vercel.json` rewrite: `/(.*) → /index.html` |
| **Edge logic** | Vercel Edge Middleware (`middleware.ts`) — serves OG meta tags to social crawlers |
| **Env vars** | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (build-time), `SUPABASE_SERVICE_ROLE_KEY` (test-only) |
| **Build** | `pnpm build` → `dist/` |
| **Preview deploys** | Vercel automatic per-branch previews |
| **CI** | GitHub Actions for tests (not for deploy) |
| **Vercel SDK usage** | None — no `@vercel/*` packages, no analytics, no serverless functions |

This is a **clean migration** — the only Vercel-specific pieces are `vercel.json` (one rewrite rule) and `middleware.ts` (edge middleware for OG tags).

---

## Phase 1: Cloudflare Pages project setup

### 1a. Create the Cloudflare Pages project

- Go to Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git
- Select the `mhsnook/sunlo` repository
- Configure build settings:
  - **Build command:** `pnpm build`
  - **Build output directory:** `dist`
  - **Root directory:** `/` (repo root)
  - **Node.js version:** Set `NODE_VERSION=22` environment variable
  - **Package manager:** Cloudflare auto-detects pnpm from `packageManager` field

### 1b. Set environment variables in Cloudflare

In Cloudflare Pages → Settings → Environment variables, set for **Production**:

| Variable | Value | Encrypted? |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://<your-project>.supabase.co` | No |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Yes |
| `NODE_VERSION` | `22` | No |

For **Preview** environment (used by all non-production branches):

| Variable | Value | Encrypted? |
|---|---|---|
| `VITE_SUPABASE_URL` | Same as production, OR a staging Supabase URL if you have one | No |
| `VITE_SUPABASE_ANON_KEY` | Matching anon key | Yes |
| `NODE_VERSION` | `22` | No |

> **Preview branch keys:** Cloudflare Pages lets you set separate env vars for Production vs Preview. If you want *per-branch* environment overrides (e.g. a `staging` branch with its own Supabase project), you can use branch-specific environment variables in the Cloudflare dashboard under Settings → Environment variables → Preview → Add variable → specify "Branch" filter.

### 1c. Configure production branch

- Set `main` (or `next`, whichever is your production branch) as the production branch in Cloudflare Pages settings
- All other branches automatically get preview deployments at `<branch>.<project>.pages.dev`

---

## Phase 2: SPA routing on Cloudflare Pages

Cloudflare Pages does **not** read `vercel.json`. SPA catch-all routing is handled by placing a `_redirects` or `_routes.json` file in the build output.

### 2a. Create `public/_redirects`

Create `public/_redirects` (Vite copies `public/` contents to `dist/` at build time):

```
/* /index.html 200
```

This is the Cloudflare Pages equivalent of the current `vercel.json` rewrite. The `200` status code means "serve `/index.html` content but keep the URL" (a rewrite, not a redirect).

### 2b. Remove `vercel.json`

Delete `vercel.json` — it is no longer needed.

---

## Phase 3: Migrate the OG middleware to a Cloudflare Pages Function

The current `middleware.ts` is Vercel Edge Middleware that intercepts social-crawler requests and returns OG meta tags. Cloudflare Pages has an equivalent: **Pages Functions**.

### 3a. Create the Cloudflare Pages Function

Create `functions/_middleware.ts` (Cloudflare's convention — functions in a `functions/` directory at the repo root):

```typescript
// functions/_middleware.ts
import { createClient } from '@supabase/supabase-js'

interface Env {
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY: string
}

// The same crawler detection, OG data fetching, and HTML generation
// logic from the current middleware.ts, adapted to use
// Cloudflare Pages Function signature:

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context
  const userAgent = request.headers.get('user-agent')

  if (!isCrawler(userAgent)) {
    return next()  // Pass through to static assets
  }

  const url = new URL(request.url)
  const path = url.pathname

  // Only handle routes that need OG tags
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
```

**Key differences from the Vercel version:**
- Env vars accessed via `context.env` (not `process.env`)
- Uses `next()` to pass through (instead of returning `undefined`)
- Route matching is done in the function itself (Vercel had `export const config.matcher`)
- The `functions/` directory is automatically deployed as Cloudflare Workers
- The function file itself will include all the helper functions (LANGUAGES, CRAWLER_PATTERNS, generateOGHtml, fetchOGData) — just move them into the same file

### 3b. Add `@supabase/supabase-js` compatibility

Cloudflare Workers use the V8 runtime, not Node.js. Supabase JS client works fine on Cloudflare Workers as it uses `fetch` internally. No changes needed.

### 3c. Remove the old Vercel middleware

Delete the root `middleware.ts` file.

### 3d. Configure `wrangler.toml` (optional)

For local development of the Pages Function, optionally create `wrangler.toml`:

```toml
name = "sunlo"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "dist"
```

This is optional — Cloudflare Pages works without it. But it enables `npx wrangler pages dev dist` for local testing of the middleware.

---

## Phase 4: Preview deployments and branch-specific configuration

### 4a. Automatic preview deploys

Cloudflare Pages automatically creates preview deployments for every push to non-production branches. Each gets a URL:
- `https://<commit-hash>.<project>.pages.dev`
- `https://<branch>.<project>.pages.dev`

### 4b. Branch-specific environment variables

For branch-specific Supabase keys (e.g., staging vs production):

1. Go to Cloudflare Pages → Settings → Environment variables
2. Under **Preview**, add variables with **branch filters**
3. Example: set `VITE_SUPABASE_URL` for the `staging` branch to point to a staging Supabase project

### 4c. Preview deploy access control (optional)

If you want to restrict preview deploys:
- Cloudflare Pages supports **Access policies** via Cloudflare Access
- Go to Pages → Settings → Access Policy to require auth for preview URLs

### 4d. GitHub integration

Cloudflare Pages automatically:
- Posts deployment status to GitHub PRs as commit checks
- Adds a comment with the preview URL on each PR
- Shows build status in the GitHub checks UI

---

## Phase 5: Update Supabase auth redirect URLs

The current `supabase/config.toml` has Vercel-specific wildcard redirect URLs for auth:

```
additional_redirect_urls = [
  "https://sunlo-tanstack-*-michaelsnook.vercel.app/*",
  "https://sunlo-tanstack-*-michaelsnooks-projects.vercel.app/*",
  ...
]
```

### 5a. Update `supabase/config.toml` (local dev)

Replace the Vercel preview URL patterns with Cloudflare Pages preview patterns:

```toml
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

In the Supabase Dashboard → Authentication → URL Configuration:
1. Add the new Cloudflare Pages wildcard: `https://*.sunlo.pages.dev/*`
2. Keep the production domain `https://www.sunlo.app/*`
3. Remove the old Vercel patterns after the cutover is complete

**Important:** During the transition period, keep both Vercel and Cloudflare patterns active so neither deployment breaks auth.

---

## Phase 6: Custom domain setup

### 6a. Add custom domain

1. Cloudflare Pages → Custom domains → Add
2. Add `sunlo.app` (or your production domain)
3. If your DNS is already on Cloudflare, it auto-configures
4. If DNS is elsewhere, add the CNAME record: `@ CNAME <project>.pages.dev`

### 6b. SSL/TLS

Cloudflare provides automatic SSL. No configuration needed.

---

## Phase 7: Cleanup and testing

### 7a. Files to create

| File | Purpose |
|---|---|
| `public/_redirects` | SPA catch-all routing |
| `functions/_middleware.ts` | OG tags for social crawlers |
| `wrangler.toml` (optional) | Local Pages Function dev |

### 7b. Files to delete

| File | Reason |
|---|---|
| `vercel.json` | Vercel-specific routing config |
| `middleware.ts` | Vercel Edge Middleware (replaced by `functions/_middleware.ts`) |

### 7c. Files to modify

| File | Change |
|---|---|
| `.gitignore` | Add `.wrangler/` directory |
| `supabase/config.toml` | Replace Vercel redirect URLs with Cloudflare Pages URLs |

### 7d. Testing checklist

- [ ] `pnpm build` succeeds (no changes to the build itself)
- [ ] SPA routing works — navigating to `/learn/hin/feed` directly loads the app
- [ ] OG tags work — test with `curl -A "Twitterbot" https://your-site.pages.dev/learn/hin`
- [ ] Preview deploys work — push a branch and verify the preview URL
- [ ] Environment variables are correct in both production and preview
- [ ] Custom domain resolves and has SSL

### 7e. Cutover steps

1. Deploy to Cloudflare Pages and verify everything works at `<project>.pages.dev`
2. Switch DNS to point to Cloudflare Pages (if not already on Cloudflare)
3. Verify custom domain works
4. Remove the Vercel project (or disconnect the Git integration first)
5. Remove any Vercel-specific GitHub App integration

---

## Summary of effort

This is a **low-risk migration** because:
- The app is a pure SPA with no Vercel-specific dependencies
- The only server-side logic (OG middleware) is a straightforward port to Cloudflare Pages Functions
- Build command (`pnpm build`) and output (`dist/`) are unchanged
- Environment variables are the same (just configured in a different dashboard)
- GitHub Actions CI is unaffected (it doesn't deploy, just tests)

Estimated scope: ~3 files changed, ~1 file created, ~2 files deleted.
