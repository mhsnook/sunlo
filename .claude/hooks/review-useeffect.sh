#!/usr/bin/env bash
# PostToolUse hook: flags any Edit or Write that introduced useEffect.
# Reads the tool input/response JSON from stdin. If useEffect was added,
# injects context back to Claude to explain it to the user and track it
# for the commit message.

set -euo pipefail

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')

adds_useeffect=false
file_path="unknown file"

if [ "$TOOL" = "Edit" ]; then
  old=$(echo "$INPUT" | jq -r '.tool_input.old_string // empty')
  new=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')
  file_path=$(echo "$INPUT" | jq -r '.tool_input.file_path // "unknown file"')
  # Only flag if useEffect is in the new text but NOT in the old text
  if echo "$new" | grep -q 'useEffect' && ! echo "$old" | grep -q 'useEffect'; then
    adds_useeffect=true
  fi
elif [ "$TOOL" = "Write" ]; then
  file_path=$(echo "$INPUT" | jq -r '.tool_input.file_path // "unknown file"')
  content=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
  # Only flag .ts/.tsx files that contain useEffect
  if [[ "$file_path" =~ \.(ts|tsx)$ ]] && echo "$content" | grep -q 'useEffect'; then
    adds_useeffect=true
  fi
fi

if [ "$adds_useeffect" = true ]; then
  jq -n --arg fp "$file_path" '{
    "hookSpecificOutput": {
      "hookEventName": "PostToolUse",
      "additionalContext": ("⚠️ USEEFFECT ADDED in " + $fp + ". You MUST now: (1) Tell the user you added a useEffect and explain WHY it is needed here instead of an alternative (useLiveQuery, useMutation, event handler, derived state, etc.). (2) Ask the user to confirm they are OK with it. (3) Make a mental note to include this useEffect (file + reason) in the commit message when you eventually commit.")
    }
  }'
else
  echo '{}'
fi
