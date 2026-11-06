#!/usr/bin/env bash
#
# Builds the web app and uploads it with worker/ as a Worker Preview of
# the `sunlo` Worker (`wrangler preview`), at its own URL with its own
# Durable Objects. Production never serves a preview. Production deploys
# come from Workers Builds on a push to main, not from this script.
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

# A preview name becomes part of a hostname: lowercase letters, digits
# and dashes only.
name=$(printf '%s' "$branch" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g' | cut -c1-40 | sed -E 's/^-+|-+$//g')

output=$(mktemp)
trap 'rm -f "$output"' EXIT

# The `previews` block in wrangler.jsonc leaves out the Supabase pair, so
# a preview gets it only from these --var flags.
WRANGLER_OUTPUT_FILE_PATH="$output" pnpm exec wrangler preview \
	--name "$name" \
	--var "SUPABASE_URL:$VITE_SUPABASE_URL" \
	--var "SUPABASE_ANON_KEY:$VITE_SUPABASE_ANON_KEY" \
	--message "Preview of $branch at ${GITHUB_SHA:-$(git rev-parse --short HEAD)}"

# wrangler prints the preview's own URL and then the URL of this one
# deployment. The workflow reads the last URL printed, so print the
# preview's URL last: it stays the same across pushes to the branch.
url=$(node -e '
	const lines = require("fs").readFileSync(process.argv[1], "utf8").trim().split("\n")
	const entry = lines.map((line) => JSON.parse(line)).findLast((e) => e.type === "preview")
	console.log(entry?.preview_urls?.[0] ?? "")
' "$output")
if [ -z "$url" ]; then
	echo "error: wrangler reported no URL for the preview." >&2
	exit 1
fi
echo "Preview URL: $url"
