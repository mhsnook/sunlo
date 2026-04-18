#!/bin/bash
# format-on-save.sh — Auto-format files after edits.
#
# CLAUDE.md: "Use tabs instead of spaces"
# CLAUDE.md: "Run pnpm format before committing"
#
# oxfmt handles JS/TS/JSX/TSX/CSS/MD/JSON/HTML.
# prettier (with prettier-plugin-sql) handles SQL.

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

# Skip files that shouldn't be touched
if echo "$FILE_PATH" | grep -qE '(node_modules|\.git|dist|\.next|\.cache)/'; then
  exit 0
fi

if echo "$FILE_PATH" | grep -qE '\.sql$'; then
  npx prettier --write "$FILE_PATH" > /dev/null 2>&1
elif echo "$FILE_PATH" | grep -qE '\.(tsx?|jsx?|mjs|cjs|json|jsonc|css|md|html)$'; then
  npx oxfmt "$FILE_PATH" > /dev/null 2>&1
fi

exit 0
