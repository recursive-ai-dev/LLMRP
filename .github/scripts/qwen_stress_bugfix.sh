#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${ALIBABA_API_KEY:-}" ]]; then
  echo "ALIBABA_API_KEY is not set."
  exit 1
fi

if [[ -z "${QWEN_MODEL:-}" ]]; then
  echo "QWEN_MODEL is not set."
  exit 1
fi

# NOTE: Replace with your preferred stress-test + bugfix prompt/code contract.
PROMPT=${QWEN_PROMPT:-"Stress test the codebase mentally and propose high-confidence bug fixes with diffs."}

RESPONSE_FILE="qwen-stress-bugfix.json"

curl -sS https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions \
  -H "Authorization: Bearer ${ALIBABA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @- <<JSON > "${RESPONSE_FILE}"
{
  "model": "${QWEN_MODEL}",
  "messages": [
    {"role": "system", "content": "You are an expert reliability engineer focused on stress-induced defects."},
    {"role": "user", "content": "${PROMPT}"}
  ],
  "temperature": 0.1
}
JSON

cat "${RESPONSE_FILE}"
