# Plan 004: Add a beforeLoad guard to the /admin route tree

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1c4b60ef..HEAD -- src/routes/_user/admin.lazy.tsx src/routes/_user/admin/ src/lib/use-auth.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security (defense-in-depth)

- **Planned at**: commit `1c4b60ef`, 2026-07-08

## Why this matters

Any logged-in user can navigate to `/admin/*` and the admin pages render: the layout has no guard, and downstream components only conditionally hide individual buttons. Actual data mutation is safely blocked by RLS (`is_admin()` in USING/WITH CHECK — verified in `supabase/schemas/base.sql`, e.g. the "Admins can update phrases" policy), so this is **not** a data-integrity hole — but the admin tooling UI, its workflows, and any admin-readable-only queries' empty states are exposed, and a curious user gets a confusing broken-looking page instead of a redirect. The repo already moved in this direction (commit `d45d9ed1 "Remove/disable admin affordance for non-admins (#705)"`); this finishes the job at the route layer.

## Current state

- `src/routes/_user/admin.lazy.tsx` — the entire admin layout, no guard:

  ```tsx
  import { createLazyFileRoute, Outlet } from '@tanstack/react-router'

  export const Route = createLazyFileRoute('/_user/admin')({
  	component: AdminLayout,
  })

  function AdminLayout() {
  	return (
  		<div className="bg-card/50 rounded border p-4 @md:p-6">
  			<Outlet />
  		</div>
  	)
  }
  ```

  There is **no companion `admin.tsx`** — the route exists only as a lazy file, and lazy route files cannot carry `beforeLoad` (TanStack Router: critical route options live in the non-lazy file).

- Auth plumbing (`src/lib/use-auth.ts`): the auth state exposes `userRole` and `isAdmin: boolean` (lines 10-11, 22-23, 31-32). Route context provides `auth` (CLAUDE.md: `const { auth } = Route.useRouteContext()` — `auth.isAuth`, `auth.userRole`).

- Guard exemplar: `src/routes/_user.tsx:40-57` shows the file-route shape (`createFileRoute('/_user')({ loader, component, ... })`) — note its comment says auth is deliberately optional at THAT layout; admin is where it becomes mandatory.

- Child routes under `src/routes/_user/admin/` (e.g. `$lang.tsx`, `$lang.phrases.index.lazy.tsx`, `messages.index.lazy.tsx`) read `isAdmin` for button visibility only — they inherit protection once the parent guards.

## Commands you will need

| Purpose   | Command                                                                                     | Expected on success                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Typecheck | `pnpm check`                                                                                | exit 0 (also regenerates `routeTree.gen.ts` via dev server or vite plugin — run `pnpm dev` briefly if the route tree is stale) |
| Lint      | `pnpm lint`                                                                                 | exit 0                                                                                                                         |
| Scenes    | `pnpm scene scenetest/scenes/admin-messages.spec.md scenetest/scenes/admin-phrases.spec.md` | pass (admin actor flows still work)                                                                                            |

## Scope

**In scope**:

- `src/routes/_user/admin.tsx` (create — non-lazy companion carrying `beforeLoad`)
- `src/routes/_user/admin.lazy.tsx` (unchanged or minor: component stays here)
- One new scene in an existing or new spec file asserting the redirect (e.g. append to `scenetest/scenes/admin-phrases.spec.md`)
- `src/routeTree.gen.ts` (regenerated, do not hand-edit)

**Out of scope** (do NOT touch):

- RLS policies / `supabase/**` — server-side enforcement is already correct.
- The per-component `isAdmin` checks in admin child routes — leave them; they're harmless belt-and-suspenders and some gate row-level affordances on shared components.
- `src/lib/use-auth.ts`.

## Git workflow

- Branch: `advisor/004-admin-route-guard`, based on `main`. No migrations → fast track.
- Single commit, e.g. `Guard /admin routes behind isAdmin at the route layer`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create the non-lazy route file with the guard

Create `src/routes/_user/admin.tsx`:

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/admin')({
	// RLS is the real enforcement layer; this guard is defense-in-depth
	// and UX — non-admins get a redirect instead of an empty admin shell.
	beforeLoad: ({ context: { auth } }) => {
		if (!auth.isAdmin) {
			throw redirect({ to: '/learn' })
		}
	},
})
```

Keep `AdminLayout` and the `component` registration in `admin.lazy.tsx` exactly as they are — TanStack Router merges the lazy and non-lazy definitions for the same route id.

Check how `auth.isAdmin` is populated relative to route lifecycle: if `beforeLoad` can run before the auth state resolves (initial page load directly on an /admin URL), `auth.isAdmin` may be transiently false for a real admin. Look at how `_user.tsx`'s loader awaits auth (`context: { auth }` is provided in `__root.tsx` — read it) — if there is an established "wait for auth" pattern (e.g. `awaiting-auth-loader.tsx` in components), follow it; if none applies to `beforeLoad`, verify by manually loading `/admin` directly as an admin user and confirming no spurious redirect.

**Verify**: `pnpm check` → exit 0 and `src/routeTree.gen.ts` includes the new route file.

### Step 2: Assert the redirect in a scene

Append a scene (to `scenetest/scenes/admin-phrases.spec.md`, or a new `admin-guard.spec.md` registered the same way):

```markdown
# non-admin visiting /admin is redirected to /learn

learner:

- login
- openTo /admin
- see decks-list-grid
```

(Use whatever stable testid the `/learn` page exposes — check `scenetest/TEST_IDS.md`; `decks-list-grid` appears in CLAUDE.md's own example. Also confirm which actor is a non-admin: `learner` — and that the existing admin specs use an admin actor; read `scenetest/scenes/admin-phrases.spec.md`'s actor blocks.)

**Verify**: `pnpm scene scenetest/scenes/admin-phrases.spec.md` (or your new file) → the new scene passes, existing admin scenes still pass (admins not locked out).

## Test plan

- New scene: non-admin `openTo /admin` lands on `/learn` content (above).
- Regression: existing `admin-messages.spec.md` + `admin-phrases.spec.md` pass unchanged (admin actor still gets in).
- Manual: direct URL load of `/admin` as admin (fresh tab, no SPA navigation) does not bounce — this exercises the auth-timing question from Step 1.

## Done criteria

- [ ] `src/routes/_user/admin.tsx` exists with the `beforeLoad` guard
- [ ] `pnpm check` and `pnpm lint` exit 0
- [ ] New redirect scene passes; existing admin scenes pass
- [ ] Direct-load-as-admin manual check done and noted in the report
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `auth.isAdmin` is not available on the router context in `beforeLoad` (check `MyRouterContext` in `__root.tsx`) — the context type may expose only a subset of auth state.
- Admin users get transiently redirected on direct page load and no existing await-auth pattern fixes it cleanly — the fix may need a `pendingComponent`/auth-ready gate that is a design decision, not an improvisation.
- Creating `admin.tsx` alongside `admin.lazy.tsx` produces a route-tree conflict (router plugin version quirk).

## Maintenance notes

- Any future admin child route is automatically covered — nothing to remember per-page.
- Reviewer should scrutinize the auth-timing behavior on hard reload (Step 1's caveat), not the guard logic itself.
- Deliberately deferred: removing now-redundant `isAdmin` conditionals inside admin-only child routes — low value, and some of those components are shared with non-admin surfaces.
