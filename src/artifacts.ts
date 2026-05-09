import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { ArtifactPaths, ResultArtifact } from "./types";

interface ArtifactPathOptions {
  artifactDir?: string;
  artifactRoot?: string;
  basePath: string;
  runDate: string;
  runId: string;
}

export function buildArtifactPaths(options: ArtifactPathOptions): ArtifactPaths {
  if (options.artifactDir && options.artifactRoot) {
    throw new Error("Use either artifactDir or artifactRoot, not both.");
  }

  if (options.artifactDir) {
    const artifactDir = path.resolve(options.artifactDir);
    const latestDir = path.join(artifactDir, "latest");
    return {
      artifactDir,
      resultPath: path.join(artifactDir, "result.json"),
      summaryPath: path.join(artifactDir, "summary.md"),
      latestDir,
      latestResultPath: path.join(latestDir, "result.json"),
      latestSummaryPath: path.join(latestDir, "summary.md"),
    };
  }

  const artifactRoot = path.resolve(
    options.artifactRoot || path.join(options.basePath, ".local-ai-preflight", "artifacts"),
  );
  const artifactDir = path.join(artifactRoot, options.runDate, options.runId);
  const latestDir = path.join(artifactRoot, "latest");

  return {
    artifactDir,
    resultPath: path.join(artifactDir, "result.json"),
    summaryPath: path.join(artifactDir, "summary.md"),
    latestDir,
    latestResultPath: path.join(latestDir, "result.json"),
    latestSummaryPath: path.join(latestDir, "summary.md"),
  };
}

export function writeArtifacts(
  artifactPaths: ArtifactPaths,
  artifact: ResultArtifact,
  summaryMarkdown: string,
): void {
  mkdirSync(artifactPaths.artifactDir, { recursive: true });
  writeFileSync(artifactPaths.resultPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  writeFileSync(artifactPaths.summaryPath, `${summaryMarkdown.trimEnd()}\n`, "utf8");

  mkdirSync(artifactPaths.latestDir, { recursive: true });
  cpSync(artifactPaths.resultPath, artifactPaths.latestResultPath);
  cpSync(artifactPaths.summaryPath, artifactPaths.latestSummaryPath);
}
