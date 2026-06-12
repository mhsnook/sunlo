#!/usr/bin/env bash
set -euo pipefail

# The `db` stage of scenetest/pipeline.json. Boots the local Supabase stack,
# pins the connection details the rest of the box needs, and resets to a clean
# seeded database. Mirrors the `scenetest` job in .github/workflows/test.yaml.

# `supabase start` is idempotent (a no-op against an already-running stack).
# Exclude the services scenes never touch, matching CI, to keep boot fast.
supabase start -x studio,imgproxy,logflare,vector,supavisor,edge-runtime,inbucket

# Write a .env at the repo root so both consumers pick up the same credentials:
#   - Vite, at build time (`pnpm build:test`), inlines the VITE_* values.
#   - scenetest/config.ts, at run time, reads them via `dotenv/config` for the
#     server-side Supabase client (cleanup/setup directives).
# Keys are read back from the running stack rather than hard-coded so they
# always track the CLI's local defaults.
status=$(supabase status -o json)
{
	echo "VITE_SUPABASE_URL=http://127.0.0.1:54321"
	echo "VITE_SUPABASE_ANON_KEY=$(echo "$status" | jq -r '.ANON_KEY')"
	echo "SUPABASE_SERVICE_ROLE_KEY=$(echo "$status" | jq -r '.SERVICE_ROLE_KEY')"
} >.env

# Apply migrations + seeds for a deterministic starting point.
supabase db reset
