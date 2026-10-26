// Scores by period (design note 006): opens on the latest finished period, steps between
// periods, keeps the period in the URL through reload and back, opens All periods and
// returns, and the numbers on screen match the engine. usage: node e2e/scores-period.cjs URL OUTDIR
const { chromium } = require("playwright");
const [URL, OUT] = process.argv.slice(2);
const ok = (c, m) => { if (!c) throw new Error("FAIL: " + m); console.log("  ok", m); };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const shot = (n) => p.mouse.move(1, 1).then(() => p.waitForTimeout(250)).then(() => p.screenshot({ path: `${OUT}/${n}.png` }));
  const hash = () => p.url().split("#")[1];
  const label = () => p.locator(".period-step-label b").textContent();

  await p.goto(URL);
  await p.getByRole("button", { name: "Try demo data" }).click();
  await p.getByRole("button", { name: /^7 Hitting/ }).waitFor();
  await p.locator("nav.tabs button", { hasText: "Scores" }).click();
  await p.getByText(/^Period \d+ at a glance/).waitFor();
  const periods = await p.evaluate(() => Number(/of (\d+)/.exec(document.querySelector(".period-step-label .muted").textContent)[1]));
  ok(periods >= 2, `demo has ${periods} periods`);
  ok(await label() === `Period ${periods - 1}`, "opens on the latest finished period, not the one in progress");
  ok(hash() === "/scores", "default period keeps the plain #/scores");

  // Above the fold on a phone: status, the most frequent behaviors, and coverage.
  const fold = await p.evaluate(() => ({
    status: document.querySelector(".status-row").getBoundingClientRect().bottom,
    first: document.querySelector("#sc-summary .beh")?.getBoundingClientRect().bottom ?? 9999,
  }));
  ok(fold.status < 844 && fold.first < 844, `status and the top behavior are above the fold (${Math.round(fold.status)}, ${Math.round(fold.first)} px)`);
  await shot("scores-01-period");

  // Numbers on screen match the engine (summary total and the top behavior's count).
  const fromDb = await p.evaluate(async (n) => {
    const req = indexedDB.open("cmai-tracker");
    const db = await new Promise((r) => { req.onsuccess = () => r(req.result); });
    const all = (store) => new Promise((r) => { const q = db.transaction(store).objectStore(store).getAll(); q.onsuccess = () => r(q.result); });
    const [patients, obs] = await Promise.all([all("patients"), all("observations")]);
    const pt = patients.find((x) => x.id === localStorage.getItem("cmai-patient"));
    const start = pt.anchor + (n - 1) * 14 * 86400000, end = start + 14 * 86400000;
    const counts = {};
    for (const o of obs) if (o.patientId === pt.id && o.at >= start && o.at < end) counts[o.itemId] = (counts[o.itemId] || 0) + 1;
    return counts;
  }, periods - 1);
  const top = await p.locator("#sc-summary .beh").first().textContent();
  const [, id, logged] = /^\d(\d+)\..*?(\d+) logged/.exec(top) ?? /^(\d+)\..*?(\d+) logged/.exec(top.replace(/^\d/, "")) ?? [];
  ok(id && Number(logged) === fromDb[id], `top behavior #${id} shows ${logged} logs, the store holds ${fromDb[id]}`);

  // Step back and forward; each step replaces history, like a tab.
  await p.getByRole("button", { name: "Previous period" }).click();
  ok(await label() === `Period ${periods - 2}` && hash() === `/scores/p${periods - 2}`, "Previous steps back and puts the period in the URL");
  await p.reload(); await p.getByText(/^Period \d+ at a glance/).waitFor();
  ok(await label() === `Period ${periods - 2}`, "reload keeps the period");
  await p.getByRole("button", { name: "Next period" }).click();
  await p.getByRole("button", { name: "Next period" }).click();
  ok(await label() === `Period ${periods}` && await p.getByText("Still in progress").isVisible(), "the period in progress says so");
  ok(await p.getByRole("button", { name: "Next period" }).isDisabled(), "Next is off on the last period");
  await shot("scores-02-in-progress");

  // All periods: pushed, so Back returns to the period it came from.
  await p.getByRole("button", { name: /^All periods/ }).click();
  await p.getByText("Each behavior, period by period").waitFor();
  ok(hash() === "/scores/all", "All periods in the URL");
  await shot("scores-03-all");
  await p.goBack(); await p.getByText(/^Period \d+ at a glance/).waitFor();
  ok(await label() === `Period ${periods}` && hash() === `/scores/p${periods}`, "back gesture returns to the same period");
  const depth = await p.evaluate(() => history.length);
  await p.getByRole("button", { name: /^All periods/ }).click();
  await p.getByRole("button", { name: /open period 1$/ }).click();
  await p.getByText(/^Period 1 at a glance/).waitFor();
  await p.waitForTimeout(200);
  ok(hash() === "/scores/p1", "a period column opens that period");
  ok(await p.evaluate(() => history.length) === depth && await p.evaluate(() => history.state?.cmaiPage !== true), "opening a period pops All periods, so Back will not reopen it");

  // The section bar still jumps.
  await p.locator("nav.tabs button", { hasText: "Scores" }).click(); await p.waitForTimeout(300);
  await p.locator('nav[aria-label="Jump to a section"] a', { hasText: "Groups" }).click(); await p.waitForTimeout(900);
  ok(await p.evaluate(() => document.querySelector('nav[aria-label="Jump to a section"] [aria-current="location"]').textContent) === "Groups", "section bar jumps to Groups");
  await shot("scores-04-groups");

  // Dark mode screenshot of the period view.
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.emulateMedia({ colorScheme: "dark" });
  await p.getByRole("button", { name: /Switch to (dark|light) mode/ }).click(); await p.waitForTimeout(200);
  if (await p.evaluate(() => document.documentElement.dataset.theme) !== "dark") { await p.getByRole("button", { name: /Switch to dark mode/ }).click(); }
  await shot("scores-05-dark");

  ok(errs.length === 0, "no page errors" + (errs.length ? ": " + errs.join(" | ") : ""));
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
