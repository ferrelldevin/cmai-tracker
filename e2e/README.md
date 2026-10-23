# Browser checks

These scripts drive the production build in Chromium with Playwright. They are the "Verify" step in `docs/process/change-process.md`, along with `docs/audits/axe-run.cjs`.

```sh
npm run build && npx vite preview --port 4173 &
npm i --no-save playwright axe-core     # once
node e2e/flows.cjs http://localhost:4173/ /tmp/out        # end-to-end flow, including the offline reload
node e2e/navigation.cjs http://localhost:4173/ /tmp/out   # section bars, Data pages, back gesture, reload
node e2e/theme.cjs http://localhost:4173/ /tmp/out        # light/dark/high contrast settings
node docs/audits/axe-run.cjs http://localhost:4173/ docs/audits/axe-wcag22aa.json
```

Set `CHROME` to a Chromium binary if Playwright's own browser is not installed. Each script prints one `ok` line per check, saves screenshots to the output folder, and exits non-zero on the first failure.
