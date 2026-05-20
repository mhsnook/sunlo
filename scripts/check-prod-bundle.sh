#!/usr/bin/env bash
#
# Fails the build if dev-only code leaked into a production bundle.
#
# A correct `vite build` runs in production mode, so `import.meta.env.DEV`
# is statically `false` and the dev-identity-switcher chunk (and its
# hardcoded test credentials) is tree-shaken out entirely. If any of the
# fingerprints below show up in dist/, the build ran in the wrong Vite
# mode and dev tooling is about to ship to real users.
#
# Usage: ./scripts/check-prod-bundle.sh [dist-dir]

set -euo pipefail

DIST_DIR="${1:-dist}"

if [ ! -d "$DIST_DIR" ]; then
	echo "error: build output directory '$DIST_DIR' not found — run 'pnpm build' first" >&2
	exit 1
fi

# Literal strings that exist only inside dev-only modules. String literals
# survive minification, so a clean production build contains none of them.
patterns=(
	'dev-identity-switcher'
	'sunloapp+'
)

failed=0
for pattern in "${patterns[@]}"; do
	matches=$(grep -rlF -- "$pattern" "$DIST_DIR" || true)
	if [ -n "$matches" ]; then
		failed=1
		echo "::error::dev-only fingerprint '$pattern' found in production build:" >&2
		echo "$matches" | sed 's/^/  /' >&2
	fi
done

if [ "$failed" -ne 0 ]; then
	echo >&2
	echo "Dev-only code leaked into the production bundle. This usually means the" >&2
	echo "build ran in the wrong Vite mode (import.meta.env.DEV === true)." >&2
	exit 1
fi

echo "OK: no dev-only fingerprints found in $DIST_DIR"
