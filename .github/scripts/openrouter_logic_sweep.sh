#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${OPENROUTER_API_KEY:-}" ]]; then
  echo "OPENROUTER_API_KEY is not set."
  exit 1
fi

if [[ -z "${OPENROUTER_MODEL:-}" ]]; then
  echo "OPENROUTER_MODEL is not set."
  exit 1
fi

# NOTE: Replace this prompt and payload shape with your preferred chain-sweep prompt/code.
PROMPT=${OPENROUTER_PROMPT:-"Run a logic-chain sweep over this repository and return: 1) contradictions, 2) weak assumptions, 3) concrete patch suggestions."}

RESPONSE_FILE="openrouter-logic-sweep.json"

curl -sS https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer ${OPENROUTER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @- <<JSON > "${RESPONSE_FILE}"
{
  "model": "${OPENROUTER_MODEL}",
  "messages": [
    {"role": "system", "content": "You are a senior code auditor performing rigorous logic-chain checks."},
    {"role": "user", "content": "${PROMPT}"}
  ],
  "temperature": 0.2
}
JSON

cat "${RESPONSE_FILE}"
