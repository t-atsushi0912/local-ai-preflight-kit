# Usage

## Probe Ollama

```bash
scripts/ollama_probe.sh
```

Override candidates:

```bash
LOCAL_AI_OLLAMA_HOSTS="http://127.0.0.1:11434 http://localhost:11434" scripts/ollama_probe.sh
```

## Summarize Text

```bash
git status --short | scripts/ollama_summarize.sh
```

Use a file:

```bash
scripts/ollama_summarize.sh --input-file /path/to/context.txt
```

Choose a model:

```bash
LOCAL_AI_OLLAMA_MODEL="gemma3:latest" scripts/ollama_summarize.sh --input-file /path/to/context.txt
```

## Run Preflight

```bash
scripts/local-ai-preflight --repo .
```

Use a custom artifact root:

```bash
LOCAL_AI_ARTIFACT_ROOT=".local-ai-preflight/artifacts" scripts/local-ai-preflight --repo .
```

Skip summarization while still checking the local endpoint:

```bash
scripts/local-ai-preflight --repo . --no-summarize
```

## Cleanup

Dry-run:

```bash
scripts/preflight-cleanup --root .local-ai-preflight/artifacts --keep-days 14
```

Apply:

```bash
scripts/preflight-cleanup --root .local-ai-preflight/artifacts --keep-days 14 --apply
```

JSON output:

```bash
scripts/preflight-cleanup --root .local-ai-preflight/artifacts --json
```

## Wrapper Example

`examples/codex-shim` expects `CODEX_REAL_BIN` to point to the real executable.

```bash
CODEX_REAL_BIN="/path/to/codex" examples/codex-shim --help
```

## Environment Example

`examples/config.env.example` lists common settings. Use it as a template for local configuration, not as a committed machine profile.
