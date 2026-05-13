#!/usr/bin/env python3
from __future__ import annotations

import os
import subprocess
import tempfile
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]


def run(args: list[str], *, env: dict[str, str] | None = None, stdout: object | None = subprocess.DEVNULL) -> None:
    subprocess.run(args, cwd=ROOT_DIR, env=env, stdout=stdout, check=True)


def main() -> int:
    with tempfile.TemporaryDirectory() as temp_dir:
        fixture = Path(temp_dir)
        repo = fixture / "repo"
        artifact_root = fixture / "artifacts"
        repo.mkdir()

        run(["python3", "-m", "py_compile", "scripts/ollama_probe.py", "scripts/ollama_summarize.py"])
        run(["bash", "-n", "scripts/local-ai-preflight", "scripts/preflight-cleanup", "examples/codex-shim"])
        run(["python3", "scripts/ollama_probe.py", "--help"])
        run(["python3", "scripts/ollama_summarize.py", "--help"])
        run(["scripts/local-ai-preflight", "--help"])
        run(["scripts/preflight-cleanup", "--help"])

        run(["git", "-C", str(repo), "init"])
        (repo / "README.md").write_text("hello\n", encoding="utf-8")
        run(["git", "-C", str(repo), "add", "README.md"])
        run(
            [
                "git",
                "-C",
                str(repo),
                "-c",
                "user.name=Test User",
                "-c",
                "user.email=test@example.invalid",
                "commit",
                "-m",
                "init",
            ]
        )

        env = {
            **os.environ,
            "LOCAL_AI_ARTIFACT_ROOT": str(artifact_root),
        }
        run(["scripts/local-ai-preflight", "--repo", str(repo)], env=env)

        if not next(artifact_root.rglob("result.json"), None):
            raise AssertionError("preflight smoke: result.json was not written")

    print("preflight smoke: ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
