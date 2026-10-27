// Runs every browser check and the accessibility audit against a fresh production build and
// writes one report.
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
const CHECKS = ["flows", "navigation", "scores-period", "theme", "patient-switcher", "sheet"];
// The audit runs with the axe-core version the recorded results in docs/audits/ came from, so a
// newer axe adding rules shows up as a deliberate upgrade, not a surprise failure.
const AXE = "axe-core@4.10.3";
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
    ["Install Playwright and axe-core", "npm", ["i", "--no-save", "playwright", AXE]],
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

function runCheck(name) {
  say(`Running ${name}`);
  const out = path.join(OUT, name);
  fs.mkdirSync(out, { recursive: true });
  const r = spawnSync(process.execPath, [path.join(ROOT, "e2e", `${name}.cjs`), URL, out], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 10 * 60_000,
  });
  const lines = `${r.stdout}\n${r.stderr}`.split(/\r?\n/);
  const passed = lines.filter((l) => /^\s*ok\b/.test(l)).length;
  if (r.status === 0) return { name, ok: true, passed };
  // The scripts stop at the first failure and print it as "FAIL: ...". Keep that line exactly.
  // Anything else (a crash, a timeout) gets the head of the error, which names the cause.
  const fail = lines.find((l) => l.includes("FAIL:"));
  const head = clean(r.stderr).split(/\r?\n/).filter((l) => l.trim()).slice(0, 3).join("\n");
  const detail = fail ?? (r.error ? String(r.error) : head || "Stopped with no output.");
  return { name, ok: false, passed, detail };
}

// docs/audits/axe-run.cjs scans every screen in light, dark and both high-contrast modes and
// saves the results. It only fails on a crash, so the violations are counted here. Results go to
// the temp folder: the recorded audit in docs/audits/ is updated in a pull request, not by this run.
function runAxe() {
  const name = "accessibility (axe)";
  say(`Running ${name}`);
  const json = path.join(OUT, "axe.json");
  fs.rmSync(json, { force: true });
  const r = spawnSync(process.execPath, [path.join(ROOT, "docs", "audits", "axe-run.cjs"), URL, json], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 15 * 60_000,
  });
  if (r.status !== 0 || !fs.existsSync(json)) {
    const head = clean(r.stderr).split(/\r?\n/).filter((l) => l.trim()).slice(0, 3).join("\n");
    return { name, ok: false, passed: 0, detail: r.error ? String(r.error) : head || "Stopped with no output." };
  }
  const scans = Object.entries(JSON.parse(fs.readFileSync(json, "utf8")).schemes).flatMap(([mode, rs]) => rs.map((x) => ({ mode, ...x })));
  const bad = scans.flatMap((s) => s.violations.map((v) => `FAIL: ${s.mode} · ${s.screen}: ${v.id} (${v.nodes.length} element${v.nodes.length === 1 ? "" : "s"}): ${v.help}`));
  return { name, ok: bad.length === 0, passed: scans.length, unit: "scans", detail: bad.join("\n") };
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
    lines.push(`## ${r.name}: ${r.ok ? "PASS" : "FAIL"} (${r.passed} ${r.unit ?? "ok"})`, "");
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
    for (const name of CHECKS) results.push(runCheck(name));
    results.push(runAxe());
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
