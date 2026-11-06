// Fails when the docs and the code disagree in a way a script can see. Run in CI by `npm run check:docs`.
//   1. Every rule in the scoring spec's "Checked by" table names a test that still exists.
//   2. Every relative Markdown link points at a file that exists.
//   3. Every `path:line` reference in backticks points at a file with at least that many lines.
//   4. Every register ID (D-, F-, V- plus two digits; P- inside the register) used in the docs or the app is defined in the register.
// It reads tracked files only and changes nothing.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPEC = "docs/scoring-spec.md";
const REGISTER = "docs/review-register.md";

const tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const exists = (f) => fs.existsSync(path.join(ROOT, f));
const problems = [];
const fail = (where, msg) => problems.push(`${where}: ${msg}`);
const lineOf = (text, index) => text.slice(0, index).split("\n").length;

// 1. Spec rules and their checks.
{
  const spec = read(SPEC);
  const start = spec.indexOf("| Rule | Checked by");
  if (start < 0) fail(SPEC, 'the "Checked by" table is missing');
  else {
    const rows = spec
      .slice(start)
      .split("\n")
      .slice(2)
      .filter((l) => l.startsWith("|"));
    if (!rows.length) fail(SPEC, 'the "Checked by" table has no rows');
    for (const row of rows) {
      const m = /^\|\s*(.+?)\s*\|\s*`([^`]+)`:\s*(.+?)\s*\|$/.exec(row);
      if (!m) {
        fail(SPEC, `cannot read the row "${row}"`);
        continue;
      }
      const [, rule, file, name] = m;
      if (!exists(file)) fail(SPEC, `${rule}: ${file} does not exist`);
      else if (!read(file).includes(name)) fail(SPEC, `${rule}: no check named "${name}" in ${file}`);
    }
  }
}

const markdown = tracked.filter((f) => f.endsWith(".md"));

// 2. Relative links.
for (const file of markdown) {
  const text = read(file);
  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = m[1].split("#")[0];
    if (!target || /^[a-z]+:/i.test(target)) continue; // anchors, https:, mailto:
    const resolved = path.normalize(path.join(path.dirname(file), decodeURIComponent(target)));
    if (!exists(resolved)) fail(`${file}:${lineOf(text, m.index)}`, `link to ${m[1]} goes nowhere`);
  }
}

// 3. `path:line` references.
for (const file of markdown) {
  const text = read(file);
  for (const m of text.matchAll(/`([\w./-]+\.[a-z]{2,4}):(\d+)(?:-(\d+))?`/g)) {
    const [, ref, from, to] = m;
    const where = `${file}:${lineOf(text, m.index)}`;
    if (!exists(ref)) {
      fail(where, `${ref} does not exist`);
      continue;
    }
    const lines = read(ref).split("\n").length;
    if (Number(to ?? from) > lines) fail(where, `${ref} has ${lines} lines, so line ${to ?? from} does not exist`);
  }
}

// 4. Register IDs. Only the docs and the app's own source are scanned. Fictional patient codes
// such as P-07 look like permission IDs, so P- IDs are checked only inside the register itself.
{
  const defined = new Set([...read(REGISTER).matchAll(/^\| ([DFPV]-\d{2}) \|/gm)].map((m) => m[1]));
  const sources = tracked.filter((f) => (f.endsWith(".md") || f.startsWith("src/")) && f !== "CHANGELOG.md");
  for (const file of sources) {
    const text = read(file);
    const ids = file === REGISTER ? /\b([DFPV]-\d{2})\b/g : /\b([DFV]-\d{2})\b/g;
    for (const m of text.matchAll(ids)) {
      if (!defined.has(m[1])) fail(`${file}:${lineOf(text, m.index)}`, `${m[1]} is not in ${REGISTER}`);
    }
  }
}

if (problems.length) {
  console.error(
    `check:docs found ${problems.length} problem${problems.length === 1 ? "" : "s"}:\n- ${problems.join("\n- ")}`,
  );
  process.exit(1);
}
console.log("check:docs: spec checks, links, file:line references and register IDs all resolve");
