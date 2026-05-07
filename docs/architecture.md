# Architecture

`local-ai-preflight-kit` splits the workflow into four small parts.

## Probe

`scripts/ollama_probe.sh` checks a short list of local Ollama endpoints. The default candidates are loopback hosts. Operators can replace the candidate list through `LOCAL_AI_OLLAMA_HOSTS`.

The probe does not read project content. It only checks whether `/api/tags` responds.

## Summarize

`scripts/ollama_summarize.sh` reads stdin or an explicit input file, caps the text by byte count, and sends only that excerpt to a local Ollama API. It prints the returned summary to stdout and does not write the raw source text to disk.

## Preflight

`scripts/local-ai-preflight` resolves a git repository, gathers compact context, runs the probe, optionally asks for a summary, and writes:

```text
.local-ai-preflight/artifacts/YYYY-MM-DD/YYYYMMDDTHHMMSSZ/result.json
.local-ai-preflight/artifacts/YYYY-MM-DD/YYYYMMDDTHHMMSSZ/summary.md
```

The context is intentionally short:

- repository name
- UTC timestamp
- `git status --short`
- `git diff --stat`

When the artifact root is inside the repository, `latest/` is updated with a copy of the newest `result.json` and `summary.md`.

## Cleanup

`scripts/preflight-cleanup` scans date directories under a chosen artifact root. It ignores `latest/`, preserves today's directory, and only removes timestamped run directories after `--apply` is explicitly passed.

## Wrapper Examples

`examples/codex-shim` shows how to run preflight before executing a real CLI binary. The wrapper is an example, not an installer.

## Failure Modes

- If the target path is not a git repository, preflight exits before writing artifacts.
- If the local Ollama probe fails, preflight still writes `result.json` with `status: probe_failed`.
- If summarization fails after a successful probe, preflight writes `status: summarize_failed`.
- Cleanup refuses broad roots such as the filesystem root, the home directory, and `/tmp`.
