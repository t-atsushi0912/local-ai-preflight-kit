const assert = require("node:assert/strict");
const { execFileSync, spawn, spawnSync } = require("node:child_process");
const { existsSync, mkdtempSync, readFileSync, rmSync } = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const Ajv2020 = require("ajv/dist/2020");

const repoRoot = path.resolve(__dirname, "..");
const cliPath = path.join(repoRoot, "dist", "cli.js");
const schemaPath = path.join(repoRoot, "schemas", "result.schema.json");
const fixtureDir = path.join(repoRoot, "tests", "fixtures");
const { sanitizeSummaryForArtifact, SUMMARY_SAFETY_RULE } = require(path.join(
  repoRoot,
  "dist",
  "summary_safety.js",
));

function createResultValidator() {
  const ajv = new Ajv2020({ allErrors: true });
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  return ajv.compile(schema);
}

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

function parseFixture(name) {
  return JSON.parse(readFileSync(path.join(fixtureDir, name), "utf8"));
}

function assertMatchesResultSchema(artifact) {
  const validate = createResultValidator();
  const valid = validate(artifact);
  assert.equal(valid, true, JSON.stringify(validate.errors, null, 2));
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
      assert.equal(path.normalize(artifact.result_path), path.join(fixture.artifactDir, "result.json"));
      assert.equal(path.normalize(artifact.summary_path), path.join(fixture.artifactDir, "summary.md"));
      assert.equal(path.normalize(artifact.artifact_dir), fixture.artifactDir);
      assert.ok(summary.includes("Decision: continue"));
      assert.ok(!summary.includes(fixture.repoDir));
      assertMatchesResultSchema(artifact);

      const latest = parseArtifact(path.join(fixture.artifactDir, "latest", "result.json"));
      assert.equal(latest.decision, "continue");
      assertMatchesResultSchema(latest);
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
    assert.deepEqual(artifact.reasons, ["git_repo", "ollama_probe_failed"]);
    assertMatchesResultSchema(artifact);
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
    assert.deepEqual(artifact.reasons, ["not_git_repo"]);
    assertMatchesResultSchema(artifact);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("summarize success returns continue and writes sanitized summary output", async () => {
  const fixture = createRepoFixture();

  try {
    await withProbeServer((request, response) => {
      if (request.url === "/api/tags") {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end('{"models":[{"name":"gemma3:latest"}]}');
        return;
      }

      if (request.url === "/api/generate" && request.method === "POST") {
        let body = "";
        request.setEncoding("utf8");
        request.on("data", (chunk) => {
          body += chunk;
        });
        request.on("end", () => {
          const payload = JSON.parse(body);
          assert.equal(payload.stream, false);
          assert.equal(typeof payload.prompt, "string");
          response.writeHead(200, { "Content-Type": "application/json" });
          response.end(
            JSON.stringify({
              response:
                "opaque_value=ABCDEFGHIJKLMNOPQRSTUVWXYZ123456 /Users/demo/project C:\\Users\\demo\\work 10.24.3.8",
            }),
          );
        });
        return;
      }

      response.writeHead(404);
      response.end();
    }, async (host) => {
      const result = await runCli(["--repo", fixture.repoDir, "--artifact-dir", fixture.artifactDir], {
        ...process.env,
        LOCAL_AI_OLLAMA_HOSTS: host,
      });

      assert.equal(result.code, 0, result.stderr);
      assert.ok(existsSync(path.join(fixture.artifactDir, "result.json")));
      assert.ok(existsSync(path.join(fixture.artifactDir, "summary.md")));

      const artifact = parseArtifact(path.join(fixture.artifactDir, "result.json"));
      const summary = readFileSync(path.join(fixture.artifactDir, "summary.md"), "utf8");

      assert.equal(artifact.decision, "continue");
      assert.equal(artifact.exit_code, 0);
      assert.equal(artifact.status, "ok");
      assert.deepEqual(artifact.reasons, ["git_repo", "ollama_probe_ok", "summary_created"]);
      assert.ok(summary.includes("[redacted-path]"));
      assert.ok(summary.includes("[redacted-host]"));
      assert.ok(summary.includes("[redacted-value]"));
      assert.ok(!summary.includes("/Users/demo/project"));
      assert.ok(!summary.includes("10.24.3.8"));
      assert.ok(!summary.includes("ABCDEFGHIJKLMNOPQRSTUVWXYZ123456"));
      assertMatchesResultSchema(artifact);
    });
  } finally {
    fixture.cleanup();
  }
});

test("result schema rejects mismatched decision and exit code pairs", () => {
  const validate = createResultValidator();
  const artifact = parseFixture("result-invalid-exit-code.json");

  assert.equal(validate(artifact), false);
});

test("result schema accepts the standalone valid fixture", () => {
  const artifact = parseFixture("result-valid-summary-created.json");

  assertMatchesResultSchema(artifact);
});

test("result schema forbids additional properties", () => {
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));

  assert.equal(schema.additionalProperties, false);
});

test("summary safety rule removes path-like and assignment-like values", () => {
  const input =
    "opaque_value=ABCDEFGHIJKLMNOPQRSTUVWXYZ123456 /Users/demo/project C:\\Users\\demo\\work 10.24.3.8";
  const output = sanitizeSummaryForArtifact(input);

  assert.equal(SUMMARY_SAFETY_RULE, "public_summary_v1");
  assert.ok(output.includes("[redacted-value]"));
  assert.ok(output.includes("[redacted-path]"));
  assert.ok(output.includes("[redacted-host]"));
  assert.ok(!output.includes("/Users/demo/project"));
  assert.ok(!output.includes("10.24.3.8"));
  assert.ok(!output.includes("ABCDEFGHIJKLMNOPQRSTUVWXYZ123456"));
});
