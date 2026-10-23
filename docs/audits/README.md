# Audits (round 3)

Run on 2026-10-22 against a local production build (`npm run build && npx vite preview`, http://localhost:4173/), Chromium 141 (Playwright build 1194), at commit "Fix small accessibility errors axe found". Raw reports are the other files in this folder.

| Audit | Result | Raw file |
|---|---|---|
| Lighthouse 12.8.2, mobile (default throttling) | Performance 97, Accessibility 100, Best practices 100 (LCP 2.2 s, TBT 10 ms, CLS 0) | `lighthouse-mobile.report.{html,json}` |
| Lighthouse 12.8.2, desktop preset | Performance 100, Accessibility 100, Best practices 100 | `lighthouse-desktop.report.{html,json}` |
| axe-core 4.14.0, WCAG 2.0/2.1/2.2 A and AA tags, 8 screen states x light and dark | 0 violations after fixes (before: 2 rules, 31 nodes per theme) | `axe-wcag22aa.json`, `axe-before-fixes.json` |
| license-checker, all packages | 426 packages; no copyleft | `license-checker-summary.txt` |
| license-checker, production only | 46 packages; no copyleft | `license-checker-production-summary.txt` |

Notes

- **No PWA score.** Lighthouse removed the PWA category in version 12, so there is none to report. Installability was not audited separately.
- **Lighthouse sees one screen.** It loads a fresh profile, which opens on the welcome screen with no patients. The populated screens are covered by axe only.
- **Mobile performance varies** between runs (94 and 97 on two runs of the same build).
- **axe "needs review" items** (not failures): text over the fixed header, nav and toast, where axe cannot work out the background; Recharts SVG axis text; and one-character heat-map cells. The heat-map cell colors were checked by hand: every rating color now meets 4.5:1 in both themes (rating 5 was 3.6:1 light and 4.2:1 dark before the fix; now 5.15:1).
- **Fixed from axe:** (1) the 29 Log buttons had `aria-label="Log <name>"`, which did not contain their visible text (WCAG 2.5.3 Label in Name). The label was removed, so each button's name is its visible text. (2) The in-progress period header used 55% opacity (2.3:1 light, 2.9:1 dark). It is now italic at full color, and in-progress cells get a dashed outline instead of fading.
- **`cmai-tracker@0.1.0 UNLICENSED`** in license-checker is expected: license-checker labels every package with `"private": true` as UNLICENSED whatever its `license` field says. The package is MIT (see `LICENSE`, `NOTICE`).
- **`caniuse-lite` (CC-BY-4.0)** is build-time data pulled in by Babel's browserslist. It is not in the production list and is not shipped.

Re-run axe: `NODE_PATH=<dir with playwright and axe-core> node docs/audits/axe-run.cjs http://localhost:4173/ out.json` against a running preview with an empty browser profile.
