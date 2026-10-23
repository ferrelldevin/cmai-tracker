# Heuristic review (Nielsen's 10 usability heuristics)

Reviewer: Claude, one evaluator, 2026-10-22, production build at 390 x 844 and desktop, light and dark themes, demo data. Nielsen recommends 3 to 5 evaluators; one evaluator finds roughly a third of the problems, so treat this as a starting list.

Severity: 0 not a problem, 1 cosmetic, 2 minor, 3 major, 4 catastrophe.

| # | Heuristic | What works | Problems found | Sev |
|---|---|---|---|---|
| 1 | Visibility of system status | Toast after each log with the time; "N today" on each card; "in progress" and "so far" on unfinished periods; unlogged-day count per period; "N of 29 reviewed · saved" on review | The selected resident is easy to miss (walkthrough W1). No sign of when data was last exported. | 3 |
| 2 | Match between system and the real world | Plain labels ("Less than once a week"); behaviors grouped the way caregivers think of them | "P1, P2" column heads need the chip row to decode. "Unlogged days" is explained only in a tooltip and in the selected period's note. | 2 |
| 3 | User control and freedom | Undo on every log; the check-in can be undone; review choices can be reset to "Not reviewed" | No way to edit or delete a log after the toast closes. No way to delete a patient. | 3 |
| 4 | Consistency and standards | Same card and tag styles across screens; bottom tab bar like native apps | Two color meanings: blue ramp for frequency, red and green for agitated status. Acceptable, but worth a legend. | 1 |
| 5 | Error prevention | Patient codes are validated (no names); review shows the app's value next to each choice | Logging against the wrong resident (W1). Easy to tap a neighboring card while scrolling; Undo helps. | 3 |
| 6 | Recognition rather than recall | Each button shows a description and the manual page; exclusions one tap away | The manual page reference assumes the caregiver has the manual. The review screen shows counts but not when they happened. | 2 |
| 7 | Flexibility and efficiency of use | One tap per event | No shortcut to a resident's frequent behaviors; no back-dating (W3, W4). | 2 |
| 8 | Aesthetic and minimalist design | Clean cards; total kept secondary | The Scores screen is long (about 2,500 px on a phone) with five cards, and the explanatory paragraphs stack up. | 2 |
| 9 | Help users recognize, diagnose, and recover from errors | Clear patient-code error message | An export that the browser blocks gives no message. The storage-protection state is shown, but its consequence is explained for iPhone only. | 2 |
| 10 | Help and documentation | Short hints on every screen; scoring spec in the repo | No in-app page on how ratings are worked out; the rule lives only in `docs/scoring-spec.md`. | 2 |

## Fix first

1. Show the resident on the Log screen and in the toast (H1, H5).
2. A "Recent logs" list with edit and delete (H3).
3. A one-screen in-app explanation of how ratings are worked out and what "unlogged" means (H2, H10).

None of these were built in this round.

## Round 4: product design and UX pass (2026-10-23)

Reviewer: Claude, one evaluator, production build in headless Chromium at 390 x 844 (phone) and 1280 x 860 (desktop), light and dark. Standards applied: Nielsen's 10 heuristics (severity scale above), WCAG 2.2 AA (axe-core, plus manual checks of 2.2.1 Timing Adjustable, 2.4.3 Focus Order, 3.3.1 Error Identification), and the mobile conventions shared by Apple's Human Interface Guidelines and Material Design (bottom tab bar with icon and label, 44 pt touch targets, confirm before destroying data, undo for reversible actions, empty and loading states). Before and after screenshots are in the pull request.

### What was missing or broken, and what changed

| Area | Problem (heuristic, severity) | Change |
|---|---|---|
| Mistakes found later | No edit or delete after the 8-second toast (H3, 3) | "Recent logs" on the Log screen: last 24 hours, edit the time, delete. Deleting shows a toast with Undo that restores the log and its details. |
| Logging after the fact | Every log was "now" (H7, 2; walkthrough W3) | Toast has "Time or detail": Just now, 5, 15, 30 or 60 minutes ago, or a clock time, plus "Time is approximate". A clock time later than now means yesterday (a night-shift log after midnight). |
| Undo timing | Toast closed after 8 s even while being used (WCAG 2.2.1) | The timer stops while the toast is open for details, hovered or focused, and restarts when the caregiver leaves it. |
| Double taps | A fast double tap logged two events (H5, 2) | A second tap on the same card within 0.6 s is ignored. Separate events are never that close. |
| First run | Opened on a form with no explanation; three tabs disabled with no reason (H10, 2) | Welcome card: what the app does in three steps, that data stays on the phone, and two buttons (Add a patient, Try demo data). |
| Wrong patient after loading demo data | Pre-existing bug: with a patient open, "Load demo data" switched to the demo patient and then snapped back, because the app checked the new patient against the old list | The data hook now reports which patient its data belongs to; the check waits for that. |
| Loading | With a saved patient, the Data screen flashed before the Log screen on every launch (H1, 1) | A short loading state until local data is read. |
| Storage errors | If the browser blocks storage (some private modes), the app failed silently (H9, 3) | A banner says what happened and what to do. |
| Data management | No way to delete a patient or remove demo data; no way to restore an export (H3, 3) | Patients list with Open and Delete. Delete asks first, names the patient, says it cannot be undone and suggests a backup. "Remove demo data" keeps real patients. "Restore from backup" merges a backup file into the phone, skips exact duplicates, and refuses a wrong file with a readable message. |
| Export | One button fired three downloads at once; iOS Safari and some Android browsers block the second and third (H9, 2). No sign of when data was last exported (H1, 3) | Separate buttons: Download backup (JSON), Logs CSV, Scores CSV. "Last export: today (Oct 23)" is shown. |
| Install | Android had no install button; iPhone steps only (H7, 2) | "Install app" appears where the browser offers it; once installed the card says so. |
| Navigation | Tab labels wrapped to two lines on a phone; tab bar stretched the full width of a desktop screen; no icons (HIG and Material tab bars use icon and label) | Icon plus one-word label (Log, Scores, Review, Data), full names for screen readers, bar centered at content width. A dot on Review when the latest finished period has no review yet. |
| Screen changes | Switching tabs kept the old scroll position; screen readers got no heading (WCAG 2.4.3, 1.3.1) | Each tab starts at the top; focus moves to the screen, which now has a heading. |
| Header | The patient picker had no visible label (W1) | "Patient" label above the picker. |
| Scores, phone | The selected period's chip could be scrolled out of view; status cards took three tall boxes | Selected chip scrolls into view; status is one line per group on a phone. |
| Scores and Review, new patient | Scores showed a grid of 1s with no logs; Review said "opens on day 15" with no date | Empty states with a next step: "Go to Log", and the date review opens. |
| Review | Cards were 20 px wider than the screen; no sense of progress | Fixed the overflow; a progress bar; "Confirm the other N" counts down and disappears at 29 of 29. |
| Help | Rating rules lived only in the repo (H10, 2) | "How ratings are worked out" on the Data screen. The count table is built from the scoring engine itself, so it cannot drift from the rule. Also explains unlogged days and codes 8 and 9, with version and rule version. |
| Small text | 11 px tags and column dates | Raised to 12 px. Code field gets capitals, no autocorrect, Enter submits. |

### Checks

- `docs/audits/axe-run.cjs` (now also covers the first-run screen, editing a recent log, and the delete confirmation): 0 violations on 10 screens, light and dark. The remaining "needs review" items are axe being unable to compute contrast under the floating toast, or on an icon-only glyph.
- End-to-end script (production build, phone size): first run, invalid and valid patient codes, empty states, double tap, back-dating, toast timing, edit and delete with undo, demo load, export, delete patient, remove demo, restore twice (no duplicates), wrong file, review all 29, reload, reload offline. All 26 steps pass with no console errors.
- Unit tests: 44 (38 before, plus 6 for restore, delete patient and remove demo data).

### Next (not built, too large for the interview build)

- Target behaviors pinned to the top of the Log screen (F-07, walkthrough W4). The best fix for the long scroll, but which behaviors to pin is a clinical choice.
- A passcode or encrypted backup (F-10) and multi-caregiver sync (F-11).
- A real-phone pass (V-03): iOS Safari install, haptics (iOS ignores `vibrate`), and the time picker.
