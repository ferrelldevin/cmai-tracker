# 005. App-wide sweep after the Patients card fixes

2026-10-25 · Register: F-18 · Status: built

## Problem
After the Patients card fixes (F-17), Devin asked for every similar case in the app to be found and fixed, along with any other UX, UI or taste problems. The sweep had two parts:
- **A code search** for the same root causes:
  - script focus that Safari draws a ring on;
  - native pop-up menus;
  - inline confirms;
  - messages that stay on screen;
  - placeholders that look like typed values.
- **A screenshot tour** of every screen and state at iPhone size, in light and dark.

What it found:
1. **Review used the phone's native menu 29 times.** Every behavior had a select reading "Not reviewed (use 1)". There was also a select for the period. The switcher's native menu was already replaced for the same reasons (F-13):
   - the iOS picker wheel hides the answer labels;
   - a wall of identical boxes hides which rows are checked;
   - the app's rating colors were missing.
2. **The group chart skipped a label.** Its axis read 1, 2, 3, 4, 5, 7: Recharts drops ticks it thinks will collide. The total chart's axis read 44, 48, 52, 59.
3. **Patient rows wrapped unevenly.** The open patient had Delete on the right; the other patient had Open and Delete pushed to a second line.
4. **The backup page's buttons were ragged:** Download, Logs CSV, then Scores CSV alone, then Restore. Restoring and exporting for researchers are different jobs, but they were mixed together.
5. **Data page messages stayed on screen.** A message such as "Restored 2 new patients…" was still there after leaving the page and coming back.

These were checked and are fine as they are:
- **Script focus:**
  - `main` and section headings take focus without a ring;
  - the Add a patient button focuses a text field, where a focus edge is expected.
- **Confirms:** the only destructive actions are deleting a patient (now a sheet), deleting a log (with Undo), and removing demo data (which can be loaded again).

## Decision
- **Review rows (option chosen: a row and a rating sheet, the same pattern as Log details):**
  - **Each row shows:**
    - the rating in a cell colored with the Scores ramp, dashed while not checked;
    - the behavior;
    - "Logged 14× · app says 5, once or twice a day";
    - its state: "Not checked yet", "✓ Confirmed", or "Changed to several times a day" in amber.
  - **Tapping a row** opens a sheet with all nine answers. Each answer shows its colored number and its label, and the app's own rating is tagged "app".
    - One tap on an answer saves it and closes the sheet: two taps per behavior, as with the select.
    - The footer has "Clear my check" (shown only once checked) and Cancel.
    - A keyboard user starts on the current answer.
  - **The period select** becomes the period chip row used on Scores, scrolled to the selected period.
  - **Saving is unchanged:** the same review records, and "Confirm the other N" stays.
- **Charts:**
  - The group axis shows every tick from 1 to 7.
  - The total axis uses round steps (5, 10, 20 or 50) with a little headroom.
- **Patient rows:**
  - a fixed three-column grid: badge, text, actions;
  - the meta text is shortened to "Since Sep 13" ("Open now · since Sep 13" for the open patient).
- **Backup page:** two labeled groups.
  - **Backup:** Download, Restore, and the last export date.
  - **For the research team:** Logs CSV and Scores CSV, each with a one-line description.
- **Data page messages:** a page's message clears when you leave the page.

## Left out
- **Auto-advance to the next unchecked behavior after choosing.** It is faster, but it moves the screen without being asked. It may be worth trying after real use.
- **The switcher sheet keeps Close in its header.** It is a picker with nothing to save, which is where iOS puts Close. The Log details sheet moved its Done button down because Done saved the changes.

## Verified
- `e2e/navigation.cjs`: the rating sheet opens with no focus ring after a tap, and a choice saves, closes the sheet, and updates the row and the group chip.
- axe: 76 scans, 0 violations in 4 modes, now including the rating sheet.
