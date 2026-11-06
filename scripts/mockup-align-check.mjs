// Alignment check for the Storybook design mockup (src/mockup). Runs on your machine or in the
// cloud: `npm run mockup:align` (builds Storybook first if storybook-static/ is missing; pass
// --rebuild to force a fresh build).
//
// What it checks, on every screen below, in light and dark, standard and large text, at the
// mockup's 390px phone width and a narrow 360px phone:
//   1. Columns line up. Elements marked data-align-left="key" must start at the same x, and
//      data-align-right="key" must end at the same x (measured on the text itself, so a
//      number that is not right-aligned inside its cell is caught too). Tolerance 1px.
//   2. Nothing spills sideways: no element inside the phone is wider than the phone's body.
//   3. Marked numbers stay on one line (a wrapped average or count reads as two values), and
//      marked text stays inside its own column instead of running into the next one.
//   4. Accessibility: axe-core (WCAG 2.2 A and AA rules) finds no violations on the phone,
//      which covers text contrast in both themes.
//
// Made-up demo data only, like the rest of the mockup.

/* global document, getComputedStyle, window */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

const AXE = createRequire(import.meta.url).resolve("axe-core/axe.min.js");

const ROOT = resolve("storybook-static");
if (process.argv.includes("--rebuild") || !existsSync(join(ROOT, "iframe.html"))) {
  console.log("Building Storybook…");
  execSync("npm run build-storybook -- --quiet", { stdio: "inherit" });
}

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
};
// Serves only files inside storybook-static/: the path is resolved and checked to be inside
// ROOT before the file system is touched, so "../" in a request can't reach other files.
const notFound = (res) => {
  res.writeHead(404);
  res.end();
};
const server = createServer((req, res) => {
  let f;
  try {
    f = resolve(ROOT, "." + decodeURIComponent(new URL(req.url, "http://x").pathname));
  } catch {
    return notFound(res);
  }
  if (f !== ROOT && !f.startsWith(ROOT + sep)) return notFound(res);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
  if (!existsSync(f)) return notFound(res);
  res.writeHead(200, { "content-type": TYPES[extname(f)] ?? "application/octet-stream" });
  createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const SCREENS = [
  { name: "Score", id: "mockup-five-step-flow--score", args: "" },
  { name: "Report, two weeks", id: "mockup-five-step-flow--report", args: "view:two-week" },
  { name: "Report, today", id: "mockup-five-step-flow--report", args: "view:daily" },
  { name: "Report, today (busy day)", id: "mockup-five-step-flow--report", args: "view:daily;todayLogs:busy+day" },
  { name: "Log", id: "mockup-five-step-flow--log", args: "" },
  { name: "Login", id: "mockup-five-step-flow--login", args: "" },
  { name: "Login, choose resident", id: "mockup-five-step-flow--login", args: "step:choose-resident" },
  { name: "Settings", id: "mockup-five-step-flow--settings", args: "" },
];
const MODES = [];
for (const theme of ["light", "dark"])
  for (const textSize of ["standard", "large"]) for (const width of [390, 360]) MODES.push({ theme, textSize, width });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 520, height: 1000 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));

let fails = 0;
let checks = 0;
for (const s of SCREENS) {
  for (const m of MODES) {
    const label = `${s.name} · ${m.theme} · ${m.textSize} text · ${m.width}px`;
    await page.goto(
      `${base}/iframe.html?id=${s.id}&viewMode=story&args=${s.args}&globals=theme:${m.theme};textSize:${m.textSize}`,
    );
    await page.waitForSelector(".mk-phone");
    await page.addStyleTag({
      content: `.mk-phone{width:${m.width}px!important;height:auto!important}.mk-body{overflow:visible!important}`,
    });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(100);

    const problems = await page.evaluate(() => {
      const out = [];
      const textBox = (el) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        const rects = [...r.getClientRects()].filter((x) => x.width > 0);
        if (!rects.length) return el.getBoundingClientRect();
        return {
          left: Math.min(...rects.map((x) => x.left)),
          right: Math.max(...rects.map((x) => x.right)),
          lines: new Set(rects.map((x) => Math.round(x.top))).size,
        };
      };
      for (const side of ["left", "right"]) {
        const groups = new Map();
        for (const el of document.querySelectorAll(`.mk-phone [data-align-${side}]`)) {
          const k = el.getAttribute(`data-align-${side}`);
          if (!groups.has(k)) groups.set(k, []);
          groups.get(k).push(el);
        }
        for (const [k, els] of groups) {
          const edges = els.map((el) => textBox(el)[side]);
          const spread = Math.max(...edges) - Math.min(...edges);
          if (spread > 1)
            out.push(
              `${side} edges of "${k}" differ by ${spread.toFixed(1)}px (${edges.map((e) => e.toFixed(0)).join(", ")})`,
            );
          els.forEach((el) => {
            if (getComputedStyle(el).display === "inline") return;
            const t = textBox(el);
            const r = el.getBoundingClientRect();
            if (t.left < r.left - 1 || t.right > r.right + 1)
              out.push(`"${k}" text "${el.textContent.trim()}" runs outside its column`);
          });
          if (side === "right")
            els.forEach((el) => {
              const t = textBox(el);
              if (t.lines > 1) out.push(`"${k}" value "${el.textContent.trim()}" wraps onto ${t.lines} lines`);
            });
        }
      }
      const body = document.querySelector(".mk-body") ?? document.querySelector(".mk-phone");
      const limit = body.getBoundingClientRect().right + 0.5;
      for (const el of body.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.width && r.right > limit) {
          out.push(
            `spills ${(r.right - limit).toFixed(0)}px past the screen edge: <${el.tagName.toLowerCase()} class="${el.className}">`,
          );
          break;
        }
      }
      return out;
    });
    await page.addScriptTag({ path: AXE });
    const axe = await page.evaluate(async () => {
      const r = await window.axe.run(document.querySelector(".mk-phone"), {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
      });
      return r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(" ")}`);
    });
    for (const v of axe) problems.push(`axe ${v}`);
    checks++;
    if (problems.length) {
      fails++;
      for (const p of problems) console.log(`FAIL  ${label}: ${p}`);
    }
  }
}
await browser.close();
server.close();
if (pageErrors.length) {
  fails++;
  console.log(`FAIL  page errors: ${[...new Set(pageErrors)].join(" | ")}`);
}
console.log(
  `RESULT: ${fails ? "FAIL" : "PASS"} (${checks} screen and display-mode combinations, ${fails} with problems)`,
);
process.exit(fails ? 1 : 0);
