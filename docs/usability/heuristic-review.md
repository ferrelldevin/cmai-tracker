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
