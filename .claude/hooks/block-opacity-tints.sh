#!/bin/bash
# block-opacity-tints.sh — Block opacity-based color tints on theme colors.
#
# CLAUDE.md: "Avoid opacity-based tints (bg-primary/10) — use luminance steps
# instead (bg-1-mlo-primary) for consistent appearance across monitors."

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only check .ts/.tsx/.jsx files under src/
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

# Theme color names from the oklch system
THEME_COLORS="primary|accent|danger|warning|success|info|neutral"
# Tailwind utility prefixes that take colors
PREFIXES="bg|text|border|ring|outline|shadow|divide|from|via|to|fill|stroke|decoration|caret|placeholder"

# Check for opacity modifier on theme colors: bg-primary/10, text-accent/50, etc.
if echo "$CONTENT" | grep -qE "(${PREFIXES})-(${THEME_COLORS})/[0-9]+"; then
  MATCHES=$(echo "$CONTENT" | grep -oE "(${PREFIXES})-(${THEME_COLORS})/[0-9]+" | head -3 | sed 's/^/  /')
  echo "Blocked: Do not use opacity-based tints on theme colors. Use oklch luminance steps instead." >&2
  echo "" >&2
  echo "Found:" >&2
  echo "$MATCHES" >&2
  echo "" >&2
  echo "Instead, use luminance + chroma + hue shorthand:" >&2
  echo "  bg-primary/10   →  bg-1-lo-primary   (subtle tint)" >&2
  echo "  bg-primary/20   →  bg-1-mlo-primary  (light tint)" >&2
  echo "  text-accent/50  →  text-5-mid-accent  (mid contrast)" >&2
  echo "  border-danger/30 → border-2-mlo-danger (soft border)" >&2
  exit 2
fi

exit 0
