#!/usr/bin/env bash
# Collect normalised static-check output into $1.
#
# Runs once on the head tree and once on the base tree, always from that tree's
# own root. Output is one sorted line per issue, so the diff engine can treat
# the two runs as comparable sets.
#
# The commands here are the ones the `pr-checks` job ran inline before this
# script existed: `tsc -b`, then oxlint and eslint merged into one list, then
# both halves of `pnpm format`. Every one calls the TOOL through `pnpm exec`
# rather than the package script that wraps it: the base tree is the base
# branch, and a PR that adds or renames a script would otherwise measure two
# trees with two different commands. Keep them in step with package.json.
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
	# does not have it. `pnpm check` is `tsc -b`; spell it out.
	#
	# The grep drops the summary lines, which change with the error count and
	# would diff as noise.
	pnpm exec tsc -b 2>&1 | grep ': error TS' | sort >"$OUT/typecheck.txt"
	status=${PIPESTATUS[0]}

	# A typechecker that failed but printed nothing the grep recognises would
	# leave an empty file, which reads as zero errors and merges clean. `tsc -b`
	# in particular reports a broken project reference in its own format, with
	# no `error TS` line per file. Record the failure as an issue instead.
	if [ "$status" -ne 0 ] && [ ! -s "$OUT/typecheck.txt" ]; then
		echo "typecheck:0:0: error TS0000: the typechecker exited $status without recognisable error lines — see the job log" \
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

	# ESLint 9 dropped the unix formatter from core: `eslint -f unix` now prints
	# "The unix formatter is no longer part of core ESLint" and nothing else.
	# The inline job asked for it anyway, so the grep below silently dropped
	# that message and eslint has been contributing ZERO issues to the delta
	# since the ESLint 9 upgrade. Read the JSON formatter, which is still in
	# core, and build the unix lines here — no extra dependency, and the base
	# tree runs this same script, so both sides are converted identically.
	#
	# Paths come back absolute, so make them repo-root-relative to match
	# oxlint's. The two jobs check out to the same path today, but a merged list
	# whose shape depends on the checkout directory is a trap worth closing.
	pnpm exec eslint . -f json >"$OUT/.eslint.json" 2>/dev/null
	node -e '
		const fs = require("fs")
		let files = []
		try { files = JSON.parse(fs.readFileSync(process.argv[1], "utf8")) } catch { process.exit(0) }
		const root = process.cwd() + "/"
		const out = []
		for (const f of files)
			for (const m of f.messages ?? [])
				out.push(
					`${f.filePath.startsWith(root) ? f.filePath.slice(root.length) : f.filePath}` +
						`:${m.line ?? 0}:${m.column ?? 0}: ${m.message} ` +
						`[${m.severity === 2 ? "Error" : "Warning"}/${m.ruleId ?? "eslint"}]`
				)
		fs.writeFileSync(process.argv[2], out.join("\n") + (out.length ? "\n" : ""))
	' "$OUT/.eslint.json" "$OUT/.eslint.raw"
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
