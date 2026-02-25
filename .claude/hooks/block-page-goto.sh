#!/bin/bash
# block-page-goto.sh — Block page.goto() in e2e test files.
#
# CLAUDE.md: "NEVER use page.goto() — it bypasses TanStack Router and breaks cache"
# Exception: goto-helpers.ts where navigation wrapper functions are defined.

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only check files under e2e/
if ! echo "$FILE_PATH" | grep -q '/e2e/'; then
  exit 0
fi

# Allow goto-helpers.ts where navigation wrappers are defined
if echo "$FILE_PATH" | grep -q 'goto-helpers'; then
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

# Check for page.goto( usage
if echo "$CONTENT" | grep -qE 'page\.goto\s*\('; then
  echo "Blocked: Do not use page.goto() in e2e tests — it bypasses TanStack Router and breaks the cache." >&2
  echo "" >&2
  echo "Instead, navigate through the UI using clicks and navigation helpers from e2e/helpers/goto-helpers.ts." >&2
  echo "Example: await page.getByTestId('nav-link--feed').click()" >&2
  exit 2
fi

exit 0
