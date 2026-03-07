#!/usr/bin/env bash
set -euo pipefail

# CodRabbit preferred, fallback to Kilo Code.
if [[ -n "${CODRABBIT_API_KEY:-}" && -n "${CODRABBIT_MODEL:-}" ]]; then
  echo "Using CodRabbit polishing path"
  PROMPT=${POLISH_PROMPT:-"Polish readability, naming, docs, and maintainability without changing behavior."}
  curl -sS https://api.codrabbit.ai/v1/chat/completions \
    -H "Authorization: Bearer ${CODRABBIT_API_KEY}" \
    -H "Content-Type: application/json" \
    -d @- <<JSON > polishing-output.json
{
  "model": "${CODRABBIT_MODEL}",
  "messages": [
    {"role": "system", "content": "You are a code quality reviewer focused on polish and clarity."},
    {"role": "user", "content": "${PROMPT}"}
  ],
  "temperature": 0.2
}
JSON
  cat polishing-output.json
  exit 0
fi

if [[ -n "${KILO_API_KEY:-}" && -n "${KILO_MODEL:-}" ]]; then
  echo "CodRabbit not configured; using Kilo Code fallback"
  PROMPT=${POLISH_PROMPT:-"Polish readability, naming, docs, and maintainability without changing behavior."}
  curl -sS https://api.kilocode.ai/v1/chat/completions \
    -H "Authorization: Bearer ${KILO_API_KEY}" \
    -H "Content-Type: application/json" \
    -d @- <<JSON > polishing-output.json
{
  "model": "${KILO_MODEL}",
  "messages": [
    {"role": "system", "content": "You are a code quality reviewer focused on polish and clarity."},
    {"role": "user", "content": "${PROMPT}"}
  ],
  "temperature": 0.2
}
JSON
  cat polishing-output.json
  exit 0
fi

echo "Neither CodRabbit nor Kilo Code credentials/model are configured."
exit 1
