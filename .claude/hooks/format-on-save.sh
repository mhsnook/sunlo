#!/bin/bash
# format-on-save.sh — Auto-format files with prettier after edits.
#
# CLAUDE.md: "Use tabs instead of spaces (enforced by prettier.config.mjs)"
# CLAUDE.md: "Run pnpm format before committing"
#
# Runs prettier on files after Edit/Write to ensure consistent formatting.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Skip non-existent files (e.g. after a failed write)
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Skip files outside the project
PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // empty')
if [ -n "$PROJECT_DIR" ] && ! echo "$FILE_PATH" | grep -q "^$PROJECT_DIR"; then
  exit 0
fi

# Skip files that prettier doesn't handle or shouldn't touch
if echo "$FILE_PATH" | grep -qE '(node_modules|\.git|dist|\.next|\.cache)/'; then
  exit 0
fi

# Only format file types prettier supports in this project
if ! echo "$FILE_PATH" | grep -qE '\.(tsx?|jsx?|json|css|md|sql|html|mjs|cjs)$'; then
  exit 0
fi

# Run prettier (suppress output; formatting shouldn't block)
npx prettier --write "$FILE_PATH" > /dev/null 2>&1

exit 0
