# Security

This kit is designed for local preflight checks. It does not make project data public by itself, but the operator controls what text is provided to the scripts.

## Input Rules

- Pass short operational context, not full transcripts.
- Keep credentials and private customer data out of summaries and command text.
- Review generated artifacts before sharing any repository or archive.

## Artifact Rules

- Generated artifacts belong under `.local-ai-preflight/` by default.
- `.local-ai-preflight/` is ignored by git.
- Do not commit generated run output.

## Endpoint Rules

- Default endpoints are loopback-only.
- `LOCAL_AI_OLLAMA_HOSTS` can override endpoint candidates.
- Treat non-loopback overrides as an explicit local policy decision.

## Cleanup Rules

- Cleanup defaults to dry-run.
- `--apply` is required before removal.
- Broad roots are refused.
- Fixture tests cover old runs, today's runs, and `latest/`.

## Path Rules

- Public docs should use placeholders and repo-relative paths.
- Avoid fixed machine paths in committed examples.
- Keep local wrapper paths in local configuration files, not in the shared repository.
