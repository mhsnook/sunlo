---
name: Supabase Cloud Stack
description: 'Boot the full local Supabase stack (Postgres, GoTrue auth, PostgREST, Realtime, Storage) inside a Claude Code cloud session, where no Docker daemon is running by default. On demand only: for release-branch work, running scenetest specs, or checking auth and RLS behaviour against a live API. Triggers: spin up supabase, boot the stack, run the scenes, test this against a live database, work on next-<version>.'
version: 1.0.0
---

# Supabase Cloud Stack

Run `scripts/supabase-cloud.sh up` to get a live, seeded Supabase stack in a
cloud session. The script starts a Docker daemon when the socket is missing,
fetches the Supabase CLI when it is not on PATH, runs `supabase start` with the
same service exclusions CI uses, and writes the stack's keys into `.env`.

## When to use it, and when not to

Use it when the work needs the API layer: auth, RLS, realtime, storage, or a
scenetest run. That is release-branch (`next-<version>`) work and any change
where "does the page render with real data?" is the question.

Do not run it at the start of every session. A cold boot pulls ≈4.5 GB of
images and takes ≈3 minutes. For schema-only checks (does a migration apply?
do the seeds load?) use `scripts/db-native.sh`, which needs no Docker, resets
in ≈1 s warm, and is documented in `docs/database.md`.

## Measured costs (Claude Code cloud session, September 2026)

| Step                                             | Time   |
| ------------------------------------------------ | ------ |
| `up`, cold (CLI download + image pulls + boot)   | ≈3 min |
| `up`, warm (images cached, stack stopped)        | ≈40 s  |
| `up`, stack already running                      | ≈4 s   |
| `reset` (`supabase db reset`, 133 migrations)    | ≈35 s  |
| `pnpm dev` until it serves                       | ≈2.5 s |
| Browser: login + data-backed page, warm Vite     | ≈3.5 s |

The first page load after `pnpm dev` starts is ≈10 s, because Vite pre-bundles
dependencies once. Keep the dev server running between checks.

## Flow

```bash
scripts/supabase-cloud.sh up       # once per session, idempotent
pnpm dev                           # background, keep it running
pnpm scene scenetest/scenes/<one>.spec.md
scripts/supabase-cloud.sh reset    # only when a scene needs a clean seed
scripts/supabase-cloud.sh psql     # poke at the data
scripts/supabase-cloud.sh stop     # optional; images stay cached
```

Seeded test accounts and their passwords are listed in
`scenetest/actors/default.ts`. `supabase start` applies migrations and seeds on
a fresh stack, so `reset` is only needed to throw away state a previous run
left behind.

## Things that go wrong

- **Daemon dies between tool calls.** The script starts `dockerd` with `setsid nohup` so it outlives the shell. If `docker info` fails later, run `up` again; it restarts the daemon and the containers.
- **Port 5173 already bound.** A previous `pnpm dev` is still running. Reuse it; do not start a second one.
- **`until` loops waiting on a URL.** Bound the loop (`for i in $(seq 1 300)`), or the tool call hangs past its timeout.
- **`networkidle` never fires.** The realtime websocket keeps the connection busy. Wait for page content instead.
- **"The browser build is not installed."** The box's preinstalled Chromium can be an older build than this project's Playwright expects. Run `pnpm exec scenetest install` to fetch the matching build (≈170 MB), or alias the installed build under the expected revision directory in `/opt/pw-browsers`.
- **Disk.** Images take ≈4.5 GB; the session allowance is ≈30 GB. `docker system prune` frees space if a session runs low.

## What this does not replace

- CI still replays every migration under the real Supabase CLI in Docker; this stack is the same images, so the result should match, but CI is the gate.
- `pnpm types` and `pnpm schema` work here once the stack is up, and produce the same output as on a laptop. Review the diff before committing, as `docs/database.md` says.
