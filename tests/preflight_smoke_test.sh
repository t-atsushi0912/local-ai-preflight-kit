#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fixture="$(mktemp -d)"
trap 'rm -rf -- "${fixture}"' EXIT

bash -n \
  "${ROOT_DIR}/scripts/local-ai-preflight" \
  "${ROOT_DIR}/scripts/preflight-cleanup" \
  "${ROOT_DIR}/scripts/ollama_probe.sh" \
  "${ROOT_DIR}/scripts/ollama_summarize.sh" \
  "${ROOT_DIR}/examples/codex-shim"

"${ROOT_DIR}/scripts/ollama_probe.sh" --help >/dev/null
"${ROOT_DIR}/scripts/ollama_summarize.sh" --help >/dev/null
"${ROOT_DIR}/scripts/local-ai-preflight" --help >/dev/null
"${ROOT_DIR}/scripts/preflight-cleanup" --help >/dev/null

repo="${fixture}/repo"
artifact_root="${fixture}/artifacts"
mkdir -p "${repo}"
git -C "${repo}" init >/dev/null
printf 'hello\n' > "${repo}/README.md"
git -C "${repo}" add README.md >/dev/null
git -C "${repo}" -c user.name="Test User" -c user.email="test@example.invalid" commit -m "init" >/dev/null

LOCAL_AI_ARTIFACT_ROOT="${artifact_root}" "${ROOT_DIR}/scripts/local-ai-preflight" --repo "${repo}" >/tmp/local-ai-preflight-smoke.txt

if ! find "${artifact_root}" -name result.json -type f -print -quit | grep -q .; then
  echo "preflight smoke: result.json was not written" >&2
  exit 1
fi

echo "preflight smoke: ok"
