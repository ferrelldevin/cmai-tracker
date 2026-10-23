// Theme checks: header toggle, Display settings, no wrong-theme flash, Match phone follows the phone. usage: node e2e/theme.cjs URL OUTDIR
const { chromium } = require("playwright");
const [URL, OUT] = process.argv.slice(2);
const ok = (c, m) => { if (!c) throw new Error("FAIL: " + m); console.log("  ok", m); };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "light", deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  // First paint: the theme attribute must exist before the app's script runs.
  await ctx.addInitScript(() => document.addEventListener("readystatechange", () => { if (document.readyState === "interactive") window.__firstTheme = document.documentElement.dataset.theme; }, { once: true }));
  await p.goto(URL);
  const st = () => p.evaluate(() => ({ theme: document.documentElement.dataset.theme, bar: document.querySelector('meta[name="theme-color"]').content, bg: getComputedStyle(document.body).backgroundColor, first: window.__firstTheme }));
  let s = await st(); ok(s.theme === "light" && s.first === "light", "light phone: light from first paint");
  await p.screenshot({ path: `${OUT}/01-welcome-light.png` });
  await p.getByRole("button", { name: "Try demo data" }).click();
  await p.getByRole("button", { name: /^7 Hitting/ }).waitFor();
  await p.getByRole("button", { name: "Switch to dark mode" }).click();
  s = await st(); ok(s.theme === "dark" && s.bg === "rgb(14, 20, 23)" && s.bar === "#0e1417", "header button switches to dark, status bar follows");
  await p.mouse.move(1, 1); await p.waitForTimeout(200);
  await p.screenshot({ path: `${OUT}/02-log-dark-after-toggle.png` });
  await p.reload(); await p.waitForTimeout(400);
  s = await st(); ok(s.theme === "dark" && s.first === "dark", "dark kept after reload, no light flash");
  await p.locator("nav.tabs button", { hasText: /data/i }).click();
  ok((await p.getByRole("link", { name: /^Display/ }).textContent()).includes("Dark"), "Data hub row shows Dark");
  await p.getByRole("link", { name: /^Display/ }).click();
  ok(await p.getByRole("radio", { name: "Dark" }).isChecked(), "settings show Dark selected");
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${OUT}/03-display-settings-dark.png` });
  await p.getByRole("radio", { name: "Light" }).check();
  s = await st(); ok(s.theme === "light", "Light radio switches");
  ok((await p.getByRole("button", { name: "Switch to dark mode" }).count()) === 1, "header button label follows the settings");
  await p.screenshot({ path: `${OUT}/04-display-settings-light.png` });
  await p.getByRole("radio", { name: "High" }).check();
  await p.getByRole("button", { name: "Switch to dark mode" }).click();
  s = await st(); ok(s.theme === "dark" && s.bar === "#000000", "dark + high contrast together");
  await p.screenshot({ path: `${OUT}/05-display-dark-high.png` });
  await p.getByRole("radio", { name: "Standard" }).check();
  await p.getByRole("radio", { name: "Match phone" }).first().check();
  s = await st(); ok(s.theme === "light", "Match phone on a light phone goes light");
  await p.emulateMedia({ colorScheme: "dark" }); await p.waitForTimeout(100);
  s = await st(); ok(s.theme === "dark", "Match phone follows the phone switching to dark live");
  await p.emulateMedia({ colorScheme: "light" }); await p.waitForTimeout(100);
  s = await st(); ok(s.theme === "light", "and back to light live");
  // Keyboard: the header button is reachable and works with Enter.
  await p.getByRole("button", { name: "Switch to dark mode" }).focus(); await p.keyboard.press("Enter");
  s = await st(); ok(s.theme === "dark", "keyboard toggle");
  await ctx.close();
  // A dark phone with an explicit Light choice: light from the first paint.
  const ctx2 = await b.newContext({ viewport: { width: 1280, height: 860 }, colorScheme: "dark", deviceScaleFactor: 2 });
  await ctx2.addInitScript(() => { localStorage.setItem("cmai-theme", "light"); document.addEventListener("readystatechange", () => { if (document.readyState === "interactive") window.__firstTheme = document.documentElement.dataset.theme; }, { once: true }); });
  const p2 = await ctx2.newPage(); await p2.goto(URL);
  const s2 = await p2.evaluate(() => ({ theme: document.documentElement.dataset.theme, first: window.__firstTheme }));
  ok(s2.theme === "light" && s2.first === "light", "dark phone + chosen Light: light from first paint");
  await p2.getByRole("button", { name: "Try demo data" }).click(); await p2.waitForTimeout(800); await p2.mouse.move(1, 1);
  await p2.screenshot({ path: `${OUT}/06-desktop-light.png` });
  await ctx2.close(); await b.close();
  ok(errs.length === 0, "no console errors " + JSON.stringify(errs));
})().catch((e) => { console.error(e.message); process.exit(1); });
