#!/usr/bin/env bash
#
# Fails if dev-only code leaked into a production bundle.
#
#   ./scripts/check-prod-bundle.sh [dist-dir] [fragment-dir]
#
# A correct `vite build` runs in production mode, so `import.meta.env.DEV` is
# statically `false` and the dev-identity-switcher chunk — along with its
# hardcoded test credentials — is tree-shaken out entirely. If any of the
# fingerprints below survive into dist/, the build ran in the wrong Vite mode
# and dev tooling is about to ship to real users.
#
# scripts/cf-preview.sh runs this before every preview upload. The PR checks
# workflow runs it over the `build:test` output and passes a fragment
# directory, so the scan also writes `60-scan.md` and `60-scan.json` for the
# `### PR checks` comment.

set -uo pipefail

DIST="${1:-dist}"
FRAGMENTS="${2:-}"
[ -d "$DIST" ] || {
	echo "error: build output directory '$DIST' not found — run 'pnpm build' first" >&2
	exit 2
}

# One entry per forbidden fingerprint, as "literal string<TAB>why it must not ship".
#
# These are LITERAL strings, matched with `grep -F`, not patterns. That is the
# point: string literals survive minification, so `dev-identity-switcher` is
# still `dev-identity-switcher` in the bundle, while the identifiers around it
# became `a` and `b`. It also means `sunloapp+` matches the test-email prefix
# itself rather than being read as a regex quantifier.
FORBIDDEN=(
	'dev-identity-switcher	the dev identity switcher, whose module also holds hardcoded test credentials'
	'sunloapp+	the sunloapp+ test email addresses used by the dev identity switcher'
)

# Every file in the build, source maps excepted. Maps legitimately contain
# original source, so scanning them produces hits that mean nothing. `pnpm
# build` emits no maps today; the exclusion is there for the day it does.
#
# `mapfile` rather than word splitting, so a path containing a space is one
# entry rather than two nonexistent ones.
mapfile -t FILES < <(find "$DIST" -type f ! -name '*.map')
[ "${#FILES[@]}" -gt 0 ] || { echo "no scannable files in $DIST" >&2; exit 2; }

found=0
report=()
for entry in "${FORBIDDEN[@]}"; do
	pattern="${entry%%	*}"
	reason="${entry#*	}"
	hits=$(grep -rlF -- "$pattern" "${FILES[@]}" 2>/dev/null || true)
	if [ -n "$hits" ]; then
		# `::error::` puts the reason on the run summary and on the file, where a
		# contributor sees it without reading the log.
		echo "::error::dev-only fingerprint '$pattern' found in production build: $reason"
		echo "$hits" | sed 's|^|   |'
		report+=("- ❌ **$reason** — \`$pattern\`")
		while IFS= read -r hit; do report+=("  - \`$hit\`"); done <<<"$hits"
		found=$((found + 1))
	fi
done

WRONG_MODE='This usually means the build ran in the wrong Vite mode (`import.meta.env.DEV === true`).'

if [ -n "$FRAGMENTS" ]; then
	mkdir -p "$FRAGMENTS"
	{
		echo "#### Build content scan"
		echo
		if [ "$found" -gt 0 ]; then
			echo "❌ **$found dev-only fingerprint(s) reached the build output.**"
			echo
			printf '%s\n' "${report[@]}"
			echo
			echo "$WRONG_MODE"
		else
			echo "✅ Build output clean — ${#FORBIDDEN[@]} fingerprint(s) checked."
		fi
	} >"$FRAGMENTS/60-scan.md"
	printf '{\n\t"check": "scan",\n\t"new": %d,\n\t"why": "%d dev-only fingerprint(s) in the build output"\n}\n' \
		"$found" "$found" >"$FRAGMENTS/60-scan.json"
fi

if [ "$found" -gt 0 ]; then
	echo
	echo "Dev-only code leaked into the production bundle. $WRONG_MODE"
	exit 1
fi

echo "OK: no dev-only fingerprints found in $DIST (${#FORBIDDEN[@]} checked)"
