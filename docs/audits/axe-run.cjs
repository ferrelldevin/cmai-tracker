// Drives the production preview through every screen and runs axe-core (WCAG 2.2 AA tags).
const { chromium } = require("playwright");
const fs = require("fs");
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const axeVersion = require("axe-core/package.json").version;
const URL = process.argv[2] || "http://localhost:4173/";
const OUT = process.argv[3];
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function scan(page, name, results) {
  await page.waitForTimeout(400);
  await page.evaluate(axeSource);
  const r = await page.evaluate((tags) => window.axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations", "incomplete"] }), TAGS);
  results.push({ screen: name, url: page.url(), violations: r.violations, incomplete: r.incomplete.map((i) => ({ id: i.id, impact: i.impact, help: i.help, nodes: i.nodes.map((n) => ({ target: n.target, why: n.any.map((a) => a.message) })) })) });
  console.log(`${name}: ${r.violations.length} violation rules (${r.violations.reduce((a, v) => a + v.nodes.length, 0)} nodes), ${r.incomplete.length} needs-review`);
  for (const v of r.violations) console.log(`   ${v.impact} ${v.id}: ${v.help} x${v.nodes.length} :: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
}

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const all = { tool: `axe-core ${axeVersion}`, tags: TAGS, runAt: new Date().toISOString(), schemes: {} };
  for (const scheme of ["light", "dark"]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    const page = await ctx.newPage();
    const results = [];
    console.log(`== ${scheme}`);
    await page.goto(URL);
    await scan(page, "Patients & data (empty)", results);
    await page.getByRole("button", { name: "Load demo data" }).click();
    await page.getByRole("button", { name: /^7 Hitting/ }).waitFor();
    await scan(page, "Log", results);
    await page.getByRole("button", { name: "Does not count" }).first().click();
    await page.getByRole("button", { name: /^7 Hitting/ }).click();
    await page.getByRole("button", { name: "Add detail" }).click();
    await scan(page, "Log (after a tap: toast with details, exclusion open)", results);
    await page.getByRole("button", { name: "Undo" }).click();
    await page.getByRole("button", { name: "Nothing to log today" }).click();
    await scan(page, "Log (checked in: nothing to log today)", results);
    await page.getByRole("button", { name: "Scores" }).click();
    await page.getByText("Each behavior, period by period").waitFor();
    await scan(page, "Scores", results);
    await page.getByRole("button", { name: "Show all 29 behaviors" }).click();
    await scan(page, "Scores (all 29 behaviors)", results);
    await page.getByRole("button", { name: "Day-14 review" }).click();
    await scan(page, "Day-14 review", results);
    await page.getByRole("button", { name: "Patients & data" }).click();
    await scan(page, "Patients & data (with patients)", results);
    all.schemes[scheme] = results;
    await ctx.close();
  }
  await browser.close();
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(all, null, 2) + "\n");
})().catch((e) => { console.error(e); process.exit(1); });
