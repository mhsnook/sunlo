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
```

There is no deploy command: Cloudflare deploys on a merge to `main`.

## How it shares code

- `@/…` resolves to the main app's `src/`, so `@/components/ui/button` and `@/lib/supabase-client` are the same files the main app uses.
- `~/…` resolves to `apps/admin/src/`.
- The main app must never import from `apps/admin`.

## Deploying

Workers Builds (Cloudflare's Git integration) builds and deploys the `sunlo-admin` Worker on every push to `main`, and on no other branch. The dashboard settings are in `docs/deployment.md`, under "Cloudflare" › "Setup".

`wrangler.jsonc` serves `dist/` as static assets with an SPA fallback, on the custom domain `admin.sunlo.app`. The custom domain needs the `sunlo.app` zone on the same Cloudflare account.

The build reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at build time, from the Workers Builds build variables. If either is missing, the build still succeeds but drops the Supabase SDK, and the app cannot sign in. Do not deploy by hand: a local build reads the root `.env`, which points at local Supabase.
