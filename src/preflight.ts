import path from "node:path";

import { buildArtifactPaths, writeArtifacts } from "./artifacts";
import { buildRepoContext, resolveRepoRoot } from "./git";
import { probeOllama, summarizeContext } from "./ollama";
import {
  SCHEMA_VERSION,
  type CliOptions,
  type Decision,
  type PreflightRunResult,
  type PreflightStatus,
  type RepoContext,
  type ResultArtifact,
} from "./types";

function formatDateParts(now: Date): { createdAt: string; runDate: string; runId: string } {
  const iso = now.toISOString();
  return {
    createdAt: iso,
    runDate: iso.slice(0, 10),
    runId: iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z"),
  };
}

function sanitizeSummary(value: string): string {
  return value
    .replace(/[A-Za-z]:\\[^\s)]+/g, "[redacted-path]")
    .replace(/\/[^\s)]+(?:\/[^\s)]+)+/g, "[redacted-path]")
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "[redacted-host]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

function renderSummaryMarkdown(
  decision: Decision,
  status: PreflightStatus,
  reasons: string[],
  repoContext: RepoContext | null,
  safeSummary: string,
): string {
  const summaryLine = safeSummary || "No additional summary was produced.";
  const repoLine = repoContext ? `- Repo: ${repoContext.repoName}` : "- Repo: unavailable";
  const statusDetail = repoContext
    ? `- Changes: status_lines=${repoContext.statusCount}, diff_stat_lines=${repoContext.diffStatCount}`
    : "- Changes: unavailable";

  return [
    "# Local AI Preflight",
    "",
    `- Decision: ${decision}`,
    `- Status: ${status}`,
    `- Reasons: ${reasons.join(", ")}`,
    repoLine,
    statusDetail,
    "",
    "## Summary",
    `- ${summaryLine}`,
  ].join("\n");
}

function buildArtifact(
  options: CliOptions,
  createdAt: string,
  runId: string,
  decision: Decision,
  exitCode: number,
  status: PreflightStatus,
  reasons: string[],
  repoName: string | null,
  artifactDir: string,
  summaryPath: string,
  resultPath: string,
): ResultArtifact {
  return {
    schema_version: SCHEMA_VERSION,
    tool_version: options.toolVersion,
    decision,
    exit_code: exitCode,
    status,
    reasons,
    artifact_dir: artifactDir,
    summary_path: summaryPath,
    result_path: resultPath,
    created_at: createdAt,
    repo_name: repoName,
    run_id: runId,
  };
}

function toExitCode(decision: Decision): number {
  switch (decision) {
    case "continue":
      return 0;
    case "review":
      return 1;
    case "stop":
      return 2;
  }
}

export async function runPreflight(options: CliOptions): Promise<PreflightRunResult> {
  const now = new Date();
  const { createdAt, runDate, runId } = formatDateParts(now);
  const repoInput = path.resolve(options.repoPath);
  const repoRoot = resolveRepoRoot(repoInput);
  const basePath = repoRoot || repoInput;
  const artifactPaths = buildArtifactPaths({
    artifactDir: options.artifactDir,
    artifactRoot: options.artifactRoot,
    basePath,
    runDate,
    runId,
  });

  let decision: Decision;
  let status: PreflightStatus;
  let reasons: string[];
  let repoContext: RepoContext | null = null;
  let safeSummary = "";

  if (!repoRoot) {
    decision = "stop";
    status = "not_git_repo";
    reasons = ["not_git_repo"];
    safeSummary = "The target path is not inside a git repository.";
  } else {
    repoContext = buildRepoContext(repoRoot, options.maxBytes);
    const probe = await probeOllama();

    if (!probe.ok || !probe.selectedHost) {
      decision = "review";
      status = "probe_failed";
      reasons = ["git_repo", "ollama_probe_failed"];
      safeSummary = "Local model probe did not complete. Review the environment before continuing.";
    } else if (options.noSummarize) {
      decision = "continue";
      status = "ok";
      reasons = ["git_repo", "ollama_probe_ok", "summary_skipped"];
      safeSummary = "Preflight completed without the summary step.";
    } else {
      const summaryResult = await summarizeContext(repoContext.context, probe.selectedHost, options.maxBytes);

      if (!summaryResult.ok || !summaryResult.summary) {
        decision = "review";
        status = "summarize_failed";
        reasons = ["git_repo", "ollama_probe_ok", "summarize_failed"];
        safeSummary = "Summary generation did not complete. Review before continuing.";
      } else {
        decision = "continue";
        status = "ok";
        reasons = ["git_repo", "ollama_probe_ok", "summary_created"];
        safeSummary = sanitizeSummary(summaryResult.summary);
      }
    }
  }

  const exitCode = toExitCode(decision);
  const artifact = buildArtifact(
    options,
    createdAt,
    runId,
    decision,
    exitCode,
    status,
    reasons,
    repoContext?.repoName || null,
    artifactPaths.artifactDir,
    artifactPaths.summaryPath,
    artifactPaths.resultPath,
  );
  const summaryMarkdown = renderSummaryMarkdown(decision, status, reasons, repoContext, safeSummary);

  writeArtifacts(artifactPaths, artifact, summaryMarkdown);

  return {
    artifact,
    summaryMarkdown,
    artifactPaths,
  };
}
