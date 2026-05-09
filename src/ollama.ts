import type { ProbeResult, SummaryResult } from "./types";

const DEFAULT_HOSTS = ["http://127.0.0.1:11434", "http://localhost:11434"];
const DEFAULT_MODEL = "gemma3:latest";
const DEFAULT_PROBE_TIMEOUT_MS = 3_000;
const DEFAULT_SUMMARY_TIMEOUT_MS = 20_000;
const DEFAULT_NUM_PREDICT = 96;

function normalizeHost(value: string): string | null {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return null;
  }

  const candidate = /^https?:\/\//.test(trimmed) ? trimmed : `http://${trimmed}`;
  try {
    return new URL(candidate).toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function getHostCandidates(): string[] {
  const rawHosts = process.env.LOCAL_AI_OLLAMA_HOSTS;
  const source = rawHosts ? rawHosts.split(/[\s,]+/) : DEFAULT_HOSTS;
  return source
    .map(normalizeHost)
    .filter((host): host is string => Boolean(host));
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

export async function probeOllama(): Promise<ProbeResult> {
  const timeoutMs = Number(process.env.LOCAL_AI_PROBE_TIMEOUT_SECONDS || "3") * 1_000;

  for (const host of getHostCandidates()) {
    try {
      const response = await fetch(`${host}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(
          Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_PROBE_TIMEOUT_MS,
        ),
      });
      if (response.ok) {
        return {
          ok: true,
          selectedHost: host,
        };
      }
    } catch {
      // Probe falls through to the next candidate.
    }
  }

  return {
    ok: false,
  };
}

export async function summarizeContext(
  sourceText: string,
  selectedHost: string,
  maxBytes: number,
): Promise<SummaryResult> {
  const model = process.env.LOCAL_AI_OLLAMA_MODEL || DEFAULT_MODEL;
  const timeoutMs =
    Number(process.env.LOCAL_AI_SUMMARY_TIMEOUT_SECONDS || "20") * 1_000 || DEFAULT_SUMMARY_TIMEOUT_MS;
  const numPredict = Number(process.env.LOCAL_AI_NUM_PREDICT || `${DEFAULT_NUM_PREDICT}`);
  const excerpt = truncateUtf8(sourceText, maxBytes);

  const payload = {
    model,
    stream: false,
    options: {
      temperature: 0,
      num_predict: Number.isFinite(numPredict) && numPredict >= 0 ? numPredict : DEFAULT_NUM_PREDICT,
    },
    prompt: JSON.stringify(
      {
        instruction:
          "Return a compact operational summary. Avoid reproducing raw file names, raw paths, or confidential values.",
        text: excerpt,
        truncated: Buffer.byteLength(sourceText, "utf8") > Buffer.byteLength(excerpt, "utf8"),
      },
      null,
      0,
    ),
  };

  try {
    const response = await fetch(`${selectedHost}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs > 0 ? timeoutMs : DEFAULT_SUMMARY_TIMEOUT_MS),
    });

    if (!response.ok) {
      return { ok: false };
    }

    const data = (await response.json()) as { response?: unknown };
    const summary = typeof data.response === "string" ? data.response.trim() : "";
    if (!summary) {
      return { ok: false };
    }

    return {
      ok: true,
      summary,
    };
  } catch {
    return {
      ok: false,
    };
  }
}
