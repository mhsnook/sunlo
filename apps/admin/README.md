# Sunlo Admin

The team dashboard at `admin.sunlo.app`. It is a separate Vite app that shares the main app's Supabase project, types and UI components, and deploys on its own to Cloudflare.

## Sign-in

Admins sign in with their normal Sunlo email and password. The admin app keeps its own session, because the browser stores a Supabase session per origin, so signing in on `sunlo.app` does not sign you in here.

Any Sunlo account can sign in, but only accounts listed in `public.admin_user` see the dashboard. The stats RPCs check `is_admin()` themselves, so the UI check is a convenience, not the security boundary. To add an admin:

```sql
insert into public.admin_user (uid) values ('<the user uuid>');
```

## Commands

Run these from the repo root:

```bash
pnpm admin:dev      # http://localhost:5174, reads the root .env
pnpm admin:check    # typecheck
pnpm admin:build    # production build into apps/admin/dist
pnpm admin:deploy   # build, then wrangler deploy to Cloudflare
```

## How it shares code

- `@/…` resolves to the main app's `src/`, so `@/components/ui/button` and `@/lib/supabase-client` are the same files the main app uses.
- `~/…` resolves to `apps/admin/src/`.
- The main app must never import from `apps/admin`.

## Deploying

`wrangler.jsonc` serves `dist/` as static assets with an SPA fallback, on the custom domain `admin.sunlo.app`. The custom domain needs the `sunlo.app` zone on the same Cloudflare account. Remove the `routes` entry to deploy to a `*.workers.dev` URL instead.

The build reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at build time. If you build in Cloudflare's CI, set both as build variables there. If either is missing, the build still succeeds but drops the Supabase SDK, and the app cannot sign in. Check with `grep -l GoTrueClient dist/assets/*.js`.
