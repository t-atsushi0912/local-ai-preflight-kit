#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";

import { runPreflight } from "./preflight";
import type { CliOptions } from "./types";

function usage(): string {
  return [
    "usage: local-ai-preflight [--repo PATH] [--artifact-dir PATH | --artifact-root PATH] [--max-bytes N] [--no-summarize] [--version]",
    "",
    "Runs a local preflight gate and writes result.json plus summary.md.",
  ].join("\n");
}

function readToolVersion(): string {
  const packageJsonPath = path.resolve(__dirname, "..", "package.json");
  const raw = readFileSync(packageJsonPath, "utf8");
  const parsed = JSON.parse(raw) as { version?: string };
  return parsed.version || "0.0.0";
}

function parseArgs(argv: string[], toolVersion: string): CliOptions {
  const options: CliOptions = {
    repoPath: process.cwd(),
    maxBytes: Number(process.env.LOCAL_AI_CONTEXT_MAX_BYTES || "6000"),
    noSummarize: false,
    toolVersion,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    switch (current) {
      case "--repo":
        index += 1;
        if (!argv[index]) {
          throw new Error("missing value for --repo");
        }
        options.repoPath = argv[index];
        break;
      case "--artifact-dir":
        index += 1;
        if (!argv[index]) {
          throw new Error("missing value for --artifact-dir");
        }
        options.artifactDir = argv[index];
        break;
      case "--artifact-root":
        index += 1;
        if (!argv[index]) {
          throw new Error("missing value for --artifact-root");
        }
        options.artifactRoot = argv[index];
        break;
      case "--max-bytes":
        index += 1;
        if (!argv[index]) {
          throw new Error("missing value for --max-bytes");
        }
        options.maxBytes = Number(argv[index]);
        break;
      case "--no-summarize":
        options.noSummarize = true;
        break;
      case "-h":
      case "--help":
        process.stdout.write(`${usage()}\n`);
        process.exit(0);
      case "-v":
      case "--version":
        process.stdout.write(`${toolVersion}\n`);
        process.exit(0);
      default:
        throw new Error(`unexpected argument: ${current}`);
    }
  }

  if (!Number.isInteger(options.maxBytes) || options.maxBytes < 0) {
    throw new Error("--max-bytes must be a non-negative integer");
  }
  if (options.artifactDir && options.artifactRoot) {
    throw new Error("use either --artifact-dir or --artifact-root");
  }

  return options;
}

async function main(): Promise<void> {
  const toolVersion = readToolVersion();
  const options = parseArgs(process.argv.slice(2), toolVersion);
  const result = await runPreflight(options);

  process.stdout.write(`decision=${result.artifact.decision}\n`);
  process.stdout.write(`result=${result.artifact.result_path}\n`);
  process.stdout.write(`summary=${result.artifact.summary_path}\n`);
  process.exit(result.artifact.exit_code);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unexpected failure";
  process.stderr.write(`local-ai-preflight: ${message}\n`);
  process.stderr.write(`${usage()}\n`);
  process.exit(2);
});
