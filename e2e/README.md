# Browser checks

To run every check here plus the accessibility audit in one go and get a single report, run `npm run checks` (report in `.checks/report.md`) or `npm run checks:report`, which also pushes the report to the `checks-report` branch. On the home desktop, telling Claude Code "run the CMAI checks" does the second; see `CLAUDE.md`.

These scripts drive the production build in Chromium with Playwright. They are the "Verify" step in `docs/process/change-process.md`, along with `docs/audits/axe-run.cjs`.

```sh
npm run build && npx vite preview --port 4173 &
npx playwright install chromium         # once (Playwright and axe-core come with npm ci)
node e2e/flows.cjs http://localhost:4173/ /tmp/out        # end-to-end flow, including the offline reload
node e2e/navigation.cjs http://localhost:4173/ /tmp/out   # section bars, Data pages, back gesture, reload
node e2e/theme.cjs http://localhost:4173/ /tmp/out        # light/dark/high contrast settings
node e2e/patient-switcher.cjs http://localhost:4173/ /tmp/out  # switcher sheet, Esc, backdrop, confirmation, search
node e2e/sheet.cjs http://localhost:4173/ /tmp/out       # page held still, swipe to close, Other note, time pill
node e2e/screenshots.cjs http://localhost:4173/ /tmp/out  # Log, Scores, Data, Display vs baselines (Linux only)
node docs/audits/axe-run.cjs http://localhost:4173/ docs/audits/axe-wcag22aa.json
```

**Screenshot baselines** live in `e2e/screenshots/`. They are drawn on Linux, as in CI; on Windows and macOS the comparison is skipped with an `ok ... skipped` line, because text is drawn slightly differently there. When a PR changes how a screen looks on purpose, run `UPDATE_SCREENSHOTS=1 node e2e/screenshots.cjs http://localhost:4173/ /tmp/out` on Linux (or ask the cloud session to) and commit the new images, so the reviewer sees the before and after in the diff. A failed CI run uploads the actual and diff images as the `screenshot-diffs` artifact.

Set `CHROME` to a Chromium binary if Playwright's own browser is not installed. Each script prints one `ok` line per check, saves screenshots to the output folder, and exits non-zero on the first failure.

`node e2e/scores-period.cjs http://localhost:4173/ docs/design/screens` checks hand-expected fictional period totals, boundary logs, review overrides, special codes, quiet-day coverage, patient isolation, period persistence, history, phone layout, all four accessibility modes and offline reload. It requires the same Playwright and axe-core tools above. It creates its own isolated browser context and does not read real patient records.
