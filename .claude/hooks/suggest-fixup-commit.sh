#!/bin/bash
# suggest-fixup-commit.sh — Before git commit, check if this should be a fixup.
#
# ADVISORY (exit 0): This hook suggests but does not block.
# If the commit looks like it's correcting a recent unmerged commit on this
# branch, nudge Claude to use `git commit --fixup=<hash>` instead.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$COMMAND" ]; then
  exit 0
fi

# Only trigger on git commit commands
if ! echo "$COMMAND" | grep -qE '(^|[;&|]\s*)git\s+commit\b'; then
  exit 0
fi

# Skip if already using --fixup, --squash, or --amend — already handled
if echo "$COMMAND" | grep -qE -- '--(fixup|squash|amend)'; then
  exit 0
fi

# Resolve current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
if [ -z "$BRANCH" ] || [ "$BRANCH" = "HEAD" ]; then
  exit 0
fi

# Find the upstream base branch
MAIN_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||')
if [ -z "$MAIN_BRANCH" ]; then
  # Try remote default branch detection first
  MAIN_BRANCH=$(git remote show origin 2>/dev/null | awk '/HEAD branch/ {print $NF}')
fi
if [ -z "$MAIN_BRANCH" ]; then
  for candidate in main master next develop; do
    if git rev-parse --verify "origin/$candidate" >/dev/null 2>&1; then
      MAIN_BRANCH=$candidate
      break
    fi
  done
fi

if [ -z "$MAIN_BRANCH" ]; then
  exit 0
fi

# List commits on this branch not yet merged into main
UNMERGED=$(git log "origin/$MAIN_BRANCH..HEAD" --oneline 2>/dev/null | head -10)

if [ -z "$UNMERGED" ]; then
  exit 0
fi

COUNT=$(echo "$UNMERGED" | wc -l | tr -d ' ')

echo "FIXUP CHECK: Before creating a new commit, ask yourself:"
echo "  Is this commit fixing, completing, or amending a recent commit on this branch?"
echo ""
echo "Unmerged commits on '$BRANCH' ($COUNT):"
echo "$UNMERGED" | sed 's/^/  /'
echo ""
echo "If yes → use:  git commit --fixup=<hash>"
echo "  (then run 'git rebase -i --autosquash origin/$MAIN_BRANCH' to squash before merging)"
echo ""
echo "Only create a new standalone commit if it's genuinely independent work."

exit 0
