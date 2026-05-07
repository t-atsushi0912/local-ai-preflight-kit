#!/usr/bin/env bash
set -euo pipefail

TIMEOUT_SECONDS="${LOCAL_AI_PROBE_TIMEOUT_SECONDS:-3}"

usage() {
  cat <<'EOF'
usage: scripts/ollama_probe.sh [--help]

Checks local Ollama /api/tags endpoints and prints the selected host.

Environment:
  LOCAL_AI_OLLAMA_HOSTS          Space or comma separated host candidates.
  LOCAL_AI_PROBE_TIMEOUT_SECONDS Per-candidate timeout in seconds. Default: 3.
EOF
}

normalize_host() {
  local value="$1"
  value="${value%/}"
  if [[ -z "${value}" ]]; then
    return 1
  fi
  if [[ "${value}" != http://* && "${value}" != https://* ]]; then
    value="http://${value}"
  fi
  printf '%s\n' "${value}"
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -gt 0 ]]; then
  echo "ollama_probe.sh: unexpected argument: $1" >&2
  usage >&2
  exit 2
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "ollama_probe.sh: curl is required to probe Ollama." >&2
  exit 127
fi

raw_hosts="${LOCAL_AI_OLLAMA_HOSTS:-http://127.0.0.1:11434 http://localhost:11434}"
raw_hosts="${raw_hosts//,/ }"

for raw_host in ${raw_hosts}; do
  host="$(normalize_host "${raw_host}" || true)"
  if [[ -z "${host}" ]]; then
    continue
  fi
  if curl --silent --show-error --fail --max-time "${TIMEOUT_SECONDS}" \
    "${host}/api/tags" >/dev/null 2>&1; then
    printf 'selected_host=%s\n' "${host}"
    exit 0
  fi
done

echo "ollama_probe.sh: no local Ollama endpoint responded." >&2
exit 1
