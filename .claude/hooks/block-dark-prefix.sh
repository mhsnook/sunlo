#!/bin/bash
# block-dark-prefix.sh — Block dark: Tailwind prefix in source files.
#
# CLAUDE.md: "Avoid dark: prefixes — the oklch scale and semantic tokens auto-flip.
# Only use dark: for truly exceptional cases."
#
# The tailwind-oklch color system handles light/dark mode automatically.

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only check .ts/.tsx files under src/
if ! echo "$FILE_PATH" | grep -qE '/src/.*\.(tsx?|jsx?)$'; then
  exit 0
fi

# Get the new content being written
if [ "$TOOL_NAME" = "Edit" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')
elif [ "$TOOL_NAME" = "Write" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
else
  exit 0
fi

if [ -z "$CONTENT" ]; then
  exit 0
fi

# Check for dark: prefix in Tailwind classes
# Matches: dark:bg-*, dark:text-*, hover:dark:*, etc.
if echo "$CONTENT" | grep -qE '(^|[\s"'\''`])dark:'; then
  MATCHES=$(echo "$CONTENT" | grep -oE '(^|[\s"'\''`])dark:[a-zA-Z0-9_-]+' | head -3 | sed 's/^[[:space:]]*/  /')
  echo "Blocked: Do not use dark: Tailwind prefix. The oklch color system auto-flips for dark mode." >&2
  echo "" >&2
  echo "Found:" >&2
  echo "$MATCHES" >&2
  echo "" >&2
  echo "Instead, use oklch color utilities that auto-flip:" >&2
  echo "  bg-1-mlo-primary    (not dark:bg-purple-900)" >&2
  echo "  text-7-hi-info      (not dark:text-blue-400)" >&2
  echo "  Or use semantic tokens: bg-card, text-foreground, etc." >&2
  exit 2
fi

exit 0
