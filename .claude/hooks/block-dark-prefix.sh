#!/bin/bash
# block-dark-prefix.sh — Block dark: Tailwind prefix in source files.
#
# CLAUDE.md: "dark: prefixes — the semantic palettes flip their shade scale
# in dark mode, so dark: is only needed on a stock colour class like
# bg-amber-600."
#
# The semantic palettes in src/styles/theme.css flip on their own.

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
  echo "Blocked: Do not use the dark: Tailwind prefix. The semantic palettes flip their shade scale in dark mode." >&2
  echo "" >&2
  echo "Found:" >&2
  echo "$MATCHES" >&2
  echo "" >&2
  echo "Instead, use a semantic palette, which flips on its own (docs/styling.md):" >&2
  echo "  bg-primary-100      (not bg-purple-100 dark:bg-purple-900)" >&2
  echo "  text-info-700       (not text-blue-700 dark:text-blue-400)" >&2
  echo "  text-paper          (not text-white dark:text-black)" >&2
  echo "  Or a ShadCN token: bg-card, text-foreground, border-border." >&2
  echo "  dark: is only for a stock colour class, such as the marketing pages in src/routes/-homepage/." >&2
  exit 2
fi

exit 0
