// Monte Carlo test of how the app's count-to-rating rule (cmai-count-rule-1) reacts to missed logs.
// Uses the app's own engine (scoreWindow, summarize) and the app's own demo-data generator (seed.ts),
// so nothing about the rule is reimplemented here.
//
// Run from a scratch copy of the app (never inside the network share):
//   cd <scratch>/app && npm ci
//   TZ=UTC APP_DIR=$PWD npx vite-node <agreement>/scripts/simulate-missing-logs.ts -- <agreement>/vignettes.json <out-dir> [reps]
//
// Deletion modes, at 10%, 30% and 50% of a window's logs (exactly round(p * N) logs removed per run):
//   uniform  every log equally likely to be missed
//   busy     a log's chance of being missed is proportional to how many logs (all behaviors) were made that day,
//            so heavy days lose more (weighted sampling without replacement, Efraimidis-Spirakis keys)
import "fake-indexeddb/auto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const appDir = process.env.APP_DIR ?? process.cwd();
const args = process.argv.slice(2).filter((a) => a !== "--");
const [vignettePath, outDir, repsArg] = args;
if (!vignettePath || !outDir) throw new Error("usage: simulate-missing-logs.ts <vignettes.json> <out-dir> [reps]");
const REPS = Number(repsArg ?? 2000);
const RATES = [0.1, 0.3, 0.5];
const MODES = ["uniform", "busy"] as const;
type Mode = (typeof MODES)[number];

const engine = await import(resolve(appDir, "src/scoring/engine.ts"));
const { ITEMS } = await import(resolve(appDir, "src/scoring/items.ts"));
const { loadDemoData } = await import(resolve(appDir, "src/data/seed.ts"));
const { db } = await import(resolve(appDir, "src/data/db.ts"));
const { DAY_MS, WINDOW_MS } = engine;

interface Obs { itemId: number; at: number }
interface Unit { source: string; id: string; windowStart: number; obs: Obs[] }

// ---------- seeded RNG (mulberry32) so results are reproducible
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- units: demo patients (3 complete 14-day windows each) + the 12 vignettes
const units: Unit[] = [];
const NOW = Date.parse("2026-03-02T12:00:00Z");
await loadDemoData(NOW);
const patients = await db.patients.toArray();
for (const p of patients) {
  const all = (await db.observations.where("patientId").equals(p.id).toArray()).map((o: Obs) => ({ itemId: o.itemId, at: o.at }));
  for (let w = 0; w < 3; w++) {
    const ws = p.anchor + w * WINDOW_MS;
    units.push({ source: "demo", id: `${p.id} window ${w + 1}`, windowStart: ws, obs: all.filter((o: Obs) => o.at >= ws && o.at < ws + WINDOW_MS) });
  }
}
const vig = JSON.parse(readFileSync(vignettePath, "utf8"));
const vStart = Date.parse(vig.windowStart);
for (const v of vig.vignettes) {
  units.push({ source: "vignettes", id: v.id, windowStart: vStart, obs: v.events.map((e: { itemId: number; at: string }) => ({ itemId: e.itemId, at: Date.parse(e.at) })) });
}

const score = (u: Unit, obs: Obs[]) => engine.scoreWindow(obs, u.windowStart, u.windowStart + WINDOW_MS + 1);
const finals = (s: { items: { itemId: number; rating: number }[] }) => Object.fromEntries(s.items.map((i) => [i.itemId, i.rating]));

function drop(u: Unit, p: number, mode: Mode, r: () => number): Obs[] {
  const k = Math.round(p * u.obs.length);
  if (k === 0) return u.obs;
  let weight = (_o: Obs) => 1;
  if (mode === "busy") {
    const perDay = new Map<number, number>();
    for (const o of u.obs) { const d = Math.floor((o.at - u.windowStart) / DAY_MS); perDay.set(d, (perDay.get(d) ?? 0) + 1); }
    weight = (o) => perDay.get(Math.floor((o.at - u.windowStart) / DAY_MS))!;
  }
  const keyed = u.obs.map((o) => ({ o, key: Math.pow(r(), 1 / weight(o)) }));
  keyed.sort((a, b) => b.key - a.key); // highest keys are the ones deleted
  return keyed.slice(k).map((x) => x.o);
}

// ---------- run
interface Acc { items: number; changed: number; down1: number; down2: number; down3: number; absSum: number; units: number; totalDropSum: number; flips: number; sevens: number; sevensLost: number }
const blank = (): Acc => ({ items: 0, changed: 0, down1: 0, down2: 0, down3: 0, absSum: 0, units: 0, totalDropSum: 0, flips: 0, sevens: 0, sevensLost: 0 });
const byBand: Record<string, Record<number, { n: number; changed: number; beyond1: number }>> = {};
const results: Record<string, Acc> = {};
const perUnit: string[] = ["source,unit,mode,rate,active_items,mean_items_changed,mean_abs_change,p_agitation_flip,mean_total_drop"];

const baseline = new Map<string, { ratings: Record<number, number>; summary: ReturnType<typeof engine.summarize>; active: number[] }>();
for (const u of units) {
  const s = score(u, u.obs);
  const ratings = finals(s);
  baseline.set(u.id, { ratings, summary: engine.summarize(ratings), active: s.items.filter((i: { count: number }) => i.count > 0).map((i: { itemId: number }) => i.itemId) });
}

let seed = 20261022;
for (const mode of MODES) for (const p of RATES) for (const u of units) {
  const base = baseline.get(u.id)!;
  const r = rng(seed++);
  const key = `${u.source}|${mode}|${p}`;
  const acc = (results[key] ??= blank());
  const bandKey = `${mode}|${p}`;
  const bands = (byBand[bandKey] ??= {});
  let uChanged = 0, uAbs = 0, uFlip = 0, uDrop = 0;
  for (let rep = 0; rep < REPS; rep++) {
    const s = score(u, drop(u, p, mode, r));
    const now = finals(s);
    const sum = engine.summarize(now);
    acc.units++;
    for (const id of base.active) {
      const d = now[id] - base.ratings[id];
      acc.items++;
      const b = (bands[base.ratings[id]] ??= { n: 0, changed: 0, beyond1: 0 });
      b.n++;
      if (d !== 0) { acc.changed++; uChanged++; b.changed++; }
      if (d <= -2) b.beyond1++;
      if (d === -1) acc.down1++; else if (d === -2) acc.down2++; else if (d <= -3) acc.down3++;
      acc.absSum += Math.abs(d); uAbs += Math.abs(d);
      if (base.ratings[id] === 7) { acc.sevens++; if (now[id] !== 7) acc.sevensLost++; }
    }
    const totalDrop = base.summary.total - sum.total;
    acc.totalDropSum += totalDrop; uDrop += totalDrop;
    const flipped = (["aggressive", "physical", "verbal"] as const).some((g) => sum.agitated[g] !== base.summary.agitated[g]);
    if (flipped) { acc.flips++; uFlip++; }
  }
  const n = base.active.length;
  perUnit.push([u.source, JSON.stringify(u.id), mode, p, n, (uChanged / REPS).toFixed(2), n ? (uAbs / (REPS * n)).toFixed(3) : "0", (uFlip / REPS).toFixed(3), (uDrop / REPS).toFixed(2)].join(","));
}

// ---------- write
mkdirSync(outDir, { recursive: true });
const rows = ["source,mode,rate,item_windows,pct_items_changed,pct_down_1,pct_down_2,pct_down_3plus,pct_beyond_1_point,mean_abs_change,mean_total_drop,pct_windows_agitation_flip,rating7_items,pct_rating7_lost"];
for (const [k, a] of Object.entries(results)) {
  const [source, mode, rate] = k.split("|");
  const f = (x: number) => (100 * x).toFixed(1);
  rows.push([source, mode, rate, a.items / REPS, f(a.changed / a.items), f(a.down1 / a.items), f(a.down2 / a.items), f(a.down3 / a.items),
    f((a.down2 + a.down3) / a.items), (a.absSum / a.items).toFixed(3), (a.totalDropSum / a.units).toFixed(2), f(a.flips / a.units),
    a.sevens / REPS, a.sevens ? f(a.sevensLost / a.sevens) : ""].join(","));
}
writeFileSync(resolve(outDir, "robustness-summary.csv"), rows.join("\n") + "\n");
writeFileSync(resolve(outDir, "robustness-by-unit.csv"), perUnit.join("\n") + "\n");
const bandRows = ["mode,rate,original_rating,item_windows,pct_changed,pct_beyond_1_point"];
for (const [k, bands] of Object.entries(byBand)) {
  const [mode, rate] = k.split("|");
  for (const [rating, b] of Object.entries(bands).sort((x, y) => Number(x[0]) - Number(y[0])))
    bandRows.push([mode, rate, rating, b.n / REPS, (100 * b.changed / b.n).toFixed(1), (100 * b.beyond1 / b.n).toFixed(1)].join(","));
}
writeFileSync(resolve(outDir, "robustness-by-band.csv"), bandRows.join("\n") + "\n");
const meta = { ruleVersion: engine.RULE_VERSION, reps: REPS, rates: RATES, modes: MODES, units: units.map((u) => ({ source: u.source, id: u.id, logs: u.obs.length, activeItems: baseline.get(u.id)!.active.length })), demoNow: new Date(NOW).toISOString(), itemsOnForm: ITEMS.length };
writeFileSync(resolve(outDir, "robustness-meta.json"), JSON.stringify(meta, null, 2) + "\n");
console.log(rows.join("\n"));
console.log("\n" + bandRows.join("\n"));
