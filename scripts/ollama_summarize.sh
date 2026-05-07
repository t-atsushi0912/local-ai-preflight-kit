#!/usr/bin/env bash
set -euo pipefail

INPUT_FILE=""
HOST="${LOCAL_AI_OLLAMA_HOST:-http://127.0.0.1:11434}"
MODEL="${LOCAL_AI_OLLAMA_MODEL:-gemma3:latest}"
MAX_BYTES="${LOCAL_AI_CONTEXT_MAX_BYTES:-6000}"
NUM_PREDICT="${LOCAL_AI_NUM_PREDICT:-96}"
TIMEOUT_SECONDS="${LOCAL_AI_SUMMARY_TIMEOUT_SECONDS:-20}"

usage() {
  cat <<'EOF'
usage: scripts/ollama_summarize.sh [--input-file PATH] [--host URL] [--model NAME] [--max-bytes N] [--num-predict N]

Reads text from stdin or --input-file and asks a local Ollama endpoint for a compact summary.

Environment:
  LOCAL_AI_OLLAMA_HOST
  LOCAL_AI_OLLAMA_MODEL
  LOCAL_AI_CONTEXT_MAX_BYTES
  LOCAL_AI_NUM_PREDICT
  LOCAL_AI_SUMMARY_TIMEOUT_SECONDS
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --input-file)
      INPUT_FILE="$2"
      shift 2
      ;;
    --host)
      HOST="$2"
      shift 2
      ;;
    --model)
      MODEL="$2"
      shift 2
      ;;
    --max-bytes)
      MAX_BYTES="$2"
      shift 2
      ;;
    --num-predict)
      NUM_PREDICT="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ollama_summarize.sh: unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if ! [[ "${MAX_BYTES}" =~ ^[0-9]+$ && "${NUM_PREDICT}" =~ ^[0-9]+$ ]]; then
  echo "ollama_summarize.sh: byte and prediction limits must be non-negative integers." >&2
  exit 2
fi

if [[ -n "${INPUT_FILE}" && ! -f "${INPUT_FILE}" ]]; then
  echo "ollama_summarize.sh: input file not found: ${INPUT_FILE}" >&2
  exit 1
fi

if [[ -n "${INPUT_FILE}" ]]; then
  SOURCE_TEXT="$(cat "${INPUT_FILE}")"
else
  SOURCE_TEXT="$(cat)"
fi
export LOCAL_AI_SOURCE_TEXT="${SOURCE_TEXT}"

python3 - "${HOST}" "${MODEL}" "${MAX_BYTES}" "${NUM_PREDICT}" "${TIMEOUT_SECONDS}" <<'PY'
import json
import os
import sys
import urllib.error
import urllib.request

host, model, max_bytes, num_predict, timeout_seconds = sys.argv[1:]
source = os.environ.get("LOCAL_AI_SOURCE_TEXT", "")
excerpt = source.encode("utf-8")[: int(max_bytes)].decode("utf-8", errors="ignore")

request_payload = {
    "model": model,
    "stream": False,
    "options": {
        "temperature": 0,
        "num_predict": int(num_predict),
    },
    "prompt": json.dumps(
        {
            "instruction": "Return a compact operational summary. Do not echo the source text.",
            "text": excerpt,
            "truncated": len(source.encode("utf-8")) > len(excerpt.encode("utf-8")),
        },
        ensure_ascii=False,
    ),
}

request = urllib.request.Request(
    f"{host.rstrip('/')}/api/generate",
    data=json.dumps(request_payload).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST",
)

try:
    with urllib.request.urlopen(request, timeout=int(timeout_seconds)) as response:
        response_payload = json.loads(response.read().decode("utf-8"))
except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
    print(f"ollama_summarize.sh: local summarize request failed: {type(exc).__name__}", file=sys.stderr)
    raise SystemExit(1)

summary = str(response_payload.get("response") or "").strip()
if not summary:
    print("ollama_summarize.sh: local summarize response was empty.", file=sys.stderr)
    raise SystemExit(1)
print(summary)
PY
