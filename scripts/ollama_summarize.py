#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="scripts/ollama_summarize.py",
        description="Summarize stdin or a file with a local Ollama endpoint.",
    )
    parser.add_argument("--input-file", type=Path)
    parser.add_argument("--host", default=os.environ.get("LOCAL_AI_OLLAMA_HOST", "http://127.0.0.1:11434"))
    parser.add_argument("--model", default=os.environ.get("LOCAL_AI_OLLAMA_MODEL", "gemma3:latest"))
    parser.add_argument("--max-bytes", type=int, default=int(os.environ.get("LOCAL_AI_CONTEXT_MAX_BYTES", "6000")))
    parser.add_argument("--num-predict", type=int, default=int(os.environ.get("LOCAL_AI_NUM_PREDICT", "96")))
    return parser.parse_args(argv)


def read_source(input_file: Path | None) -> str:
    if input_file is None:
        return sys.stdin.read()
    if not input_file.is_file():
        raise FileNotFoundError(f"ollama_summarize.py: input file not found: {input_file}")
    return input_file.read_text(encoding="utf-8")


def truncate_utf8(value: str, max_bytes: int) -> str:
    raw = value.encode("utf-8")
    if len(raw) <= max_bytes:
        return value
    return raw[:max_bytes].decode("utf-8", errors="ignore")


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.max_bytes < 0 or args.num_predict < 0:
        print("ollama_summarize.py: byte and prediction limits must be non-negative integers.", file=sys.stderr)
        return 2

    try:
        source = read_source(args.input_file)
    except OSError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    excerpt = truncate_utf8(source, args.max_bytes)
    request_payload = {
        "model": args.model,
        "stream": False,
        "options": {
            "temperature": 0,
            "num_predict": args.num_predict,
        },
        "prompt": json.dumps(
            {
                "instruction": "Return a compact operational summary. Do not echo the source text.",
                "text": excerpt,
                "truncated": len(source.encode("utf-8")) > len(excerpt.encode("utf-8")),
            },
            ensure_ascii=False,
        ),
    }
    request = urllib.request.Request(
        f"{args.host.rstrip('/')}/api/generate",
        data=json.dumps(request_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    timeout_seconds = int(os.environ.get("LOCAL_AI_SUMMARY_TIMEOUT_SECONDS", "20"))
    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            response_payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        print(f"ollama_summarize.py: local summarize request failed: {type(exc).__name__}", file=sys.stderr)
        return 1

    summary = str(response_payload.get("response") or "").strip()
    if not summary:
        print("ollama_summarize.py: local summarize response was empty.", file=sys.stderr)
        return 1

    print(summary)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
