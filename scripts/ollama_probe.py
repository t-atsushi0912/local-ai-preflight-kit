#!/usr/bin/env python3
from __future__ import annotations

import os
import sys
import urllib.error
import urllib.request
from urllib.parse import urlparse


DEFAULT_HOSTS = "http://127.0.0.1:11434 http://localhost:11434"


def usage(stdout: object = sys.stdout) -> None:
    print(
        """usage: scripts/ollama_probe.py [--help]

Checks local Ollama /api/tags endpoints and prints the selected host.

Environment:
  LOCAL_AI_OLLAMA_HOSTS          Space or comma separated host candidates.
  LOCAL_AI_PROBE_TIMEOUT_SECONDS Per-candidate timeout in seconds. Default: 3.""",
        file=stdout,
    )


def normalize_host(value: str) -> str | None:
    trimmed = value.strip().rstrip("/")
    if not trimmed:
        return None
    candidate = trimmed if trimmed.startswith(("http://", "https://")) else f"http://{trimmed}"
    parsed = urlparse(candidate)
    if not parsed.scheme or not parsed.netloc:
        return None
    return candidate


def host_candidates() -> list[str]:
    raw_hosts = os.environ.get("LOCAL_AI_OLLAMA_HOSTS", DEFAULT_HOSTS).replace(",", " ")
    return [host for item in raw_hosts.split() if (host := normalize_host(item))]


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if args and args[0] in {"-h", "--help"}:
        usage()
        return 0
    if args:
        print(f"ollama_probe.py: unexpected argument: {args[0]}", file=sys.stderr)
        usage(sys.stderr)
        return 2

    timeout_seconds = float(os.environ.get("LOCAL_AI_PROBE_TIMEOUT_SECONDS", "3"))
    for host in host_candidates():
        request = urllib.request.Request(f"{host}/api/tags", method="GET")
        try:
            with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
                if 200 <= response.status < 300:
                    print(f"selected_host={host}")
                    return 0
        except (OSError, TimeoutError, urllib.error.URLError):
            continue

    print("ollama_probe.py: no local Ollama endpoint responded.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
