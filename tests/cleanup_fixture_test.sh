#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fixture="$(mktemp -d)"
trap 'rm -rf -- "${fixture}"' EXIT

artifact_root="${fixture}/artifacts"
old_date="$(date -u -d '30 days ago' +%F)"
today="$(date -u +%F)"
old_run="${artifact_root}/${old_date}/20000101T000000Z"
today_run="${artifact_root}/${today}/20000101T000000Z"
latest_dir="${artifact_root}/latest"

mkdir -p "${old_run}" "${today_run}" "${latest_dir}"
printf '{}\n' > "${old_run}/result.json"
printf '{}\n' > "${today_run}/result.json"
printf '{}\n' > "${latest_dir}/result.json"

"${ROOT_DIR}/scripts/preflight-cleanup" --root "${artifact_root}" --keep-days 14 >/tmp/local-ai-cleanup-dry-run.txt

if [[ ! -d "${old_run}" ]]; then
  echo "cleanup fixture: dry-run removed old run" >&2
  exit 1
fi

"${ROOT_DIR}/scripts/preflight-cleanup" --root "${artifact_root}" --keep-days 14 --apply >/tmp/local-ai-cleanup-apply.txt

if [[ -d "${old_run}" ]]; then
  echo "cleanup fixture: apply did not remove old run" >&2
  exit 1
fi
if [[ ! -d "${today_run}" ]]; then
  echo "cleanup fixture: today run was removed" >&2
  exit 1
fi
if [[ ! -d "${latest_dir}" ]]; then
  echo "cleanup fixture: latest directory was removed" >&2
  exit 1
fi

echo "cleanup fixture: ok"
