# Usage

## Ollama を確認する

```bash
scripts/ollama_probe.sh
```

候補を上書きする場合:

```bash
LOCAL_AI_OLLAMA_HOSTS="http://127.0.0.1:11434 http://localhost:11434" scripts/ollama_probe.sh
```

## Text を要約する

```bash
git status --short | scripts/ollama_summarize.sh
```

file を使う場合:

```bash
scripts/ollama_summarize.sh --input-file /path/to/context.txt
```

model を選ぶ場合:

```bash
LOCAL_AI_OLLAMA_MODEL="gemma3:latest" scripts/ollama_summarize.sh --input-file /path/to/context.txt
```

summary に渡す内容は短く保ち、secret は含めないでください。

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
scripts/local-ai-preflight --repo . --no-summarize
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

`examples/codex-shim` では `CODEX_REAL_BIN` に実際の executable を指定します。

```bash
CODEX_REAL_BIN="/path/to/codex" examples/codex-shim --help
```

## Environment Example

`examples/config.env.example` には代表的な設定を載せています。共有用の固定 profile ではなく、ローカル設定の template として使ってください。
