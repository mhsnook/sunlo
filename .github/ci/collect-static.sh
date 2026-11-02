#!/usr/bin/env bash
# Collect normalised static-check output into $1.
#
# Runs once on the head tree and once on the base tree, always from that tree's
# own root. Output is one sorted line per issue, so the diff engine can treat
# the two runs as comparable sets:
#
#   typecheck.txt  lint.txt  format.txt   one issue (or unformatted file) per line
#   did-not-run.txt                       `<check>: <reason>` for a tool that
#                                         failed without reporting issues
#
# A tool that did not run must NOT become a line in its issue list. The same
# line would appear in both trees and cancel out of the delta, and the check
# would pass having measured nothing.
#
# Every tool is called through `pnpm exec`, not the package script that wraps
# it: both trees run the head copy of this script, and on a PR that adds or
# renames a script the base tree does not have it. Keep the commands in step
# with `check`, `lint` and `format` in package.json.
#
# NOTE: this script ends by restoring the tree with `git checkout -- .`. That is
# correct in CI, where the checkout is clean. Run it against a working tree with
# uncommitted edits and it discards them.

# Deliberately no `-e`: every check here exits non-zero when it finds issues,
# which is the normal case, not a script failure.
set -uo pipefail

OUT="${1:?usage: collect-static.sh <output-dir>}"
mkdir -p "$OUT"
: >"$OUT/did-not-run.txt"

# Byte-order sorting, so the two trees produce comparable lists even if the two
# runners ever differ in locale. `sort` under a UTF-8 locale ignores leading
# punctuation, which would order `.oxfmtrc.json` after `AGENTS.md`.
export LC_ALL=C

# Read-only checks run concurrently. The typechecker is the long pole and the
# linters finish underneath it, so this is close to free.
(
	# `pnpm check` is `tsrs -b`, which does not reach the admin app's two
	# tsconfigs, so they run on their own. The admin app imports the main app's
	# code, so a main-app change can break it.
	#
	# A run that fails without printing a single `error TS` line (a broken
	# project reference, a crash) did not typecheck anything.
	typecheck() {
		local raw="$OUT/.typecheck-$1.raw"
		shift
		"$@" >"$raw" 2>&1
		local status=$?
		if [ "$status" -ne 0 ] && ! grep -q ': error TS' "$raw"; then
			echo "typecheck: \`$*\` exited $status without reporting errors" >>"$OUT/did-not-run.txt"
		fi
	}
	typecheck main pnpm exec tsrs -b
	typecheck admin pnpm exec tsrs --noEmit -p apps/admin/tsconfig.json
	typecheck admin-worker pnpm exec tsrs --noEmit -p apps/admin/tsconfig.worker.json
	# The grep drops the summary lines, which change with the error count and
	# would diff as noise.
	cat "$OUT"/.typecheck-*.raw | grep ': error TS' | sort >"$OUT/typecheck.txt"
) &
(
	# `pnpm lint` is oxlint, then ESLint for the app, then ESLint for
	# apps/admin. Run each one here: `&&` would skip the rest whenever one
	# found anything. All lists end up as `file:line:col: message` lines and
	# merge into one sorted list.
	pnpm exec oxlint . -f unix >"$OUT/.oxlint.raw" 2>&1

	# ESLint 9 has no unix formatter in core, so scripts/eslint-unix.mjs turns
	# its JSON report into oxlint's line shape, with repo-root-relative paths.
	# Keep the app and apps/admin as two ESLint processes: one `eslint .` loads
	# both TypeScript programs at once and runs out of Node's default heap.
	pnpm exec eslint . --ignore-pattern apps/admin/ -f json >"$OUT/.eslint-app.json"
	node scripts/eslint-unix.mjs <"$OUT/.eslint-app.json" >"$OUT/.eslint-app.raw" ||
		echo "lint: ESLint printed no JSON report for the app" >>"$OUT/did-not-run.txt"
	pnpm exec eslint apps/admin -f json >"$OUT/.eslint-admin.json"
	node scripts/eslint-unix.mjs <"$OUT/.eslint-admin.json" >"$OUT/.eslint-admin.raw" ||
		echo "lint: ESLint printed no JSON report for apps/admin" >>"$OUT/did-not-run.txt"

	cat "$OUT/.oxlint.raw" "$OUT/.eslint-app.raw" "$OUT/.eslint-admin.raw" |
		grep -E '^[^:[:space:]][^:]*:[0-9]+:[0-9]+:' |
		sort -u >"$OUT/lint.txt"
) &
wait

# The formatter REWRITES files, so it runs after the read-only checks. The set
# of files it modified is exactly the formatting debt — no separate --check
# pass needed. Restore the tree afterwards so later steps see a clean checkout.
#
# Both halves of `pnpm format` run: oxfmt for code, prettier for the SQL under
# supabase/, which oxfmt does not handle. Dropping either half would make the
# drift list disagree with what `pnpm format` does on a developer's machine.
pnpm exec oxfmt . >/dev/null 2>&1 ||
	echo "format: oxfmt exited $?" >>"$OUT/did-not-run.txt"
pnpm exec prettier --write 'supabase/**/*.sql' >/dev/null 2>&1 ||
	echo "format: prettier exited $?" >>"$OUT/did-not-run.txt"
git diff --name-only | sort >"$OUT/format.txt"
git checkout -- .

wc -l "$OUT"/*.txt
