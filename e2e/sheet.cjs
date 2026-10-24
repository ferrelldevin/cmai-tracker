// Sheet behavior on a phone: the page behind stays still, a swipe down closes, "Other" takes a note,
// the time reads as tappable. usage: node e2e/sheet.cjs URL OUTDIR
const { chromium } = require("playwright");
const [URL, OUT] = process.argv.slice(2);
const ok = (c, m) => { if (!c) throw new Error("FAIL: " + m); console.log("  ok", m); };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await p.goto(URL);
  await p.getByRole("button", { name: "Try demo data" }).click();
  const item = p.getByRole("button", { name: /^16 Trying/ });
  await item.scrollIntoViewIfNeeded(); await item.tap();
  await p.locator(".snackbar").getByRole("button", { name: "Edit" }).tap();
  const sheet = p.getByRole("dialog", { name: /^Trying/ });
  await sheet.waitFor(); await p.waitForTimeout(300);
  const before = await p.evaluate(() => ({ y: -parseFloat(document.body.style.top || "0"), top: document.body.style.top, pos: document.body.style.position }));
  ok(before.pos === "fixed" && before.top.startsWith("-"), "page is held in place while the sheet is open");

  // Drag on the footer: the page must not move.
  const foot = await sheet.locator(".sheet-footer").boundingBox();
  const pageTop = () => p.evaluate(() => document.querySelector(".log").getBoundingClientRect().top);
  const t0 = await pageTop();
  await p.mouse.move(foot.x + foot.width / 2, foot.y + 10); await p.mouse.down();
  await p.mouse.move(foot.x + foot.width / 2, foot.y - 200, { steps: 8 }); await p.mouse.up();
  await p.mouse.wheel(0, 600); await p.waitForTimeout(200);
  ok(Math.abs((await pageTop()) - t0) < 1, "dragging or wheeling over the footer does not scroll the page behind");
  ok(await sheet.isVisible(), "an upward drag does not close the sheet");

  // Other: a note field appears, saves, and shows in Recent logs.
  await sheet.getByRole("button", { name: "Other" }).tap();
  const note = sheet.getByLabel("What happened?");
  ok(await note.isVisible(), "choosing Other shows a note field");
  ok(await note.evaluate((el) => el === document.activeElement), "the note field takes focus so the keyboard opens");
  const nb = await note.boundingBox(), fb = await sheet.locator(".sheet-footer").boundingBox();
  ok(nb.y + nb.height <= fb.y + 1, "the note field is scrolled clear of the action row");
  await note.fill("fire alarm test");
  await p.screenshot({ path: `${OUT}/sheet-other-note.png` });

  // The time field reads as a control: tinted pill with a clock icon.
  const pill = await p.evaluate(() => { const el = document.querySelector(".time-pill"); const cs = getComputedStyle(el); return { bg: cs.backgroundColor, icon: !!el.querySelector("svg"), radius: cs.borderTopLeftRadius }; });
  ok(pill.icon && pill.bg !== "rgba(0, 0, 0, 0)" && parseFloat(pill.radius) > 20, "time is a tinted pill with a clock icon");

  // A short downward drag on the header springs back; a long one closes.
  const head = await sheet.locator(".sheet-head").boundingBox();
  const hx = head.x + head.width / 2, hy = head.y + 10;
  await p.mouse.move(hx, hy); await p.mouse.down(); await p.mouse.move(hx, hy + 40, { steps: 10 }); await p.mouse.up();
  await p.waitForTimeout(400);
  ok(await sheet.isVisible(), "a short drag down springs back");
  await p.mouse.move(hx, hy); await p.mouse.down(); await p.mouse.move(hx, hy + 260, { steps: 20 }); await p.mouse.up();
  await p.waitForTimeout(500);
  ok(!(await sheet.isVisible()), "dragging the header down closes the sheet");
  const after = await p.evaluate(() => ({ y: window.scrollY, pos: document.body.style.position }));
  ok(after.pos === "" && Math.abs(after.y - before.y) < 2, `page unlocked at the same place (${before.y} → ${after.y})`);
  await p.waitForTimeout(400);
  const recent = p.locator(".recent-list li").first();
  ok((await recent.textContent()).includes("Other (fire alarm test)"), "the note was saved and shows in Recent logs");

  // Flick: a fast short drag on the grab handle closes too.
  await recent.getByRole("button", { name: /Edit/ }).tap(); await sheet.waitFor(); await p.waitForTimeout(300);
  ok((await sheet.getByLabel("What happened?").inputValue()) === "fire alarm test", "reopening shows the saved note");
  const grab = await sheet.locator(".sheet-grab").boundingBox();
  await p.mouse.move(grab.x + grab.width / 2, grab.y + 3); await p.mouse.down();
  await p.mouse.move(grab.x + grab.width / 2, grab.y + 80, { steps: 2 }); await p.mouse.up();
  await p.waitForTimeout(500);
  ok(!(await sheet.isVisible()), "a quick flick down on the handle closes the sheet");

  // Switching away from Other clears the note.
  await recent.getByRole("button", { name: /Edit/ }).tap(); await sheet.waitFor();
  await sheet.getByRole("button", { name: "Mealtime" }).tap();
  ok(!(await sheet.getByLabel("What happened?").count()), "choosing another answer removes the note field");
  await sheet.getByRole("button", { name: "Done" }).tap(); await p.waitForTimeout(300);
  ok(!(await recent.textContent()).includes("fire alarm"), "and the old note is cleared");

  // The patient switcher shares the same sheet: swipe closes it too.
  await p.getByRole("button", { name: /Choose patient$/ }).tap();
  const sw = p.getByRole("dialog", { name: "Choose patient" }); await sw.waitFor(); await p.waitForTimeout(300);
  const sh = await sw.locator(".sheet-head").boundingBox();
  await p.mouse.move(sh.x + 40, sh.y + 10); await p.mouse.down(); await p.mouse.move(sh.x + 40, sh.y + 260, { steps: 20 }); await p.mouse.up();
  await p.waitForTimeout(500);
  ok(!(await sw.isVisible()), "the patient switcher closes with a swipe down too");

  await ctx.close(); await b.close();
  ok(errs.length === 0, "no console errors " + JSON.stringify(errs));
})().catch((e) => { console.error(e.message); process.exit(1); });
