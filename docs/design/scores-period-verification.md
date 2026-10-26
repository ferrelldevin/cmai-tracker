# Scores period revision: verification

2026-10-26 · F-20 · Base: `87d9ad2` · Ready for operator review, not deployed

## Executed checks

- `npm test`: **65 tests pass**. Three new tests cover period-specific filtering, reviewed-down ratings and special codes, and stable selection/fallback. Existing scoring cases remain unchanged.
- Mutation proof: temporarily replaced the behavior predicate with an always-include predicate. The new tests failed as expected; restored the source and all 65 tests passed. This demonstrates detection of behavior leakage rather than execution alone.
- `npm run build`: passes, including the service-worker build. No scoring-engine, dependency manifest, lockfile or storage-schema changes.
- `e2e/scores-period.cjs`: **36 checks pass** using an isolated fictional browser database and a fixed clock. Hand-expected totals 32, 30, and provisional 31; counts and reviewed choices are separately checked. Tests cover end-exclusive boundaries, quiet-day coverage, missing days, special-code exclusions, group average, period switching, keyboard activation, patient switching, reload/tab persistence, all 29 behaviors, history isolation, narrow/desktop widths, forced colors and offline reload. No browser exceptions.
- First phone viewport at 390 × 844: total begins at y=388; first behavior row begins at y=675, above bottom navigation. The initial version put that row at y=799; shortening summary copy and moving explanations into a disclosure corrected it without reducing type size.
- Existing browser suites **all pass**: `flows.cjs`, `navigation.cjs`, `theme.cjs`, `patient-switcher.cjs`, and `sheet.cjs`. These run against the production preview with separate ephemeral browser data.
- axe-core **4.14.0**, WCAG 2.2 AA tags including WCAG 2.1 A: zero violations on the selected-period view and expanded history in light, dark, light high contrast, and dark high contrast. Results: [period audit](screens/scores-period-axe.json).
- Full-app axe harness rerun on baseline and revised builds, with the same browser/checker. **No new violation targets**. Baseline Scores had a patient-banner label/name mismatch; revised Scores has zero violations, including all-29 mode. Existing label/name mismatches remain on Log, Review and Data; this revision does not claim full-app accessibility conformance. [Comparison](../audits/scores-period-comparison.json), [baseline audit](../audits/axe-scores-period-baseline.json), [revised audit](../audits/axe-scores-period.json).
- Before/after phone screenshots in light and dark, plus high-contrast and desktop views, are under `docs/design/screens/` with the `scores-period-` prefix. Demo comparison images use the same demo-data workflow; fixture screenshots illustrate the hand-expected boundary/review cases.

## Limits and outstanding human checks

- No representative-caregiver usability sessions were conducted. Finding a rating, interpreting unknown days, understanding counts versus reviewed ratings, and switching periods without assistance remain unverified with the intended audience. Existing study materials remain under `docs/usability/`; this work does not change their authorization requirements.
- No real iPhone, VoiceOver or TalkBack session was conducted. Browser keyboard/semantic checks and axe are not substitutes for those checks. Axe also reports items requiring human review, retained in the JSON rather than silently counted as passes.
- Loading/error guarding was reviewed in source; no storage-failure injection was performed. Scores wait for data belonging to the selected patient and hide results on a read error.
- No clinical rules, meaningful-change thresholds or agreement-study claims were introduced. App-derived scores remain proposed defaults under the existing review register.
- The change is a draft review branch. Operator approval/merge and a successful Pages deployment are still needed before claiming the public app changed.

## Focused user-validation tasks

Use fictional records and existing authorized study procedures. Ask a participant to identify the selected patient and dates, report Kicking's rating and supporting count, explain why the reviewed rating differs, identify whether missing days mean zero events, switch to P1 and find Hitting, and locate a finished-period comparison. Record answer accuracy, wrong-period errors, assistance, and time per task; compare with baseline without coaching. Set acceptance criteria before sessions. Do not infer results from the author's walkthrough.
