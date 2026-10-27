// Runs the browser checks and the accessibility audit against a fresh production build and writes one report.
// usage: npm run checks            (report in .checks/report.md)
//        npm run checks:report     (same, then pushes the report alone to the checks-report branch)
// Works in Windows PowerShell, macOS and Linux. It changes no tracked file; the push writes only the report.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 4173;
const URL = `http://localhost:${PORT}/`;
// file is the script; out, when set, is the file it writes instead of a screenshot folder.
const CHECKS = [
  { name: "flows", file: "e2e/flows.cjs" },
  { name: "navigation", file: "e2e/navigation.cjs" },
  { name: "scores-period", file: "e2e/scores-period.cjs" },
  { name: "accessibility", file: "docs/audits/axe-run.cjs", out: "axe-wcag22aa.json" },
];
const REPORT_BRANCH = "checks-report";
const push = process.argv.includes("--push");
const OUT = path.join(os.tmpdir(), "cmai-e2e");

const run = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", shell: process.platform === "win32", ...opts });
const git = (...args) => run("git", args, { shell: false }).stdout?.trim() ?? "";
const say = (m) => console.log(`[checks] ${m}`);

// Each setup step must pass before the checks can mean anything.
function setup() {
  const steps = [
    ["Install dependencies", "npm", ["ci"]],
    ["Install Playwright and axe-core", "npm", ["i", "--no-save", "playwright", "axe-core"]],
    ["Install Chromium", "npx", ["playwright", "install", "chromium"]],
    ["Build", "npm", ["run", "build"]],
  ].filter(([name]) => !(name === "Install Chromium" && process.env.CHROME)); // CHROME points at a browser already on the machine
  for (const [name, cmd, args] of steps) {
    say(name);
    const r = run(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    if (r.status !== 0) return `${name} failed:\n${tail(clean(r.stderr || r.stdout || String(r.error)))}`;
  }
  return null;
}

const tail = (text, n = 15) => text.trim().split(/\r?\n/).slice(-n).join("\n");
const clean = (text = "") => text.replace(/\x1b\[[0-9;]*m/g, "");

async function startServer() {
  const vite = path.join(ROOT, "node_modules", "vite", "bin", "vite.js");
  const server = spawn(process.execPath, [vite, "preview", "--port", String(PORT), "--strictPort"], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  server.stdout.on("data", (d) => (log += d));
  server.stderr.on("data", (d) => (log += d));
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error(`The preview server stopped:\n${tail(log)}`);
    try {
      if ((await fetch(URL)).ok) return server;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  server.kill();
  throw new Error(`The preview server did not answer on port ${PORT} within 30 seconds:\n${tail(log)}`);
}

function runCheck({ name, file, out: outFile }) {
  say(`Running ${name}`);
  const dir = path.join(OUT, name);
  fs.mkdirSync(dir, { recursive: true });
  const out = outFile ? path.join(dir, outFile) : dir;
  const r = spawnSync(process.execPath, [path.join(ROOT, file), URL, out], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 10 * 60_000,
  });
  const lines = `${r.stdout}\n${r.stderr}`.split(/\r?\n/);
  // The e2e scripts print "ok" per check; the audit prints "0 violation rules" per clean screen.
  const passed = lines.filter((l) => /^\s*ok\b/.test(l) || /: 0 violation rules/.test(l)).length;
  if (r.status === 0) return { name, ok: true, passed };
  // The scripts stop at the first failure and print it as "FAIL: ...". Keep that line exactly.
  // Anything else (a crash, a timeout) gets the head of the error, which names the cause.
  const fail = lines.find((l) => l.includes("FAIL:"));
  const head = clean(r.stderr).split(/\r?\n/).filter((l) => l.trim()).slice(0, 3).join("\n");
  const detail = fail ?? (r.error ? String(r.error) : head || "Stopped with no output.");
  return { name, ok: false, passed, detail };
}

function report({ setupError, results }) {
  const ok = !setupError && results.every((r) => r.ok);
  const dirty = git("status", "--porcelain") !== "";
  const lines = [
    "# CMAI browser checks",
    "",
    `RESULT: ${ok ? "PASS" : "FAIL"}`,
    "",
    `- Commit: ${git("log", "-1", "--format=%h %s")}${dirty ? " (with uncommitted changes)" : ""}`,
    `- Branch: ${git("rev-parse", "--abbrev-ref", "HEAD")}`,
    `- Ran at: ${new Date().toISOString()}`,
    `- Node ${process.version} on ${process.platform}`,
    "",
  ];
  if (setupError) lines.push("## Setup", "", "```", setupError, "```", "");
  for (const r of results) {
    lines.push(`## ${r.name}: ${r.ok ? "PASS" : "FAIL"} (${r.passed} ok)`, "");
    if (!r.ok) lines.push("```", r.detail, "```", "");
  }
  lines.push("Written by scripts/run-checks.mjs. Screenshots stay on the machine that ran it.", "");
  return { ok, text: lines.join("\n") };
}

// Commits the report as the only file on the checks-report branch, without touching the
// working tree, the index or any other branch.
function pushReport(file) {
  run("git", ["fetch", "origin", REPORT_BRANCH], { shell: false });
  const parent = git("rev-parse", "--verify", "-q", `origin/${REPORT_BRANCH}`);
  const blob = git("hash-object", "-w", file);
  const tree = run("git", ["mktree"], { shell: false, input: `100644 blob ${blob}\treport.md\n` }).stdout.trim();
  const msg = `Checks report for ${git("log", "-1", "--format=%h")}`;
  const commit = git("commit-tree", tree, ...(parent ? ["-p", parent] : []), "-m", msg);
  const r = run("git", ["push", "origin", `${commit}:refs/heads/${REPORT_BRANCH}`], { shell: false });
  if (r.status !== 0) throw new Error(`Could not push the report:\n${tail(r.stderr)}`);
  say(`Report pushed to the ${REPORT_BRANCH} branch`);
}

const results = [];
let setupError = setup();
if (!setupError) {
  let server;
  try {
    server = await startServer();
    for (const check of CHECKS) results.push(runCheck(check));
  } catch (e) {
    setupError = e.message;
  } finally {
    server?.kill();
  }
}

const { ok, text } = report({ setupError, results });
const file = path.join(ROOT, ".checks", "report.md");
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, text);
console.log("\n" + text);
if (push) pushReport(file);
process.exit(ok ? 0 : 1);
