# local-ai-preflight-kit

`local-ai-preflight-kit` is a small set of shell scripts for running a local AI check before starting a larger AI CLI session.

The kit keeps the workflow local. It gathers compact git context, probes a local Ollama endpoint, writes small run artifacts, and leaves the caller with a short summary that can be reviewed before continuing.

## What It Provides

- `scripts/ollama_probe.sh`: checks local Ollama `/api/tags` candidates.
- `scripts/ollama_summarize.sh`: summarizes stdin or a file through a local Ollama API.
- `scripts/local-ai-preflight`: captures compact git context and writes preflight artifacts.
- `scripts/preflight-cleanup`: trims old preflight run directories with dry-run as the default.
- `examples/codex-shim`: example wrapper that runs preflight before a real CLI binary.

## Usage

Run directly after cloning:

```bash
scripts/ollama_probe.sh
scripts/local-ai-preflight --repo .
scripts/preflight-cleanup --root .local-ai-preflight/artifacts --dry-run
```

The default preflight artifact root is:

```text
.local-ai-preflight/artifacts/
```

This directory is ignored by git.

## Configuration

Copy the example environment file only if you want local overrides:

```bash
cp examples/config.env.example .env
```

Then adjust values for your machine. The scripts work without that file when Ollama is available at the default local endpoints.

## Cleanup

Cleanup is dry-run unless `--apply` is passed:

```bash
scripts/preflight-cleanup --root .local-ai-preflight/artifacts --keep-days 14
scripts/preflight-cleanup --root .local-ai-preflight/artifacts --keep-days 14 --apply
```

`latest/` and today's run directory are preserved.

## CI

The included workflow checks shell syntax, help output, fixture cleanup behavior, preflight smoke behavior, and public-safety scans.

## Safety Notes

- Do not pass sensitive values in summaries, commands, or prompts.
- Do not publish generated artifacts.
- The scripts only target local Ollama endpoints by default.
- Keep `.local-ai-preflight/` out of version control.

## Non-goals

- Remote ingestion
- Background daemons
- Full terminal transcript capture
- Replacement for project documentation or test results
