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

`continue` は exit code `0`、`review` は `1`、`stop` は `2` です。

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

summary に渡す内容は短く保ち、機密値 は含めないでください。TypeScript 版の `summary.md` も短い確認用の内容だけを残します。

## Preflight を実行する

```bash
scripts/local-ai-preflight --repo .
```

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
