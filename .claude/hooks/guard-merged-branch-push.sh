#!/bin/bash
# guard-merged-branch-push.sh — Refuse to push to a branch whose remote tip is
# already merged into the default branch.
#
# CLAUDE.md: "Follow-up work after a merge goes on a NEW branch name, never the
# merged one." Reusing a merged branch's name re-attaches to its closed PR and
# clutters the branch list. This hook enforces that mechanically.

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
[ "$TOOL_NAME" = "Bash" ] || exit 0

CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
echo "$CMD" | grep -qE '\bgit[[:space:]]+push\b' || exit 0

# Deletes are how you clean up a merged branch — always allow them.
echo "$CMD" | grep -qE '(--delete|[[:space:]]-d[[:space:]]|[[:space:]]:)' && exit 0

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

DEFAULT_BRANCH="main"

# Resolve the branch being pushed: first positional arg after `push` that isn't
# a flag or the remote name; fall back to the current HEAD.
BRANCH=$(echo "$CMD" | grep -oE 'git[[:space:]]+push[^&|;]*' | head -1 |
	sed -E 's/.*git[[:space:]]+push[[:space:]]*//' | tr ' ' '\n' |
	grep -vE '^-' | grep -vE '^(origin|upstream)$' | head -1)
BRANCH=${BRANCH##*:} # local:remote -> remote side
if [ -z "$BRANCH" ] || [ "$BRANCH" = "HEAD" ]; then
	BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
fi
[ -n "$BRANCH" ] || exit 0

# Never guard the long-lived branches.
case "$BRANCH" in
main | master | next-*) exit 0 ;;
esac

# Only meaningful once the remote branch exists.
git rev-parse --verify --quiet "origin/$BRANCH" >/dev/null 2>&1 || exit 0

git fetch -q origin "$DEFAULT_BRANCH" 2>/dev/null || true

# A tip on the default's first-parent line means a freshly cut branch, which the
# ancestor test below would call merged. A merged branch never sits there: squash
# and rebase rewrite its commits, and a merge commit takes the tip as a 2nd parent.
TIP=$(git rev-parse "origin/$BRANCH" 2>/dev/null)
if [ -n "$TIP" ] &&
	git rev-list --first-parent "origin/$DEFAULT_BRANCH" 2>/dev/null |
	grep -qx "$TIP"; then
	exit 0
fi

if git merge-base --is-ancestor "origin/$BRANCH" "origin/$DEFAULT_BRANCH" 2>/dev/null; then
	echo "Blocked: origin/$BRANCH is already merged into $DEFAULT_BRANCH." >&2
	echo "" >&2
	echo "Follow-up work after a merge must go on a NEW branch name, not the merged one." >&2
	echo "Branch fresh off the default and push that instead:" >&2
	echo "  git checkout -B <new-branch-name> origin/$DEFAULT_BRANCH" >&2
	echo "" >&2
	echo "(If you truly mean to reuse this ref, delete origin/$BRANCH first.)" >&2
	exit 2
fi

exit 0
