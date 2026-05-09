import { spawnSync } from "node:child_process";
import path from "node:path";

import type { RepoContext } from "./types";

function runGit(repoPath: string, args: string[]): { ok: boolean; stdout: string } {
  const result = spawnSync("git", ["-C", repoPath, ...args], {
    encoding: "utf8",
  });

  return {
    ok: result.status === 0,
    stdout: (result.stdout || "").trimEnd(),
  };
}

function truncateUtf8(value: string, maxBytes: number): string {
  const buffer = Buffer.from(value, "utf8");
  if (buffer.byteLength <= maxBytes) {
    return value;
  }

  let truncated = buffer.subarray(0, maxBytes).toString("utf8");
  while (Buffer.byteLength(truncated, "utf8") > maxBytes) {
    truncated = truncated.slice(0, -1);
  }
  return truncated;
}

function countLines(value: string): number {
  if (!value.trim()) {
    return 0;
  }
  return value.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
}

export function resolveRepoRoot(repoPath: string): string | null {
  const result = runGit(repoPath, ["rev-parse", "--show-toplevel"]);
  if (!result.ok || !result.stdout) {
    return null;
  }

  return path.resolve(result.stdout);
}

export function buildRepoContext(repoRoot: string, maxBytes: number): RepoContext {
  const repoName = path.basename(repoRoot);
  const statusShort = runGit(repoRoot, ["status", "--short"]).stdout;
  const diffStat = runGit(repoRoot, ["diff", "--stat", "--no-ext-diff"]).stdout;
  const context = truncateUtf8(
    [
      `repo_name: ${repoName}`,
      `timestamp_utc: ${new Date().toISOString()}`,
      "",
      "## git status --short",
      statusShort,
      "",
      "## git diff --stat",
      diffStat,
    ].join("\n"),
    maxBytes,
  );

  return {
    repoName,
    repoRoot,
    context,
    contextBytes: Buffer.byteLength(context, "utf8"),
    statusCount: countLines(statusShort),
    diffStatCount: countLines(diffStat),
  };
}
