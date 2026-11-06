// Screenshot comparison: the top of Log, Scores, Data and Display at phone size, in light and dark,
// compared pixel by pixel with the baselines in e2e/screenshots/. A screen that changed fails the check
// and saves actual and diff images to the output folder, so a layout change shows up in review as a picture.
// usage: node e2e/screenshots.cjs URL OUTDIR
//        UPDATE_SCREENSHOTS=1 node e2e/screenshots.cjs URL OUTDIR   (rewrite the baselines on purpose)
// Baselines are made on Linux, as in CI. Other systems draw text slightly differently, so there the
// comparison is skipped with a note; CI still runs it on every pull request.
// Fixed clock, time zone and demo data, so the screens are the same on every run.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [URL = 'http://localhost:4173/', OUT = '/tmp/cmai-screens'] = process.argv.slice(2);
const BASE = path.join(__dirname, 'screenshots');
const UPDATE = process.env.UPDATE_SCREENSHOTS === '1';
// Images are compared as averages of BLOCK x BLOCK pixel squares, so a softer or sharper text edge
// averages out while a moved, resized or recolored element still changes whole blocks. A block counts as
// changed when a color channel moves more than PIXEL_TOLERANCE (of 255); a screen fails when more than
// MAX_CHANGED of its blocks changed. A 12 px shift of one element fails it (tested by hand).
const BLOCK = 4;
const PIXEL_TOLERANCE = 24;
const MAX_CHANGED = 0.003;
const ok = (condition, label) => { if (!condition) throw Error('FAIL: ' + label); console.log('ok ' + label); };

const SCREENS = [
  { name: 'log', hash: '#/log' },
  { name: 'scores', hash: '#/scores' },
  { name: 'data', hash: '#/data' },
  { name: 'display', hash: '#/data/display' },
];

(async () => {
  if (process.platform !== 'linux' && !UPDATE) {
    console.log(`ok screenshot comparison skipped on ${process.platform}: baselines are drawn on Linux, and CI runs it on every pull request`);
    return;
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(BASE, { recursive: true });
  // Text is drawn with the system's font hinting and anti-aliasing settings, which differ between Linux
  // machines (the first CI run differed from the cloud session on 3 to 6% of pixels, all text edges).
  // These flags turn both off, so the same build draws the same pixels on any Linux machine.
  const browser = await chromium.launch({
    executablePath: process.env.CHROME || undefined,
    args: ['--font-render-hinting=none', '--disable-lcd-text', '--disable-font-subpixel-positioning', '--force-color-profile=srgb'],
  });
  const now = new Date('2026-01-30T12:00:00-05:00');
  const diffs = [];
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, timezoneId: 'America/New_York', locale: 'en-US', reducedMotion: 'reduce', colorScheme: theme, bypassCSP: true }); // the app CSP blocks the inline style added below
    await ctx.clock.install({ time: now });
    await ctx.clock.setFixedTime(now);
    const page = await ctx.newPage();
    const blank = await ctx.newPage(); // compares images away from the app's Content-Security-Policy
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(URL);
    await page.getByRole('button', { name: 'Try demo data' }).click();
    await page.getByRole('button', { name: /^7 Hitting/ }).waitFor();
    for (const s of SCREENS) {
      await page.evaluate((h) => { location.hash = h; }, s.hash);
      await page.waitForTimeout(400);
      // The "Now on ..." confirmation and any caret blink are not part of the layout.
      await page.addStyleTag({ content: '.switch-notice{visibility:hidden!important} *{caret-color:transparent!important}' });
      await page.evaluate(() => document.fonts.ready);
      const file = `${s.name}-${theme}.png`;
      const shot = await page.screenshot();
      const baseline = path.join(BASE, file);
      // In CI a missing baseline is a failure: a new screen must commit its baseline in the same PR.
      if (!UPDATE && !fs.existsSync(baseline) && process.env.CI) throw Error(`FAIL: no baseline for ${file}; run with UPDATE_SCREENSHOTS=1 and commit e2e/screenshots/${file}`);
      if (UPDATE || !fs.existsSync(baseline)) {
        fs.writeFileSync(baseline, shot);
        ok(true, `${file} baseline ${UPDATE ? 'updated' : 'created'}`);
        continue;
      }
      const result = await compare(blank, fs.readFileSync(baseline), shot);
      if (result.changed > MAX_CHANGED) {
        fs.writeFileSync(path.join(OUT, `actual-${file}`), shot);
        fs.writeFileSync(path.join(OUT, `diff-${file}`), Buffer.from(result.diff, 'base64'));
        diffs.push(`${file}: ${(result.changed * 100).toFixed(2)}% of blocks changed${result.sizeChanged ? ' (size changed)' : ''}; see diff-${file} in ${OUT}`);
      } else ok(true, `${file} matches its baseline (${(result.changed * 100).toFixed(3)}% of blocks differ)`);
    }
    ok(errors.length === 0, `${theme}: no page errors ${errors.join('; ')}`);
    await ctx.close();
  }
  await browser.close();
  ok(diffs.length === 0, `screens match their baselines. If the change is intended, rerun with UPDATE_SCREENSHOTS=1 and commit the new images. ${diffs.join(' | ')}`);
})().catch((e) => { console.error(e.message); process.exit(1); });

// Decodes both PNGs in the browser (no image library needed), counts changed blocks and draws a diff at
// block size: the baseline faded, with changed blocks in red.
async function compare(page, expected, actual) {
  return page.evaluate(async ([a, b, tol, block]) => {
    const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = 'data:image/png;base64,' + src; });
    const [ea, ab] = await Promise.all([load(a), load(b)]);
    const W = Math.max(ea.width, ab.width), H = Math.max(ea.height, ab.height);
    const w = Math.ceil(W / block), h = Math.ceil(H / block);
    // Full size first, then averaged down to one pixel per block.
    const pixels = (img) => {
      const full = new OffscreenCanvas(W, H); full.getContext('2d').drawImage(img, 0, 0);
      const c = new OffscreenCanvas(w, h); const x = c.getContext('2d');
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      x.drawImage(full, 0, 0, W, H, 0, 0, w, h);
      return x.getImageData(0, 0, w, h).data;
    };
    const pa = pixels(ea), pb = pixels(ab);
    const out = new ImageData(w, h);
    let changed = 0;
    for (let i = 0; i < pa.length; i += 4) {
      const diff = Math.max(Math.abs(pa[i] - pb[i]), Math.abs(pa[i + 1] - pb[i + 1]), Math.abs(pa[i + 2] - pb[i + 2]), Math.abs(pa[i + 3] - pb[i + 3]));
      if (diff > tol) { changed++; out.data.set([220, 30, 30, 255], i); }
      else { const g = (pa[i] + pa[i + 1] + pa[i + 2]) / 3; out.data.set([g, g, g, 60], i); }
    }
    const c = new OffscreenCanvas(w, h); c.getContext('2d').putImageData(out, 0, 0);
    const blob = await c.convertToBlob({ type: 'image/png' });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { changed: changed / (w * h), sizeChanged: ea.width !== ab.width || ea.height !== ab.height, diff: btoa(bin) };
  }, [expected.toString('base64'), actual.toString('base64'), PIXEL_TOLERANCE, BLOCK]);
}
