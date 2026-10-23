// Runs every vignette in vignettes.json through the app's own scoring engine and writes app-ratings.csv.
// It does not reimplement any rule: it imports scoreWindow from the app source.
//
// Run from a scratch copy of the app (never inside the network share):
//   cd <scratch>/app && npm ci
//   APP_DIR=$PWD npx vite-node <agreement>/scripts/score-vignettes.ts -- <agreement>/vignettes.json <agreement>/app-ratings.csv
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const appDir = process.env.APP_DIR ?? process.cwd();
const args = process.argv.slice(2).filter((a) => a !== "--");
const [inPath, outPath] = args;
if (!inPath || !outPath) throw new Error("usage: score-vignettes.ts <vignettes.json> <app-ratings.csv>");

const engine = await import(resolve(appDir, "src/scoring/engine.ts"));
const { ITEMS } = await import(resolve(appDir, "src/scoring/items.ts"));

const data = JSON.parse(readFileSync(inPath, "utf8"));
const windowStart = Date.parse(data.windowStart);
const after = windowStart + engine.WINDOW_MS + 1; // window finished, so not provisional

const q = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
const rows = [["vignette_id", "item_id", "item_name", "count", "clustered_days", "app_rating", "app_label", "rule_version"].join(",")];
for (const v of data.vignettes) {
  const obs = v.events.map((e: { itemId: number; at: string }) => ({ itemId: e.itemId, at: Date.parse(e.at) }));
  const score = engine.scoreWindow(obs, windowStart, after);
  if (score.provisional) throw new Error(`${v.id}: window unexpectedly provisional`);
  for (const id of v.ratedItems as number[]) {
    const s = score.items.find((x: { itemId: number }) => x.itemId === id);
    const name = ITEMS.find((i: { id: number }) => i.id === id).name;
    rows.push([v.id, id, q(name), s.count, s.clusteredDays, s.rating, q(engine.RATING_LABELS[s.rating]), score.ruleVersion].join(","));
  }
}
writeFileSync(outPath, rows.join("\n") + "\n");
console.log(`wrote ${rows.length - 1} item ratings to ${outPath}`);
