# 006. Scores belong to the selected period

2026-10-26 · Register: F-20 · Status: implemented; verification recorded below

## Problem and evidence

The operator asked to see one period's behavior scores and data at a time, with totals and behavior scores toward the top. Source inspection found that `ScoresScreen.tsx` scoped status and hourly counts to the selected window, but its behavior filter searched all windows, its heatmap rendered all windows, and group/total charts always rendered history. The selector therefore had different meanings within one screen. The existing heuristic review also records stacked explanations and an overly long Scores screen.

## Source hierarchy

- Operator request, 2026-10-26: total and behavior ratings near the top; period-specific data; supporting detail easy to find.
- `docs/scoring-spec.md` sections 5–7: preserve review overrides, special codes, fixed windows, provisional results, coverage warnings, and existing change marks. Individual behaviors remain primary; total secondary.
- `docs/design/design-brief.md`: existing type, tokens, patient context, themes, contrast and motion.
- `docs/design/notes/001-navigation.md`: retain shared section navigation and reload behavior.
- `docs/design/notes/005-app-sweep.md`: visible period chips, readable review sources, existing chart semantics.
- `docs/usability/heuristic-review.md`: existing review is one evaluator's assessment, not a caregiver study.
- `docs/process/change-process.md`: shape, state coverage, verification, draft PR and operator merge.
- Healthcare UX card MC-130 (dormant, Notion page `402b9c01-4a63-81b9-aad5-fc3db6a15fe7`) informed the prior design; it is not new clinical evidence. Testing and copy follow MC-93 and MC-62 respectively.

## Task analysis and raw records

Arrival questions: whose record, which dates, ended or in progress, what ratings and total, and how complete is the observation record? Then: which counts/review choices explain a rating, what group/hourly patterns occur in this period, and how do finished periods compare?

Start from fictional timestamped occurrences, quiet-day check-ins, and caregiver review records. The engine derives 1–7 ratings; caregiver review supplies final choices; summary excludes 8/9. Coverage is derived separately from activity, never inferred from a rating of 1. The screen reads these existing outputs without changing the scoring rule.

Hand expectations in `e2e/scores-period.cjs`: P1 has five Hitting logs (rating 4), other ratings 1, total 32; two log days plus one quiet check-in leave 11 of 14 days unknown. P2 has one Kicking log (derived 2, reviewed 4), Hitting reviewed 8 and Spitting reviewed 9: 27 included items, total 30, aggressive mean 10/7 = 1.43, 13 unknown days. A log exactly at the window boundary belongs to P2. Open P3 has two Grabbing logs (rating 3), total 31, explicitly so far. Another patient has Pacing only. A quiet-only patient tests missing observations independently from missing activity.

## Options and choice

1. **One period overview, supporting sections, history disclosure (chosen).** Total and behavior scores immediately follow period context. Group values, status and hourly counts follow. History requires an explicit action. Reuses SectionNav and chips; no new route or bottom tab. Trade-off: the period's behavior list can still require scrolling when all 29 are requested.
2. **Period overview plus separate detail subpages.** Shorter initial page, but adds routes/back navigation for closely related data and separates ratings from their counts. More navigation work for this task.

Choice is implementation judgment, backed by the existing navigation pattern and the operator's scope. Default remains latest ended period, or the only open period, consistent with the previous behavior. The chosen period is in the URL (`#/scores/p2`), so reload and a shared link keep it; the app also remembers each patient's choice, so leaving Scores and coming back keeps it (see Additions). Previous/Next and compact period buttons support many periods. Switching period collapses history. Patient switches wait for that patient's data to load, avoiding stale results during the read.

Appetite: one focused Scores-page revision and its tests. Kill when: it would require changing scoring, storage schema, clinical thresholds, or other product screens.

## State coverage

- First run/no activity: existing Go to Log path; quiet-day activity also permits scores.
- Loading/error: existing App storage error banner; Scores waits for the selected patient's load rather than showing stale values.
- One/many periods: boundary buttons disabled appropriately; horizontal chip row, keyboard buttons with pressed state; stable start identity rather than array position.
- Empty period: coverage plus explicit no logged/reviewed behaviors; all 29 remain available.
- Open period: so-far labels; excluded from history; no fabricated comparison.
- Review override: source and app suggestion are visible beside the frequency label and separate count.
- Special codes: visible by label and excluded-count explanation.
- Quiet/unlogged: coverage remains separate from scores and unknown days are flagged.
- History: finished periods only; existing change rule; numeric tables also provide chart data for assistive technology.
- Phone/desktop, four display modes, forced colors, reduced motion, keyboard, offline reload: automated browser checks. Human screen-reader comprehension and real iPhone behavior require operator/participant checks; they are not inferred from axe.

## Done when

1. Total and the first behavior score begin within the initial phone viewport; every overview section updates to one period.
2. Independent hand expectations and browser checks detect period/patient leakage, code exclusions, coverage and provisional-state errors.
3. Tests/build and existing relevant browser checks pass; screenshots and axe results are available; remaining human checks are explicitly unverified.

## Verification

See `docs/design/scores-period-verification.md` for executed results and limitations. No representative-user sessions were run. No clinical validation claim is made.

## Additions after comparing two builds (2026-10-26)

Two builds of this change were made: this one (Codex) and a Claude build (PR #15, closed). Devin picked this layout, plus two pieces from the other build and fixes for three rough edges found in a phone walkthrough.

- **Change since last period on every behavior row**, in words under the rating label: "Up from 3 ↑", "Down from 5 ↓", "About the same (was 6)", "Same as last period", "First period". It uses the engine's existing rule (D-10: 2+ points, or 1 point the same way two periods running), so it agrees with the History arrows. A single 1-point move is within how much two raters differ (manual p.7), so it reads "about the same". A period in progress shows "Last period N" with no judgment, and codes 8 and 9 are never compared. Reason: "better or worse than last period" is the question a nurse brings to a period, and it was only answerable by opening History.
- **The period in the URL** instead of session storage: `#/scores/p<n>`, replacing the history entry like a tab. A reload, a shared link and leaving Scores and coming back all keep it (the app remembers the last period per patient). Switching patient reopens on that patient's own choice, so period numbers never carry across patients.
- **Fixes:**
  - Previous and Next are now arrow icon buttons (44 px), so P1 to P4 fit beside them at 390 px instead of scrolling out of sight.
  - When the page shows an earlier period, the date line adds "period 4 is in progress", matching the banner's "Current: Period 4".
  - The History table follows "Show all 29 behaviors" like the table above it, instead of always listing all 29.

Verified: unit tests for `changeSince` and the period route; `e2e/scores-period.cjs` adds checks for the change wording, the URL and the in-progress line; all other e2e suites pass; axe-core 4.10.3 shows 0 violations in 4 modes.
