import path from "node:path";

import { buildArtifactPaths, writeArtifacts } from "./artifacts";
import { buildRepoContext, resolveRepoRoot } from "./git";
import { probeOllama, summarizeContext } from "./ollama";
import { sanitizeSummaryForArtifact } from "./summary_safety";
import {
  DECISION,
  EXIT_CODE_BY_DECISION,
  PREFLIGHT_REASON,
  PREFLIGHT_STATUS,
  RESULT_REASON_SETS,
  SCHEMA_VERSION,
  type CliOptions,
  type Decision,
  type PreflightRunResult,
  type PreflightReason,
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

function renderSummaryMarkdown(
  decision: Decision,
  status: PreflightStatus,
  reasons: PreflightReason[],
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
  reasons: PreflightReason[],
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
  return EXIT_CODE_BY_DECISION[decision];
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
  let reasons: PreflightReason[];
  let repoContext: RepoContext | null = null;
  let safeSummary = "";

  if (!repoRoot) {
    decision = DECISION.STOP;
    status = PREFLIGHT_STATUS.NOT_GIT_REPO;
    reasons = [...RESULT_REASON_SETS.NOT_GIT_REPO];
    safeSummary = "The target path is not inside a git repository.";
  } else {
    repoContext = buildRepoContext(repoRoot, options.maxBytes);
    const probe = await probeOllama();

    if (!probe.ok || !probe.selectedHost) {
      decision = DECISION.REVIEW;
      status = PREFLIGHT_STATUS.PROBE_FAILED;
      reasons = [...RESULT_REASON_SETS.PROBE_FAILED];
      safeSummary = "Local model probe did not complete. Review the environment before continuing.";
    } else if (options.noSummarize) {
      decision = DECISION.CONTINUE;
      status = PREFLIGHT_STATUS.OK;
      reasons = [...RESULT_REASON_SETS.SUMMARY_SKIPPED];
      safeSummary = "Preflight completed without the summary step.";
    } else {
      const summaryResult = await summarizeContext(repoContext.context, probe.selectedHost, options.maxBytes);

      if (!summaryResult.ok || !summaryResult.summary) {
        decision = DECISION.REVIEW;
        status = PREFLIGHT_STATUS.SUMMARIZE_FAILED;
        reasons = [...RESULT_REASON_SETS.SUMMARIZE_FAILED];
        safeSummary = "Summary generation did not complete. Review before continuing.";
      } else {
        decision = DECISION.CONTINUE;
        status = PREFLIGHT_STATUS.OK;
        reasons = [...RESULT_REASON_SETS.SUMMARY_CREATED];
        safeSummary = sanitizeSummaryForArtifact(summaryResult.summary);
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
