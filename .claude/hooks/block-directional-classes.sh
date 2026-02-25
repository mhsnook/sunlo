#!/bin/bash
# block-directional-classes.sh — Block left/right Tailwind classes; use start/end for RTL.
#
# CLAUDE.md: "Use 'start' and 'end' instead of 'left' and 'right' for RTL support"
#
# Tailwind logical property equivalents:
#   ml-* → ms-*    mr-* → me-*    pl-* → ps-*    pr-* → pe-*
#   left-* → start-*              right-* → end-*
#   text-left → text-start        text-right → text-end
#   border-l → border-s           border-r → border-e
#   rounded-l → rounded-s         rounded-r → rounded-e
#   scroll-ml → scroll-ms         scroll-mr → scroll-me
#   scroll-pl → scroll-ps         scroll-pr → scroll-pe

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

# Pattern to match LTR-only Tailwind directional utilities
# We look for these as class names (preceded by space, quote, backtick, or colon for variants)
# Using word-boundary-like matching to avoid false positives in variable names
DIRECTIONAL_PATTERN='(^|[\s"'\''`:{])(-?)(ml-|mr-|pl-|pr-|left-|right-|text-left|text-right|border-l-|border-l[^a-z]|border-r-|border-r[^a-z]|rounded-l-|rounded-l[^a-z]|rounded-r-|rounded-r[^a-z]|scroll-ml-|scroll-mr-|scroll-pl-|scroll-pr-|inset-l-|inset-r-)'

if echo "$CONTENT" | grep -qE "$DIRECTIONAL_PATTERN"; then
  MATCHES=$(echo "$CONTENT" | grep -oE '(ml|mr|pl|pr|left|right|text-left|text-right|border-l|border-r|rounded-l|rounded-r|scroll-ml|scroll-mr|scroll-pl|scroll-pr|inset-l|inset-r)-?[a-zA-Z0-9.]*' | sort -u | head -5 | sed 's/^/  /')
  echo "Blocked: Use logical properties (start/end) instead of physical direction (left/right) for RTL support." >&2
  echo "" >&2
  echo "Found:" >&2
  echo "$MATCHES" >&2
  echo "" >&2
  echo "Replacements:" >&2
  echo "  ml-* → ms-*    mr-* → me-*" >&2
  echo "  pl-* → ps-*    pr-* → pe-*" >&2
  echo "  left-* → start-*    right-* → end-*" >&2
  echo "  text-left → text-start    text-right → text-end" >&2
  echo "  border-l → border-s    border-r → border-e" >&2
  echo "  rounded-l → rounded-s    rounded-r → rounded-e" >&2
  exit 2
fi

exit 0
