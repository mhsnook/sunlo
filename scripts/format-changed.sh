#!/usr/bin/env bash
#
# format-changed.sh — format the work you have not committed yet.
#
# Why this exists
# ---------------
# `pnpm format` runs oxfmt over the whole repo. Files that predate the current
# oxfmt version are already unformatted on main, so a repo-wide run rewrites
# files nobody asked about and buries the real change in the diff.
#
# Scope is everything uncommitted — staged, unstaged, untracked. Anything
# already committed went through `.lintstagedrc.js` on its way in, so it is
# formatted; the gap is a commit made with --no-verify, which CI still catches.
#
# What counts as unformatted is NOT decided here. `scripts/format-drift.sh`
# owns that, extracted verbatim from the formatter-drift step in
# .github/workflows/test.yaml so the local answer and the PR gate's cannot
# differ. It matters more than it looks: drift means "run the formatters over
# the tree and see what they rewrote", and passing an explicit file list to
# `oxfmt --check` instead gives a different answer, because a path oxfmt skips
# on a directory walk is not skipped when it is named.
#
# The workflow still holds its own copy of those commands. Pointing it at this
# script needs a token with `workflow` scope — see the commit message.
#
# Usage
# -----
#   pnpm format:changed              # format them
#   pnpm format:changed --check      # report, write nothing

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
ROOT="$PWD"

CHECK=0
[[ "${1:-}" == "--check" ]] && CHECK=1

CHANGED=$(mktemp)
DRIFT=$(mktemp)
trap 'rm -f "$CHANGED" "$DRIFT"' EXIT

# --diff-filter=d drops deletions: a file that is gone cannot be formatted.
{
	git diff --name-only --diff-filter=d          # unstaged
	git diff --name-only --diff-filter=d --cached # staged
	git ls-files --others --exclude-standard      # untracked
} | sort -u > "$CHANGED"

if [[ ! -s "$CHANGED" ]]; then
	echo "format-changed: nothing uncommitted to format."
	exit 0
fi

# ── Measure drift in a mirror, never in the real tree ───────────────────────
# format-drift.sh lets the formatters write and reads back `git diff`, so it
# needs a tree it may rewrite and a diff that starts empty. Neither holds here:
# this tree is dirty by definition, and an untracked file never shows in
# `git diff` at all.
#
# So mirror the working tree into a throwaway worktree and commit it there.
# `git stash create` snapshots tracked modifications into a commit object
# without touching the working tree; untracked files are not in that object, so
# copy them across and commit the lot. The mirror then starts clean, exactly as
# CI's checkout does, and its `git diff` afterward is purely the formatters'
# work.
MIRROR="$ROOT/.format-check-worktree"
rm -rf "$MIRROR"
git worktree prune
SNAPSHOT=$(git stash create) || SNAPSHOT=""
git worktree add --detach --quiet "$MIRROR" "${SNAPSHOT:-HEAD}"
trap 'rm -f "$CHANGED" "$DRIFT"; git worktree remove --force "$MIRROR" 2>/dev/null || true; rm -rf "$MIRROR"; git worktree prune' EXIT

while IFS= read -r file; do
	mkdir -p "$MIRROR/$(dirname "$file")"
	cp "$file" "$MIRROR/$file"
done < <(git ls-files --others --exclude-standard)

git -C "$MIRROR" add -A
git -C "$MIRROR" -c user.name=format-changed -c user.email=format-changed@local \
	commit -q --no-verify --allow-empty -m 'working tree snapshot'

bash scripts/format-drift.sh "$MIRROR" --keep > "$DRIFT"

# ── The gate: drift ∩ uncommitted ───────────────────────────────────────────
DIRTY=$(comm -12 "$DRIFT" "$CHANGED")
dirty_count=$([[ -z "$DIRTY" ]] && echo 0 || wc -l <<< "$DIRTY" | tr -d ' ')

if [[ "$CHECK" == "1" ]]; then
	if [[ "$dirty_count" == "0" ]]; then
		echo "format-changed: every uncommitted file is formatted."
		exit 0
	fi
	echo "format-changed: $dirty_count uncommitted file(s) are not formatted."
	echo "$DIRTY" | sed 's/^/  /'
	echo "Run 'pnpm format:changed' and commit the result."
	exit 1
fi

if [[ "$dirty_count" == "0" ]]; then
	echo "format-changed: nothing to reformat."
	exit 0
fi

# The mirror already holds each flagged file, formatted, so copying it back is
# the whole fix. It also keeps the real tree out of the formatters' way: no
# file outside this set is read or written, so none can be rewritten by
# accident.
while IFS= read -r file; do
	[[ -n "$file" ]] && cp "$MIRROR/$file" "$file"
done <<< "$DIRTY"

echo "format-changed: reformatted $dirty_count file(s)."
echo "$DIRTY" | sed 's/^/  /'
