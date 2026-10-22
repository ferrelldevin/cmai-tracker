// One-off helper: renders public/icon.svg to PNG icons. Needs Playwright (npm i -D playwright).
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const svg = readFileSync(process.argv[2], "utf8");
const b = await chromium.launch();
for (const [size, out] of [[192, "icon-192.png"], [512, "icon-512.png"], [180, "apple-touch-icon.png"]]) {
  const p = await b.newPage({ viewport: { width: size, height: size } });
  await p.setContent(`<html><body style="margin:0">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
  await p.screenshot({ path: `${process.argv[3]}/${out}` });
}
await b.close();
