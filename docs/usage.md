# Usage

## Build

```bash
npm install
npm run build
```

## TypeScript CLI を実行する

```bash
node dist/cli.js --repo . --no-summarize
```

artifact directory を明示する場合:

```bash
node dist/cli.js --repo . --no-summarize --artifact-dir /tmp/local-ai-preflight-run
```

artifact root を指定して timestamp 付き run directory を切る場合:

```bash
node dist/cli.js --repo . --artifact-root .local-ai-preflight/artifacts
```

context byte 上限を調整する場合:

```bash
node dist/cli.js --repo . --max-bytes 8000
```

`continue` は exit code `0`、`review` は `1`、`stop` は `2` です。

`schemas/result.schema.json` が `result.json` の契約です。`artifact_dir` はその run directory、`result_path` と `summary_path` はその実行環境で CLI が解決した path を記録します。機械判定は `result.json` を正本として扱い、stdout は短い実行案内に留めます。

TypeScript CLI は `LOCAL_AI_CONTEXT_MAX_BYTES`、`LOCAL_AI_OLLAMA_HOSTS`、`LOCAL_AI_OLLAMA_MODEL`、`LOCAL_AI_PROBE_TIMEOUT_SECONDS`、`LOCAL_AI_SUMMARY_TIMEOUT_SECONDS`、`LOCAL_AI_NUM_PREDICT` を読みます。

## Ollama を確認する

```bash
scripts/ollama_probe.sh
```

候補を上書きする場合:

```bash
LOCAL_AI_OLLAMA_HOSTS="http://localhost:11434" scripts/ollama_probe.sh
```

## Text を要約する

```bash
git status --short | scripts/ollama_summarize.sh
```

file を使う場合:

```bash
scripts/ollama_summarize.sh --input-file /path/to/context.txt
```

summary に渡す内容は短く保ち、機密値 は含めないでください。TypeScript 版の `summary.md` も `public_summary_v1` を通した短い確認用の内容だけを残します。

通常 test は mock endpoint で安定させます。real Ollama の任意 test を手元で動かす場合は `LOCAL_AI_RUN_REAL_OLLAMA_TESTS=1 LOCAL_AI_OLLAMA_HOSTS="http://127.0.0.1:11434" node --test tests/ts_preflight.real_ollama.test.js` を使います。local endpoint が未応答なら `not_available` 扱いで、通常の verify 条件には含めません。

## shell 参考実装を使う

```bash
scripts/local-ai-preflight --repo .
```

shell 版は参考実装です。主実装と契約の正本は TypeScript CLI 側を参照してください。

artifact root を変える場合:

```bash
LOCAL_AI_ARTIFACT_ROOT=".local-ai-preflight/artifacts" scripts/local-ai-preflight --repo .
```

ローカル endpoint の確認だけを行い、summary を省く場合:

```bash
node dist/cli.js --repo . --no-summarize
```

## Cleanup

dry-run:

```bash
scripts/preflight-cleanup --root .local-ai-preflight/artifacts --keep-days 14
```

apply:

```bash
scripts/preflight-cleanup --root .local-ai-preflight/artifacts --keep-days 14 --apply
```

JSON output:

```bash
scripts/preflight-cleanup --root .local-ai-preflight/artifacts --json
```

cleanup は既定で dry-run です。削除を実行するまで挙動を確認できます。

## Wrapper Example

`examples/codex-shim` では `CODEX_REAL_BIN` に実際の executable を指定します。TypeScript 版 preflight が `continue` を返したときだけ実 CLI を起動します。

```bash
CODEX_REAL_BIN="/path/to/codex" examples/codex-shim --help
```

## Environment Example

`examples/config.env.example` には代表的な設定を載せています。共有用の固定 profile ではなく、ローカル設定の template として使ってください。
