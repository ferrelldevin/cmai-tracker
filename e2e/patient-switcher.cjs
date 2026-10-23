// Patient switcher checks: sheet contents, keyboard and Esc, backdrop, confirmation, search, Manage patients.
// usage: node e2e/patient-switcher.cjs URL OUTDIR
const { chromium } = require("playwright");
const [URL, OUT] = process.argv.slice(2);
const ok = (c, m) => { if (!c) throw new Error("FAIL: " + m); console.log("  ok", m); };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const banner = () => p.getByRole("button", { name: /Choose patient$/ });
  const sheet = () => p.getByRole("dialog", { name: "Choose patient" });
  const shot = (n) => p.waitForTimeout(300).then(() => p.screenshot({ path: `${OUT}/${n}.png` }));

  await p.goto(URL);
  await p.getByRole("button", { name: "Try demo data" }).click();
  await p.getByRole("button", { name: /^7 Hitting/ }).waitFor();
  await shot("sw-01-log");
  ok((await banner().getAttribute("aria-haspopup")) === "dialog", "banner is a button that opens a dialog");
  await banner().click();
  await sheet().waitFor();
  const rows = sheet().getByRole("button", { name: /^P-/ });
  ok(await rows.count() === 2, "sheet lists both patients");
  const first = await rows.nth(0).textContent();
  ok(/Period \d+ · day \d+ of 14/.test(first) && /Last log /.test(first), "rows show period, day and last log: " + first);
  ok((await rows.nth(0).getAttribute("aria-current")) === "true", "current patient is marked");
  ok(await p.evaluate(() => document.activeElement?.getAttribute("aria-current") === "true"), "focus starts on the current patient");
  await shot("sw-02-sheet");
  await p.keyboard.press("Escape");
  ok(!(await sheet().isVisible()), "Esc closes the sheet");
  ok(await p.evaluate(() => document.activeElement?.classList.contains("pt-banner")), "focus returns to the banner");
  await banner().click(); await sheet().waitFor();
  await p.mouse.click(195, 40); await p.waitForTimeout(200);
  ok(!(await sheet().isVisible()), "tapping the backdrop closes the sheet");
  await banner().click(); await sheet().getByRole("button", { name: /^P-DEMO-B/ }).click();
  await p.getByRole("status").filter({ hasText: "Now on P-DEMO-B" }).waitFor();
  ok((await banner().getAttribute("aria-label")).startsWith("Patient P-DEMO-B"), "switch takes effect, banner says P-DEMO-B");
  await shot("sw-03-switched");
  ok(await p.evaluate(() => !document.querySelector(".pt-banner").matches(":focus-visible")), "no keyboard focus ring left after a tap");
  await p.waitForTimeout(4300);
  ok((await p.locator(".switch-notice").textContent()).trim() === "", "confirmation clears after 4 seconds");
  // Search appears with 8+ patients
  await p.locator("nav.tabs button", { hasText: /data/i }).click();
  for (const n of ["P-01", "P-02", "P-03", "P-04", "P-05", "P-06"]) {
    await p.getByRole("textbox", { name: "New patient code" }).fill(n);
    await p.getByRole("button", { name: "Add", exact: true }).click();
    await p.locator("nav.tabs button", { hasText: /data/i }).click();
  }
  await banner().click(); await sheet().waitFor();
  const search = sheet().getByRole("searchbox", { name: "Find a patient by code" });
  ok(await search.isVisible(), "search shows with 8 patients");
  await search.fill("03");
  ok(await sheet().getByRole("button", { name: /^P-/ }).count() === 1, "search filters to P-03");
  await shot("sw-04-search");
  await search.fill("zz");
  ok(await sheet().getByText('No patient code contains "zz".').isVisible(), "empty search result explains itself");
  await sheet().getByRole("button", { name: "Manage patients" }).click();
  ok(p.url().endsWith("#/data") && !(await sheet().isVisible()), "Manage patients opens the Data hub");
  // Dark + desktop look
  const d = await (await b.newContext({ viewport: { width: 1280, height: 860 }, colorScheme: "dark", deviceScaleFactor: 2 })).newPage();
  await d.goto(URL); await d.getByRole("button", { name: "Try demo data" }).click(); await d.waitForTimeout(800);
  await d.getByRole("button", { name: /Choose patient$/ }).click(); await d.waitForTimeout(400);
  await d.screenshot({ path: `${OUT}/sw-05-desktop-dark.png` });
  ok(errs.length === 0, "no console errors " + JSON.stringify(errs));
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
