const assert = require("node:assert/strict");
const { execFileSync, spawn } = require("node:child_process");
const { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const cliPath = path.join(repoRoot, "dist", "cli.js");

function createRepoFixture() {
  const fixture = mkdtempSync(path.join(os.tmpdir(), "local-ai-preflight-real-"));
  const repoDir = path.join(fixture, "repo");
  const artifactDir = path.join(fixture, "artifact");

  mkdirSync(repoDir, { recursive: true });
  execFileSync("git", ["-C", repoDir, "init"], { stdio: "ignore" });
  writeFileSync(path.join(repoDir, "README.md"), "hello\n", "utf8");
  execFileSync("git", ["-C", repoDir, "add", "README.md"], { stdio: "ignore" });
  execFileSync(
    "git",
    ["-C", repoDir, "-c", "user.name=Test User", "-c", "user.email=test@example.invalid", "commit", "-m", "init"],
    { stdio: "ignore" },
  );

  return {
    cleanup() {
      rmSync(fixture, { recursive: true, force: true });
    },
    repoDir,
    artifactDir,
  };
}

function runCli(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [cliPath, ...args], {
      cwd: repoRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

const maybeRealTest = process.env.LOCAL_AI_RUN_REAL_OLLAMA_TESTS === "1" ? test : test.skip;

maybeRealTest("real Ollama summarize path returns continue when the local endpoint is ready", async () => {
  const fixture = createRepoFixture();

  try {
    const result = await runCli(["--repo", fixture.repoDir, "--artifact-dir", fixture.artifactDir], {
      ...process.env,
      LOCAL_AI_OLLAMA_HOSTS:
        process.env.LOCAL_AI_REAL_OLLAMA_HOSTS ||
        process.env.LOCAL_AI_OLLAMA_HOSTS ||
        "http://127.0.0.1:11434 http://localhost:11434",
    });

    assert.equal(result.code, 0, result.stderr);
    const artifact = JSON.parse(readFileSync(path.join(fixture.artifactDir, "result.json"), "utf8"));
    assert.equal(artifact.decision, "continue");
    assert.equal(artifact.status, "ok");
    assert.deepEqual(artifact.reasons, ["git_repo", "ollama_probe_ok", "summary_created"]);
  } finally {
    fixture.cleanup();
  }
});
