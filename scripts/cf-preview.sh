#!/usr/bin/env bash
#
# Builds the web app and uploads it with worker/ as a preview version of
# the `sunlo` Worker, at its own URL. Production never serves a preview
# version. Production deploys come from Workers Builds on a push to main,
# not from this script.
#
# Usage: scripts/cf-preview.sh <branch>
#
# VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in the shell
# environment: to the branch's Supabase preview project, or to the
# production project for a branch with no Supabase changes. The script
# passes the same values to the Vite build and to the worker (--var), so
# the app and /api use one project. It refuses a local Supabase URL.

set -euo pipefail

branch="${1:-}"
if [ -z "$branch" ]; then
	echo "usage: scripts/cf-preview.sh <branch>" >&2
	exit 1
fi

: "${VITE_SUPABASE_URL:?set VITE_SUPABASE_URL to the branch's Supabase project URL}"
: "${VITE_SUPABASE_ANON_KEY:?set VITE_SUPABASE_ANON_KEY to the branch's Supabase key}"

case "$VITE_SUPABASE_URL" in
*127.0.0.1* | *localhost*)
	echo "error: VITE_SUPABASE_URL is a local address ($VITE_SUPABASE_URL)." >&2
	exit 1
	;;
esac

pnpm build
./scripts/check-prod-bundle.sh dist/client

if ! grep -qlF "$VITE_SUPABASE_URL" dist/client/assets/*.js; then
	echo "error: the bundle does not contain $VITE_SUPABASE_URL." >&2
	exit 1
fi
if ! grep -ql GoTrueClient dist/client/assets/*.js; then
	echo "error: the Supabase SDK is missing from the bundle." >&2
	exit 1
fi

# A preview alias becomes part of a hostname: lowercase letters, digits
# and dashes only.
alias=$(printf '%s' "$branch" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g' | cut -c1-40 | sed -E 's/^-+|-+$//g')

# --var replaces the production values from wrangler.jsonc in this version.
pnpm exec wrangler versions upload \
	--var "SUPABASE_URL:$VITE_SUPABASE_URL" \
	--var "SUPABASE_ANON_KEY:$VITE_SUPABASE_ANON_KEY" \
	--preview-alias "$alias" \
	--message "Preview of $branch at ${GITHUB_SHA:-$(git rev-parse --short HEAD)}"
