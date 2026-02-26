#!/bin/bash
# suggest-url-state.sh — Suggest URL search params instead of useState.
#
# ADVISORY (exit 0): This hook suggests but does not block.
# When useState is detected in route files, it nudges Claude to consider
# whether the state belongs in the URL (via TanStack Router search params)
# for better shareability, back-button support, and SSR.

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only check route files under src/routes/
if ! echo "$FILE_PATH" | grep -qE '/src/routes/.*\.(tsx?|jsx?)$'; then
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

# Check for useState usage
if echo "$CONTENT" | grep -qE 'useState\s*[<(]'; then
  MATCHES=$(echo "$CONTENT" | grep -nE 'useState\s*[<(]' | head -3 | sed 's/^/  /')
  echo "Suggestion: Consider whether this useState should be URL search params instead."
  echo ""
  echo "Found useState in a route file:"
  echo "$MATCHES"
  echo ""
  echo "TanStack Router search params give you shareable URLs, back-button support,"
  echo "and server-side access. Consider using Route.useSearch() with validateSearch."
  echo ""
  echo "If useState is the right choice here (e.g. transient UI state like"
  echo "open/closed dialogs, hover states, form-in-progress), keep it as-is."
fi

exit 0
