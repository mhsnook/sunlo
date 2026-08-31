#!/usr/bin/env bash
#
# format-drift.sh — the repo's definition of "unformatted".
#
# Runs the same two formatters `pnpm format` runs, over the whole tree, and
# prints every file they rewrote, one path per line, sorted. That modified set
# IS the drift: no file list is passed in, so a file oxfmt skips on a directory
# walk is skipped here too, exactly as it is in CI. Passing explicit paths
# instead gives a different answer, which is the bug this script exists to
# stop.
#
# Extracted verbatim from the formatter-drift step in
# .github/workflows/test.yaml, so `pnpm format:changed` and the PR gate measure
# the same thing. The workflow still runs its own copy of these commands;
# replacing them with a call to this script needs a token with `workflow`
# scope.
#
# Usage
# -----
#   scripts/format-drift.sh [dir] [--keep]
#
#   dir      Tree to check. Defaults to the repo root containing $PWD. CI
#            passes the base-branch worktree so both sides are measured by the
#            PR's copy of this script.
#   --keep   Leave the tree rewritten. Off by default: the formatters write in
#            place, so this script restores tracked files when it is done.
#            A caller that wants the rewrite kept passes --keep and takes
#            responsibility for the tree.
#
# Restoring touches tracked files only, and it restores every file the
# formatters rewrote. A caller holding uncommitted work must run this against a
# throwaway worktree rather than its own tree — see format-changed.sh.

set -euo pipefail

INVOKER_ROOT="$(git rev-parse --show-toplevel)"

TARGET=""
KEEP=0
for arg in "$@"; do
	case "$arg" in
		--keep) KEEP=1 ;;
		*) TARGET="$arg" ;;
	esac
done

cd "${TARGET:-$INVOKER_ROOT}"

# Restoring means `git checkout -- .`, which destroys uncommitted work. CI's
# tree is always clean so this never fires there; a human running this by hand
# in their own tree would otherwise lose everything they had not committed.
if [[ "$KEEP" == "0" ]] && ! git diff --quiet; then
	cat >&2 <<-MSG
		format-drift.sh: refusing to run — this tree has uncommitted changes.

		  Restoring the tree afterward would discard them. Either commit or
		  stash first, or run 'pnpm format:changed', which measures drift in a
		  throwaway worktree and leaves this one alone.
	MSG
	exit 1
fi

# A linked worktree has no node_modules of its own, so fall back to the
# invoking repo's binaries. CI's base-branch worktree installs its own and wins
# on the first path entry.
export PATH="$PWD/node_modules/.bin:$INVOKER_ROOT/node_modules/.bin:$PATH"

# Same tools, same split, as the `format` script in package.json. Failures are
# swallowed: a file the formatter cannot parse is a syntax error for tsc and
# lint to report, not a reason to lose the drift list for every other file.
oxfmt . > /dev/null 2>&1 || true
prettier --write 'supabase/**/*.sql' > /dev/null 2>&1 || true

git diff --name-only | sort

[[ "$KEEP" == "1" ]] || git checkout -- .
