# Cognitive walkthrough: log a hit during a busy shift

Method: cognitive walkthrough (Wharton, Rieman, Lewis and Polson, 1994). For each step, four questions:
**Q1** Will the user try to do the right thing? **Q2** Will they notice the right control is available? **Q3** Will they connect the control with what they want to do? **Q4** After acting, will they see that it worked?

Done by one reviewer (Claude) on the production build, iPhone-sized screen (390 x 844), demo data loaded, light theme, 2026-10-22. A walkthrough predicts problems; it does not replace testing with caregivers (see `think-aloud-script.md`).

## Persona and scenario

**Persona.** A nursing assistant on a unit of 12 residents, two of them tracked in the app. Uses a phone daily; has used the app for a week. Gloves on, interrupted often, has seconds, not minutes.

**Scenario.** At 4:50 pm, resident P-DEMO-A hits her arm during a transfer. She calms him, finishes the transfer, and logs it about 3 minutes later from the hallway.

**Correct action sequence.** (1) Open the app from the Home Screen. (2) Check the right resident is selected. (3) Find "Hitting" on the Log screen. (4) Tap it. (5) Confirm it was logged. (6) Optionally mark the time as approximate and note what happened before (personal care).

## Steps

| Step | Q1 | Q2 | Q3 | Q4 | Finding |
|---|---|---|---|---|---|
| 1. Open app | Yes | Yes (Home Screen icon) | Yes | Yes: opens on the Log screen for the last resident used | Good. Opens straight to Log, no menu. |
| 2. Check resident | **Partly** | **Partly**: the resident code is a small select in the top-right corner | Yes, once seen | n/a | **Risk of logging against the wrong resident.** Nothing near the buttons or in the toast repeats which resident is selected. Severity 3. |
| 3. Find "Hitting" | Yes | Yes: "Aggressive" is the first group; Hitting is the third card and visible without scrolling | Yes: name plus short description | n/a | Good for Hitting. Items in "Other behaviors" sit up to about 3,900 px down the page and need several scrolls. No search. Severity 2 for those items. |
| 4. Tap | Yes | Yes: the whole card is the button (356 x 89 px) | Yes | Toast appears | Good. Large target, far above the 24 x 24 px minimum (WCAG 2.5.8). |
| 5. Confirm | n/a | Yes | Yes | **Yes**: toast "Logged Hitting (including self) at 4:53 PM" with Undo; the card shows "1 today" | Good. The toast stays 8 s, then goes, and cannot be recalled. It does not name the resident (see step 2). |
| 6a. Mark time approximate | **Partly** | **No, until "Add detail" is tapped** | Partly: "Add detail" does not say it holds the time option | Checkbox state visible | The time recorded is the tap time (4:53), not 4:50. Three minutes do not matter for counts, but a longer delay can matter for the 60-minute cluster rule (rating 7) and the time-of-day chart. There is no way to set an earlier time. Severity 2. |
| 6b. Note what happened before | Yes if they care | Yes, inside "Add detail" | Yes: "What happened just before?" | Selected option shows | Fine, but it must be started within 8 s of the tap or the toast closes, and then the detail cannot be added. Severity 2. |

## Problems found

| # | Problem | Severity (0 to 4) | Suggested fix (not built) |
|---|---|---|---|
| W1 | Resident shown only in a small header select; the toast does not name the resident | 3 | Put the resident code in the toast ("Logged Hitting for P-DEMO-A") and as a heading above the grid |
| W2 | Details reachable only for 8 s after the tap | 2 | A "Recent logs" list on the Log screen with edit and delete |
| W3 | No way to log a time other than "now" | 2 | "Happened earlier?" choice: 5, 15, 30 or 60 minutes ago |
| W4 | Long scroll to reach items 20 to 29 | 2 | Let staff pick target behaviors that sort to the top |
| W5 | "Add detail" label hides the time-approximate option | 1 | Rename to "Add time or detail" |

What works: the Log screen opens first, buttons are large, and the toast confirms the item and time and offers Undo.
