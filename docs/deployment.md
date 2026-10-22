# Deployment Strategy

We use **trunk-based development with a migration gate** — two deployment tracks, not two long-lived branches.

## The two tracks

| Track                                | Trigger                  | Risk profile                       | Ceremony                                      |
| ------------------------------------ | ------------------------ | ---------------------------------- | --------------------------------------------- |
| **Fast track** (UI-only)             | PR merges to `main`      | Low blast radius, reversible       | Deploy at will, drop a one-liner in changelog |
| **Migration track** (schema changes) | PR into `next-<version>` | Expensive to reverse, needs review | Human review gate, batch release notes        |

## The migration branch is named after the version it will ship

The migration-track branch is **named after the version it lands as**, not a bare `next`:

- `next-0.28` → lands the v0.28 version bump + changelog entry.
- `next-0.28.1` → a patch release; include the patch segment in the branch name.

The version comes from the current `package.json` `version` and the latest `CHANGELOG.md` heading — the open migration branch is the **next** of those. Naming the branch this way means the branch, the version bump it carries, and the changelog section it will add all share one identifier, so the deployment log reads cleanly.

**CI matches these by glob.** `.github/workflows/test.yaml` triggers on `next` and `next-*` (push) and `next`, `next-*`, `main` (PR base). The glob is load-bearing: Actions matches branch filters literally, so dropping `next-*` would silently skip _all_ CI on a `next-0.28` branch and on every PR targeting it. If you adopt a name the glob doesn't cover, update the workflow first.

## Decision rule

> **Two questions, in order:**
>
> 1. **Was this branch created from `next-<version>`?**
>    - **Yes** → PR into the open `next-<version>` branch, regardless of what your own changes touch. The base branch already carries unreleased migrations waiting for the next release cut; merging your branch into `main` would smuggle those past the migration-track QA + CI gate.
>    - **No** → continue to question 2.
> 2. **Does this PR touch a migration file?**
>    - **No** → merge to `main`, deploy when ready.
>    - **Yes** → PR into the open `next-<version>` branch, hold for review, merge `next-<version>` → `main` when the batch is ready.

The point of the gate is that **migrations only ever reach `main` through a `next-<version>` → `main` release merge** — never as a side effect of a UI PR whose branch happened to start from `next-<version>`. If you're unsure where your branch started, `git merge-base HEAD origin/next-<version>` vs `git merge-base HEAD origin/main` will tell you.

## Workflow

1. **Feature without migration** → PR → merge to `main` → deploy → one-liner changelog entry (doesn't need to be same day)
2. **Feature with migration** → PR into `next-<version>` → accumulates with other migration PRs → human reviews full picture → merge `next-<version>` into `main` → deploy → write proper release notes
3. **Version bumps** → only when cutting a `next-<version>` → `main` release. Bump `package.json` and add the `v<version>` changelog heading to match the branch name. Tag these merges with `git tag` (e.g. `v0.28`).

## Guidelines

- **Don't let the `next-<version>` branch get stale.** If it's been open >2 weeks, either ship it or break the migrations into smaller pieces.
- **Tag `next-<version>` → `main` merges** even informally — `git tag` is cheap and makes the deployment log reconstructable.
- **Check the PR base before merging, not after.** Auto-created PRs (from the Claude Code UI, `gh pr create` without `--base`, etc.) default to the repo's default branch — usually `main`. If your branch was based on `next-<version>`, the PR will silently target the wrong branch until you change it. Check `base:` in the PR header.
- **Changelog has two modes**: a running "Recent changes" section for fast-track items, and named/versioned release entries (`v0.28`) for migration-track batches.
- **Ship UI, architect the database.** UI changes should flow fast; schema changes deserve ceremony.

## Cloudflare

The web app runs on one Cloudflare Worker, `sunlo` (`wrangler.jsonc`, code in `worker/`). Each version holds the Vite build and the worker code, so an app and an API from different commits never run together. Production and previews deploy through separate systems, so a broken preview setup cannot block a production deploy:

| Event        | Deployed by                                                   | Supabase project                  | Result                                                                                                   |
| ------------ | ------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Push to main | Workers Builds (Cloudflare's Git integration)                 | Production, from `wrangler.jsonc` | `wrangler deploy`: production serves the new version.                                                    |
| Pull request | `.github/workflows/cloudflare.yaml` → `scripts/cf-preview.sh` | That PR's Supabase preview branch | `wrangler versions upload --preview-alias <branch>`: a URL for this PR only. Production never serves it. |

The production Supabase URL and publishable key are in `wrangler.jsonc` `vars` (for the worker) and in the Workers Builds build variables (for Vite). Both are public. If one changes, change both.

For a PR, the workflow waits for the `Supabase Preview` check, then reads the branch's URL and publishable key with `supabase --experimental branches get <branch> -o env`. `scripts/cf-preview.sh` passes them to the Vite build and to the worker (`--var` replaces the production values in that version). It refuses a local or production Supabase URL. A PR with no Supabase preview branch gets no Cloudflare preview; the wait costs up to 15 minutes of runner time before it gives up.

### Setup

**Workers Builds (production).** In the Cloudflare dashboard, connect the repo to the `sunlo` Worker:

| Setting                                                                  | Value                                                                       |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Production branch                                                        | `main`                                                                      |
| Build command                                                            | `pnpm build`                                                                |
| Deploy command                                                           | `npx wrangler deploy` (the default)                                         |
| Build variables                                                          | `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, matching `wrangler.jsonc` |
| Settings › Build › Branch control › "Builds for non-production branches" | Off. The GitHub workflow makes previews.                                    |

`.node-version` pins Node 24 for the build.

**GitHub (previews).** The workflow is off until `CLOUDFLARE_ACCOUNT_ID` is set. In the GitHub repo settings:

| Name                    | Kind     | Value                                                                |
| ----------------------- | -------- | -------------------------------------------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID` | variable | The Cloudflare account that holds the `sunlo.app` zone.              |
| `CLOUDFLARE_API_TOKEN`  | secret   | A token with the "Edit Cloudflare Workers" template on that account. |
| `SUPABASE_PROJECT_ID`   | variable | Production project ref; the CLI looks up preview branches under it.  |
| `SUPABASE_ACCESS_TOKEN` | secret   | A Supabase personal access token.                                    |

The first production deploy must happen before the first preview upload, because `wrangler versions upload` adds a version to an existing Worker.

Add the preview hostnames to Supabase Auth's redirect allow-list (`additional_redirect_urls` in `supabase/config.toml`) as `https://*-sunlo.<account-subdomain>.workers.dev/**`. Use the account's own subdomain, not a wildcard: anyone can create a `*.workers.dev` host.

Do not deploy production by hand. A local `pnpm build` reads the root `.env`, which points at local Supabase.

### Moving sunlo.app from Vercel

Until the move, Vercel still serves `sunlo.app` and `middleware.ts` gives it the same Open Graph previews. To move:

1. Check the Worker at `sunlo.<account-subdomain>.workers.dev`.
2. Add `"routes": [{ "pattern": "sunlo.app", "custom_domain": true }]` to `wrangler.jsonc` and merge it to main.
3. Disconnect the Vercel project, then delete `vercel.json` and `middleware.ts`.

## Build Environment Footgun

**`.env` must be populated before any production build.** `src/lib/supabase-client.ts` throws when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are unset. A `vite build` with those vars missing does **not** error — instead the guard constant-folds to `if (true) throw`, the `createClient()` call below it becomes dead code, and the bundler silently tree-shakes out the **entire `@supabase/*` SDK (~640 KB)**. The build "succeeds" but ships without Supabase, and any bundle-size measurement is off by roughly a third. Always build with `.env` populated — dummy-but-truthy `VITE_*` values are enough, the build never connects — and sanity-check that large expected dependencies actually appear in `dist/` (e.g. `grep -l GoTrueClient dist/assets/*.js`). The same applies to any tooling that builds the app, including bundle analyzers.
