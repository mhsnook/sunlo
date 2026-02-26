#!/bin/bash
# suggest-test-selectors.sh — Suggest stable selectors instead of getByText.
#
# ADVISORY (exit 0): This hook suggests but does not block.
# When getByText is detected in e2e tests, it nudges Claude to consider
# using getByTestId or other stable selectors. Adding data-testid to the
# JSX is usually worth it for test resilience.

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only check files under e2e/
if ! echo "$FILE_PATH" | grep -qE '/e2e/.*\.(tsx?|jsx?|spec\.[tj]s)$'; then
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

# Check for getByText usage
if echo "$CONTENT" | grep -qE 'getByText\s*\('; then
  MATCHES=$(echo "$CONTENT" | grep -nE 'getByText\s*\(' | head -3 | sed 's/^/  /')
  echo "Suggestion: Consider using a more stable selector instead of getByText."
  echo ""
  echo "Found getByText in a test file:"
  echo "$MATCHES"
  echo ""
  echo "Text content can change with copy edits or i18n. Prefer stable selectors:"
  echo "  page.getByTestId('submit-button')    — add data-testid to the JSX"
  echo "  page.getByRole('button', { name })   — uses accessible role"
  echo "  page.getByLabel('Email')             — for form inputs"
  echo ""
  echo "Adding data-testid to the component JSX is usually worth the small"
  echo "extra effort — it makes tests resilient and documents UI semantics."
  echo "If getByText is truly the best fit here (e.g. verifying specific"
  echo "visible content), keep it as-is."
fi

exit 0
