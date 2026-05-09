export const SCHEMA_VERSION = "1";

export type Decision = "continue" | "review" | "stop";

export type PreflightStatus =
  | "ok"
  | "not_git_repo"
  | "probe_failed"
  | "summarize_failed";

export interface CliOptions {
  repoPath: string;
  artifactDir?: string;
  artifactRoot?: string;
  maxBytes: number;
  noSummarize: boolean;
  toolVersion: string;
}

export interface RepoContext {
  repoName: string;
  repoRoot: string;
  context: string;
  contextBytes: number;
  statusCount: number;
  diffStatCount: number;
}

export interface ProbeResult {
  ok: boolean;
  selectedHost?: string;
}

export interface SummaryResult {
  ok: boolean;
  summary?: string;
}

export interface ArtifactPaths {
  artifactDir: string;
  resultPath: string;
  summaryPath: string;
  latestDir: string;
  latestResultPath: string;
  latestSummaryPath: string;
}

export interface ResultArtifact {
  schema_version: string;
  tool_version: string;
  decision: Decision;
  exit_code: number;
  status: PreflightStatus;
  reasons: string[];
  artifact_dir: string;
  summary_path: string;
  result_path: string;
  created_at: string;
  repo_name: string | null;
  run_id: string;
}

export interface PreflightRunResult {
  artifact: ResultArtifact;
  summaryMarkdown: string;
  artifactPaths: ArtifactPaths;
}
