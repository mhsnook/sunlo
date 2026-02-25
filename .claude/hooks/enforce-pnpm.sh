#!/bin/bash
# enforce-pnpm.sh — Block npm/yarn commands; this project uses pnpm.
#
# CLAUDE.md: "Package Manager: PNPM"
# All dev commands (install, dev, lint, test, etc.) must use pnpm.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$COMMAND" ]; then
  exit 0
fi

# Check if command uses npm as a command (not inside a string or path).
# Matches: npm install, npm run dev, ENV=1 npm test, && npm ci
# Skips: .npm/, /npm/, "npm", npx (which is fine)
if echo "$COMMAND" | grep -qE '(^|[;&|]\s*|^\s*)npm\s'; then
  SUGGESTED=$(echo "$COMMAND" | sed -E 's/(^|[;&|]\s*)npm\s/\1pnpm /g')
  echo "Blocked: Use pnpm instead of npm. This project uses pnpm as its package manager." >&2
  echo "" >&2
  echo "Suggested: $SUGGESTED" >&2
  exit 2
fi

# Check if command uses yarn as a command
if echo "$COMMAND" | grep -qE '(^|[;&|]\s*|^\s*)yarn\s'; then
  SUGGESTED=$(echo "$COMMAND" | sed -E 's/(^|[;&|]\s*)yarn\s/\1pnpm /g')
  echo "Blocked: Use pnpm instead of yarn. This project uses pnpm as its package manager." >&2
  echo "" >&2
  echo "Suggested: $SUGGESTED" >&2
  exit 2
fi

exit 0
