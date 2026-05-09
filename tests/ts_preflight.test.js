const assert = require("node:assert/strict");
const { execFileSync, spawn, spawnSync } = require("node:child_process");
const { mkdtempSync, readFileSync, rmSync } = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const cliPath = path.join(repoRoot, "dist", "cli.js");

function createRepoFixture() {
  const fixture = mkdtempSync(path.join(os.tmpdir(), "local-ai-preflight-ts-"));
  const repoDir = path.join(fixture, "repo");
  const artifactDir = path.join(fixture, "artifact");

  execFileSync("mkdir", ["-p", repoDir]);
  execFileSync("git", ["-C", repoDir, "init"], { stdio: "ignore" });
  execFileSync("bash", ["-lc", "printf 'hello\\n' > README.md"], { cwd: repoDir });
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
    fixture,
  };
}

function parseArtifact(resultPath) {
  return JSON.parse(readFileSync(resultPath, "utf8"));
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

async function withProbeServer(handler, run) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const url = `http://127.0.0.1:${address.port}`;

  try {
    await run(url);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

test("continue decision writes parseable artifacts and updates latest", async () => {
  const fixture = createRepoFixture();

  try {
    await withProbeServer((request, response) => {
      if (request.url === "/api/tags") {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end('{"models":[]}');
        return;
      }

      response.writeHead(404);
      response.end();
    }, async (host) => {
      const result = await runCli(
        ["--repo", fixture.repoDir, "--no-summarize", "--artifact-dir", fixture.artifactDir],
        {
          ...process.env,
          LOCAL_AI_OLLAMA_HOSTS: host,
        },
      );

      assert.equal(result.code, 0, result.stderr);
      const artifact = parseArtifact(path.join(fixture.artifactDir, "result.json"));
      const summary = readFileSync(path.join(fixture.artifactDir, "summary.md"), "utf8");

      assert.equal(artifact.decision, "continue");
      assert.equal(artifact.exit_code, 0);
      assert.equal(artifact.status, "ok");
      assert.deepEqual(artifact.reasons, ["git_repo", "ollama_probe_ok", "summary_skipped"]);
      assert.equal(artifact.schema_version, "1");
      assert.equal(artifact.result_path, path.join(fixture.artifactDir, "result.json"));
      assert.equal(artifact.summary_path, path.join(fixture.artifactDir, "summary.md"));
      assert.ok(summary.includes("Decision: continue"));
      assert.ok(!summary.includes(fixture.repoDir));

      const latest = parseArtifact(path.join(fixture.artifactDir, "latest", "result.json"));
      assert.equal(latest.decision, "continue");
    });
  } finally {
    fixture.cleanup();
  }
});

test("review decision is returned when probe fails", () => {
  const fixture = createRepoFixture();

  try {
    const result = spawnSync(
      "node",
      [cliPath, "--repo", fixture.repoDir, "--no-summarize", "--artifact-dir", fixture.artifactDir],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          LOCAL_AI_OLLAMA_HOSTS: "http://127.0.0.1:9",
          LOCAL_AI_PROBE_TIMEOUT_SECONDS: "1",
        },
      },
    );

    assert.equal(result.status, 1, result.stderr);
    const artifact = parseArtifact(path.join(fixture.artifactDir, "result.json"));
    assert.equal(artifact.decision, "review");
    assert.equal(artifact.exit_code, 1);
    assert.equal(artifact.status, "probe_failed");
  } finally {
    fixture.cleanup();
  }
});

test("stop decision is returned outside git repositories", () => {
  const fixture = mkdtempSync(path.join(os.tmpdir(), "local-ai-preflight-ts-non-git-"));
  const artifactDir = path.join(fixture, "artifact");

  try {
    const result = spawnSync("node", [cliPath, "--repo", fixture, "--artifact-dir", artifactDir], {
      cwd: repoRoot,
      encoding: "utf8",
      env: process.env,
    });

    assert.equal(result.status, 2, result.stderr);
    const artifact = parseArtifact(path.join(artifactDir, "result.json"));
    assert.equal(artifact.decision, "stop");
    assert.equal(artifact.exit_code, 2);
    assert.equal(artifact.status, "not_git_repo");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
