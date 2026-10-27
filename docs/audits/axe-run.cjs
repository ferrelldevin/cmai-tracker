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
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const all = { tool: `axe-core ${axeVersion}`, tags: TAGS, runAt: new Date().toISOString(), schemes: {} };
  // Each color scheme, standard and with the high-contrast Display setting on.
  for (const [scheme, colorScheme, high] of [["light", "light", false], ["dark", "dark", false], ["light, high contrast", "light", true], ["dark, high contrast", "dark", true]]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme });
    if (high) await ctx.addInitScript(() => localStorage.setItem("cmai-contrast", "high"));
    const page = await ctx.newPage();
    const results = [];
    console.log(`== ${scheme}`);
    await page.goto(URL);
    await scan(page, "Welcome (first run)", results);
    await page.getByRole("button", { name: "Try demo data" }).click();
    await page.getByRole("button", { name: /^7 Hitting/ }).waitFor();
    await scan(page, "Log", results);
    await page.getByRole("button", { name: /^What does not count/ }).first().click();
    await page.getByRole("button", { name: /^7 Hitting/ }).click();
    await page.locator(".snackbar").waitFor();
    await scan(page, "Log (after a tap: confirmation, exclusion open)", results);
    await page.locator(".snackbar").getByRole("button", { name: "Edit" }).click();
    await page.getByRole("dialog", { name: /^Hitting/ }).waitFor();
    await scan(page, "Log details sheet (from the confirmation)", results);
    await page.getByRole("dialog").getByRole("button", { name: "Other" }).click();
    await scan(page, "Log details sheet (Other chosen: note field)", results);
    await page.getByRole("button", { name: "Delete log" }).click();
    // Delete asks for a reason first (D-14), so scan that step and finish it.
    const del = page.getByRole("dialog", { name: "Delete this log?" });
    await del.waitFor();
    await scan(page, "Delete a log (reason step)", results);
    await del.getByRole("button", { name: "Tapped by mistake" }).click();
    await del.getByRole("button", { name: "Delete log" }).click();
    await del.waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "Nothing to log today" }).click();
    // The click leaves the page scrolled wherever the button was, and whichever behavior row the
    // fixed tab bar happens to cut there can fail target-size by a fraction of a pixel. Scan from the
    // top so the result does not depend on scroll position.
    await page.evaluate(() => window.scrollTo(0, 0));
    await scan(page, "Log (checked in: nothing to log today)", results);
    await page.getByRole("button", { name: /^7 Hitting/ }).click(); // makes sure there is a recent log to edit
    await page.getByRole("button", { name: /^Edit / }).first().click();
    await page.getByRole("dialog").waitFor();
    await scan(page, "Log details sheet (from Recent logs)", results);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /Choose patient$/ }).click();
    await page.getByRole("dialog", { name: "Choose patient" }).waitFor();
    await scan(page, "Patient switcher (sheet open)", results);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Scores" }).click();
    await page.getByRole("heading", { name: "Behavior scores", exact: true }).waitFor();
    await scan(page, "Scores", results);
    await page.getByRole("button", { name: "Show all 29 behaviors" }).click();
    await scan(page, "Scores (all 29 behaviors)", results);
    // The Day-14 review screen was removed when ratings were locked (D-14, PR #17).
    await page.getByRole("button", { name: "Patients and data" }).click();
    await scan(page, "Patients & data (with patients)", results);
    await page.getByRole("button", { name: "Delete P-DEMO-B" }).click();
    await page.getByRole("dialog", { name: "Delete P-DEMO-B?" }).waitFor();
    await scan(page, "Patients & data (confirm delete sheet)", results);
    await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
    for (const row of ["Backup and export", "Display", "Keep data safe", "Demo data", "How ratings are worked out"]) {
      await page.getByRole("link", { name: new RegExp(`^${row}`) }).click();
      await scan(page, `Data: ${row}`, results);
      await page.getByRole("button", { name: "Data", exact: true }).click();
    }
    all.schemes[scheme] = results;
    await ctx.close();
  }
  await browser.close();
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(all, null, 2) + "\n");
  // Any violation fails the run, named by mode and screen, so a check run can report it.
  const failing = Object.entries(all.schemes).flatMap(([scheme, rs]) => rs.filter((r) => r.violations.length).map((r) => `${r.screen} (${scheme})`));
  if (failing.length) { console.error(`FAIL: axe violations on ${failing.length} screens: ${failing.join("; ")}`); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });
