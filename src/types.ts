export const SCHEMA_VERSION = "1";

export const DECISION = {
  CONTINUE: "continue",
  REVIEW: "review",
  STOP: "stop",
} as const;

export type Decision = (typeof DECISION)[keyof typeof DECISION];

export const DECISION_VALUES = Object.values(DECISION) as Decision[];

export const EXIT_CODE_BY_DECISION: Record<Decision, number> = {
  [DECISION.CONTINUE]: 0,
  [DECISION.REVIEW]: 1,
  [DECISION.STOP]: 2,
};

export const PREFLIGHT_STATUS = {
  OK: "ok",
  NOT_GIT_REPO: "not_git_repo",
  PROBE_FAILED: "probe_failed",
  SUMMARIZE_FAILED: "summarize_failed",
} as const;

export type PreflightStatus = (typeof PREFLIGHT_STATUS)[keyof typeof PREFLIGHT_STATUS];

export const PREFLIGHT_STATUS_VALUES = Object.values(PREFLIGHT_STATUS) as PreflightStatus[];

export const PREFLIGHT_REASON = {
  NOT_GIT_REPO: "not_git_repo",
  GIT_REPO: "git_repo",
  OLLAMA_PROBE_FAILED: "ollama_probe_failed",
  OLLAMA_PROBE_OK: "ollama_probe_ok",
  SUMMARY_SKIPPED: "summary_skipped",
  SUMMARIZE_FAILED: "summarize_failed",
  SUMMARY_CREATED: "summary_created",
} as const;

export type PreflightReason = (typeof PREFLIGHT_REASON)[keyof typeof PREFLIGHT_REASON];

export const PREFLIGHT_REASON_VALUES = Object.values(PREFLIGHT_REASON) as PreflightReason[];

export const RESULT_REASON_SETS = {
  NOT_GIT_REPO: [PREFLIGHT_REASON.NOT_GIT_REPO],
  PROBE_FAILED: [PREFLIGHT_REASON.GIT_REPO, PREFLIGHT_REASON.OLLAMA_PROBE_FAILED],
  SUMMARY_SKIPPED: [
    PREFLIGHT_REASON.GIT_REPO,
    PREFLIGHT_REASON.OLLAMA_PROBE_OK,
    PREFLIGHT_REASON.SUMMARY_SKIPPED,
  ],
  SUMMARIZE_FAILED: [
    PREFLIGHT_REASON.GIT_REPO,
    PREFLIGHT_REASON.OLLAMA_PROBE_OK,
    PREFLIGHT_REASON.SUMMARIZE_FAILED,
  ],
  SUMMARY_CREATED: [
    PREFLIGHT_REASON.GIT_REPO,
    PREFLIGHT_REASON.OLLAMA_PROBE_OK,
    PREFLIGHT_REASON.SUMMARY_CREATED,
  ],
} as const satisfies Record<string, readonly PreflightReason[]>;

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
  reasons: PreflightReason[];
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
