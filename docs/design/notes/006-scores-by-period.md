# 006. Scores by period

2026-10-26 · Register: F-20 · Status: built

## Problem
Devin, 2026-10-26: the Scores page should show what is needed first, one period at a time, with the rest easy to reach. Measured on main with demo data at 390 × 844:
- The period chips chose the period for the status card and the time-of-day chart only. The heatmap, group chart and total chart always showed every period. So "period 3" meant different things on one screen.
- Nothing above the fold said which behaviors drove the period, or whether they were better or worse than the period before. The heatmap held that, but as a 4-column grid that is read cell by cell.
- How much data the numbers rest on (days covered, quiet-day check-ins, review done) was a note or a hidden table row.
- The chosen period lived in component state: a reload, a tab switch or the back gesture lost it.

## Who reads it, and what they ask
The reader is a nurse or lab member at the end of a 14-day period, deciding whether anything needs to change. Their questions, ranked:
1. Is this patient agitated? (the manual's rules, p.5 to 6)
2. Which behaviors drove it?
3. Better or worse than last period?
4. How solid is the data behind it?
5. Detail: when in the day, group averages, the total (secondary, manual p.5).
6. The long-run course across every period.

1 to 4 go at the top of the period. 5 sits below the section bar. 6 is its own page.

## Raw material
- The logs themselves: every tap with its timestamp, and the check-ins. Each period's numbers are rebuilt from them through the engine (`scoreWindow`, `finalRatings`, `summarize`), so nothing new is computed on the screen except the ranking and the words for change.
- Manual p.5 to 7: specific behaviors first, total secondary, within 1 point counts as agreement.
- The engine's existing change rule (`meaningfulChanges`, D-10): 2+ points, or 1 point the same way twice.

## Options
1. **One period per view, a summary on top, all periods on their own page (chosen).** The period is in the URL (`#/scores/p3`). "All periods" (`#/scores/all`) is pushed like a Data page, so Back returns to the period you came from. Trade-off: one more page to know about, so it is linked from the top of every period and from Groups.
2. **One period per view with history in a disclosure at the bottom.** No new route, but the history table and charts make the page long again when opened, and the back gesture cannot close it.
3. **Keep the heatmap on top and highlight the selected column.** Least work, but it does not answer "which behaviors drove it" or "better or worse" in words, and it keeps every period on screen, which is what Devin asked to stop.

Appetite: one focused revision of Scores and its tests. Kill when it needs a scoring, storage or threshold change.

## Decision
- **Period stepper** at the top: Previous, "Period 3 · Oct 12 to Oct 25 · 3 of 4", Next. "In progress" is tagged. Opens on the latest finished period, as before.
- **Summary card** ("Period 3 at a glance"):
  - the three agitation-status tiles, side by side so they take one row on a phone;
  - "Most frequent this period": up to 5 behaviors, highest rating first. Each shows its count and its change in words: "up from 3", "down from 5", "about the same (was 6)", "same as last period", "first period". A behavior getting worse is listed before one getting better at the same rating;
  - coverage: days covered, quiet-day check-ins, and the day-14 review state, with a button to start or finish the review.
- **Below the section bar** (Summary, Behaviors, Time of day, Groups, Total): every behavior seen this period plus any that stopped; time of day; group averages next to last period; total with last period's total and the behaviors that changed.
- **All periods page:** the heatmap, the group trend and the total trend, unchanged in content. Each period's column header opens that period.
- **A period in progress** shows its numbers as "so far" with dashed rating cells, and no change marks, because fewer days always look like improvement.
- **A reviewed rating** says so: "confirmed at review", or "set at review, app said 4".
- **Patient switch:** Scores waits for the new patient's data instead of showing the last patient's numbers for a moment.

## Left out
- Swiping left and right between periods. It conflicts with the iOS back swipe from the edge and with the horizontally scrolling section bar.
- Sparklines inside each behavior row. The word "up from 3" carries the same signal with less to read; worth trying after a 5-second test.
- Target behaviors pinned to the top (F-07): still waiting on the lab.

## Done when
- Status and the top behavior are above the fold on a 390 × 844 phone.
- Every number on the period view belongs to that period.
- The period survives reload and back; All periods returns to where you were.
- The checks in `docs/process/change-process.md` pass.

## Verified
- `tests/periodView.test.ts`: default period, ranking, change words, stopped behaviors, quiet days, codes 8 and 9. `tests/route.test.ts`: period and All periods in the URL.
- `e2e/scores-period.cjs` (15 checks): opens on the latest finished period; status and top behavior above the fold; the top behavior's count matches the logs in storage; Previous and Next; reload; period in progress; All periods and back; a column opens its period without leaving All periods on the history stack; section bar.
- All other `e2e/` suites pass. axe-core 4.10.3 (the version this repo audits with): 84 scans, 0 violations in 4 modes.
- Not yet checked: a real iPhone, and a 5-second test with a nurse or caregiver (V-12, pending).
