// Navigation checks: pinned section bars, scroll tracking, Data hub and pages, back gesture, reload. usage: node e2e/navigation.cjs URL OUTDIR
const { chromium } = require("playwright");
const [URL, OUT] = process.argv.slice(2);
const ok = (c, m) => { if (!c) throw new Error("FAIL: " + m); console.log("  ok", m); };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const shot = (n) => p.mouse.move(1, 1).then(() => p.waitForTimeout(250)).then(() => p.screenshot({ path: `${OUT}/${n}.png` }));
  const active = (label) => p.evaluate((l) => document.querySelector(`nav[aria-label="${l}"] [aria-current="location"]`)?.textContent, label);
  const navTop = (label) => p.evaluate((l) => Math.round(document.querySelector(`nav[aria-label="${l}"]`).getBoundingClientRect().top), label);
  const pinH = () => p.evaluate(() => parseInt(getComputedStyle(document.documentElement).getPropertyValue("--pin-h")));
  const tab = (t) => p.locator("nav.tabs button", { hasText: t }).click();

  await p.goto(URL);
  await shot("01-first-run-hub");
  await p.getByRole("button", { name: "Try demo data" }).click();
  await p.getByRole("button", { name: /^7 Hitting/ }).waitFor();
  ok(p.url().endsWith("#/log"), "demo load lands on #/log");
  await shot("02-log-top");
  // Log: pinned bar + tracking
  await p.mouse.wheel(0, 1200); await p.waitForTimeout(400);
  ok(await navTop("Jump to a group") === await pinH(), "Log bar pins under the banner");
  ok(await active("Jump to a group") === "Physical", "scrolling into Physical marks Physical (got " + await active("Jump to a group") + ")");
  await shot("03-log-scrolled");
  await p.locator('nav[aria-label="Jump to a group"] a', { hasText: "Recent logs" }).click(); await p.waitForTimeout(900);
  ok(await active("Jump to a group") === "Recent logs", "tap Recent logs marks it");
  const gap = await p.evaluate(() => Math.round(document.getElementById("recent").getBoundingClientRect().top - document.querySelector(".section-nav").getBoundingClientRect().bottom));
  const atEnd = await p.evaluate(() => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4);
  ok(gap >= 0 && (gap < 40 || atEnd), `Recent logs lands under the bar, fully visible (gap ${gap}px, page end ${atEnd})`);
  await shot("04-log-recent");
  // Tap the active tab: back to top
  await tab(/^Log$/); await p.waitForTimeout(1600);
  ok(await p.evaluate(() => window.scrollY) === 0, "tapping the current tab scrolls to top");
  ok(await active("Jump to a group") === "Aggressive", "top marks Aggressive");
  // Scores
  await tab(/scores/i); await p.waitForTimeout(600);
  ok(p.url().endsWith("#/scores"), "Scores in URL");
  await p.locator('nav[aria-label="Jump to a chart"] a', { hasText: "Total" }).click(); await p.waitForTimeout(900);
  ok(await active("Jump to a chart") === "Total", "Scores: jump to Total");
  await shot("05-scores-total");
  await p.reload(); await p.waitForTimeout(800);
  ok(p.url().endsWith("#/scores") && (await p.locator("nav.tabs button.on").textContent()).includes("Scores"), "reload stays on Scores");
  // Review
  await tab(/review/i); await p.waitForTimeout(600);
  const before = await p.locator('nav[aria-label="Jump to a group"] a').allTextContents();
  ok(before.join("|") === "Aggressive0/9|Physical0/9|Verbal0/6|Other0/5" || before.every((t) => /\d+\/\d+/.test(t)), "Review chips show progress: " + before.join(", "));
  await shot("06-review-top");
  await p.locator('nav[aria-label="Jump to a group"] a', { hasText: "Verbal" }).click(); await p.waitForTimeout(900);
  ok(await active("Jump to a group") === "Verbal" + before[2].replace(/^Verbal/, ""), "Review: jump to Verbal");
  await p.getByRole("button", { name: /^5\. Constant unwarranted/ }).click();
  const rs = p.getByRole("dialog", { name: /^5\. Constant unwarranted/ });
  await rs.waitFor(); ok(await p.evaluate(() => document.activeElement?.tagName === "DIALOG"), "rating sheet opened by tap: no focus ring");
  await rs.getByRole("button", { name: /^Once or twice a week/ }).click();
  await rs.waitFor({ state: "hidden" }); ok(true, "choosing a rating saves and closes the sheet");
  ok((await p.getByRole("button", { name: /^5\. Constant unwarranted/ }).getAttribute("aria-label")).includes("You changed it to 3"), "row shows the changed rating");
  await p.waitForTimeout(300);
  ok((await p.locator('nav[aria-label="Jump to a group"] a', { hasText: "Verbal" }).textContent()).includes("1/5"), "reviewing one verbal item updates the chip to 1/5");
  await shot("07-review-verbal");
  // Data hub and pages
  await tab(/data/i); await p.waitForTimeout(500);
  ok(p.url().endsWith("#/data"), "Data hub in URL");
  await shot("08-data-hub");
  await p.getByRole("link", { name: /Display/ }).click(); await p.waitForTimeout(400);
  ok(p.url().endsWith("#/data/display"), "row opens #/data/display");
  ok((await p.locator("h1").textContent()).startsWith("Display"), "page heading is Display");
  await shot("09-data-display");
  await p.goBack(); await p.waitForTimeout(400);
  ok(p.url().endsWith("#/data") && await p.getByRole("link", { name: /Backup and export/ }).isVisible(), "back gesture returns to the hub");
  await p.getByRole("link", { name: /Backup and export/ }).click(); await p.waitForTimeout(300);
  await shot("10-data-backup");
  await p.getByRole("button", { name: "Data", exact: true }).click(); await p.waitForTimeout(400);
  ok(p.url().endsWith("#/data"), "on-page Back button returns to the hub");
  await p.getByRole("link", { name: /How ratings/ }).click(); await p.waitForTimeout(300);
  await tab(/^Log$/); await p.waitForTimeout(500);
  ok(p.url().endsWith("#/log"), "switching tab from a Data page goes to Log");
  await p.goBack(); await p.waitForTimeout(400);
  ok(!p.url().endsWith("#/data/about"), "Back after leaving a Data page does not reopen it (now " + p.url().split("#")[1] + ")");
  // Page heights now pinned
  ok(errs.length === 0, "no console errors " + JSON.stringify(errs));
  // Desktop look
  const d = await (await b.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 })).newPage();
  await d.goto(URL); await d.getByRole("button", { name: "Try demo data" }).click(); await d.waitForTimeout(800);
  await d.mouse.wheel(0, 900); await d.waitForTimeout(500); await d.mouse.move(1, 1);
  await d.screenshot({ path: `${OUT}/11-desktop-log-scrolled.png` });
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
