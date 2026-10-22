#!/usr/bin/env bash
#
# Builds the web app and uploads it with worker/ as one Cloudflare Worker
# version, so the app and /api come from the same commit and use the same
# Supabase project.
#
# Usage:
#   scripts/cf-deploy.sh production        # deploy and serve the new version
#   scripts/cf-deploy.sh preview <branch>  # upload a version at its own preview URL
#
# VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in the shell
# environment. The script refuses a local Supabase URL, so a build made
# from a local .env never ships.

set -euo pipefail

mode="${1:-}"
branch="${2:-}"

case "$mode" in
production) ;;
preview)
	if [ -z "$branch" ]; then
		echo "error: preview needs a branch name: scripts/cf-deploy.sh preview <branch>" >&2
		exit 1
	fi
	;;
*)
	echo "usage: scripts/cf-deploy.sh production | preview <branch>" >&2
	exit 1
	;;
esac

: "${VITE_SUPABASE_URL:?set VITE_SUPABASE_URL to the target Supabase project URL}"
: "${VITE_SUPABASE_ANON_KEY:?set VITE_SUPABASE_ANON_KEY to the target project anon key}"

case "$VITE_SUPABASE_URL" in
*127.0.0.1* | *localhost*)
	echo "error: VITE_SUPABASE_URL is a local address ($VITE_SUPABASE_URL)." >&2
	echo "Set it to the hosted project for this deploy." >&2
	exit 1
	;;
esac

pnpm build
./scripts/check-prod-bundle.sh dist

if ! grep -qlF "$VITE_SUPABASE_URL" dist/assets/*.js; then
	echo "error: the bundle does not contain $VITE_SUPABASE_URL." >&2
	exit 1
fi
if ! grep -ql GoTrueClient dist/assets/*.js; then
	echo "error: the Supabase SDK is missing from the bundle." >&2
	exit 1
fi

vars=(
	--var "SUPABASE_URL:$VITE_SUPABASE_URL"
	--var "SUPABASE_ANON_KEY:$VITE_SUPABASE_ANON_KEY"
)

if [ "$mode" = production ]; then
	pnpm exec wrangler deploy "${vars[@]}"
	exit 0
fi

# A preview alias becomes part of a hostname: lowercase letters, digits
# and dashes only.
alias=$(printf '%s' "$branch" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g' | cut -c1-40 | sed -E 's/^-+|-+$//g')

pnpm exec wrangler versions upload "${vars[@]}" \
	--preview-alias "$alias" \
	--message "Preview of $branch at ${GITHUB_SHA:-$(git rev-parse --short HEAD)}"
