#!/usr/bin/env bash
# Collect normalised static-check output into $1.
#
# Runs once on the head tree and once on the base tree, always from that tree's
# own root. Output is one sorted line per issue, so the diff engine can treat
# the two runs as comparable sets.
#
# The commands here are the ones the `pr-checks` job ran inline before this
# script existed: the typecheck for the main app and the admin app, then oxlint
# and eslint merged into one list, then both halves of `pnpm format`. Every one
# calls the TOOL through `pnpm exec` rather than the package script that wraps
# it: the base tree is the base branch, and a PR that adds or renames a script
# would otherwise measure two trees with two different commands. Keep them in
# step with package.json.
#
# Both trees run the head copy of this script and of scripts/eslint-unix.mjs.
# The `base` job checks both out from the PR before it runs anything.
#
# NOTE: this script ends by restoring the tree with `git checkout -- .`. That is
# correct in CI, where the checkout is clean. Run it against a working tree with
# uncommitted edits and it discards them.

# Deliberately no `-e`: every check here exits non-zero when it finds issues,
# which is the normal case, not a script failure.
set -uo pipefail

OUT="${1:?usage: collect-static.sh <output-dir>}"
mkdir -p "$OUT"

# Byte-order sorting, so the two trees produce comparable lists even if the two
# runners ever differ in locale. `sort` under a UTF-8 locale ignores leading
# punctuation, which would order `.oxfmtrc.json` after `AGENTS.md`.
export LC_ALL=C

# Paths kept out of the lint and formatter deltas.
#
# `dist/` is gitignored and both linters already skip it, so it never reached
# these lists anyway. `.github/ci/` is this workflow's own machinery: a PR that
# edits a check script should not read as a PR that changed the codebase.
# Nothing else is excluded, so the numbers match what the inline job reported.
EXCLUDE='^(dist/|\.github/ci/)'

# Read-only checks run concurrently. The typechecker is the long pole and the
# linters finish underneath it, so this is close to free.
(
	# The TOOL, not the `check` script. Both trees run this script, and the base
	# tree is the base branch — on the PR that adds or renames a script, base
	# does not have it. `pnpm check` is `tsrs -b`; spell it out.
	#
	# `tsrs -b` does not reach the admin app's two tsconfigs, so they run on
	# their own. The admin app imports the main app's code, so a main-app change
	# can break it.
	#
	# The grep drops the summary lines, which change with the error count and
	# would diff as noise.
	failed=0
	pnpm exec tsrs -b >"$OUT/.typecheck.raw" 2>&1 || failed=$?
	for project in apps/admin/tsconfig.json apps/admin/tsconfig.worker.json; do
		pnpm exec tsrs --noEmit -p "$project" >>"$OUT/.typecheck.raw" 2>&1 || failed=$?
	done
	grep ': error TS' "$OUT/.typecheck.raw" | sort >"$OUT/typecheck.txt"

	# A typechecker that failed but printed nothing the grep recognises would
	# leave an empty file, which reads as zero errors and merges clean. A broken
	# project reference, for one, prints in its own format with no `error TS`
	# line per file. Record the failure as an issue instead.
	if [ "$failed" -ne 0 ] && [ ! -s "$OUT/typecheck.txt" ]; then
		echo "typecheck:0:0: error TS0000: the typechecker exited $failed without recognisable error lines — see the job log" \
			>"$OUT/typecheck.txt"
	fi
) &
(
	# `pnpm lint` is `oxlint . && eslint .`. Run them separately here: `&&`
	# would skip eslint whenever oxlint found anything, which is most of the
	# time. Both lists end up in unix format (`file:line:col: message`) and
	# merge into one sorted list — a reviewer cares that there is a new issue at
	# src/foo.ts:12, not which tool found it.
	pnpm exec oxlint . -f unix >"$OUT/.oxlint.raw" 2>&1

	# ESLint 9 has no unix formatter in core, so scripts/eslint-unix.mjs turns
	# its JSON report into oxlint's line shape, with repo-root-relative paths.
	#
	# ESLint over this repo needs more than Node's default heap, which is about
	# 2 GB on a 16 GB machine. When it runs out on both trees, the converter's
	# "did not run" line appears on both sides and cancels out of the delta.
	NODE_OPTIONS=--max-old-space-size=4096 pnpm exec eslint . -f json 2>/dev/null |
		node scripts/eslint-unix.mjs >"$OUT/.eslint.raw"
	cat "$OUT/.oxlint.raw" "$OUT/.eslint.raw" |
		grep -E '^[^:[:space:]][^:]*:[0-9]+:[0-9]+:' |
		grep -Ev "$EXCLUDE" |
		sort -u >"$OUT/lint.txt"
) &
wait

# The formatter REWRITES files, so it runs after the read-only checks. The set
# of files it modified is exactly the formatting debt — no separate --check
# pass needed. Restore the tree afterwards so later steps see a clean checkout.
#
# Both halves of `pnpm format` run: oxfmt for code, prettier for the SQL under
# supabase/, which oxfmt does not handle. Dropping either half would make the
# drift list disagree with what `pnpm format` does on a developer's machine,
# and the gate would then block on files the documented command cannot fix.
pnpm exec oxfmt . >/dev/null 2>&1
pnpm exec prettier --write 'supabase/**/*.sql' >/dev/null 2>&1
git diff --name-only | grep -Ev "$EXCLUDE" | sort >"$OUT/format.txt"
git checkout -- .

# Never let a missing file break the render step.
#
# `touched.txt` is deliberately NOT in this list. The workflow writes it into
# the same directory on the head tree only, and the formatter gate reads its
# ABSENCE as "the step that lists this PR's files did not run" — an empty file
# here would turn that failure into a silent pass.
for f in typecheck lint format; do
	[ -f "$OUT/$f.txt" ] || : >"$OUT/$f.txt"
done

wc -l "$OUT"/*.txt
