# 003. The "Logged" confirmation and log details

2026-10-23 · Register: F-15 · Status: built

## Problem
After a tap on a behavior, a confirmation box rises above the tab bar. Devin's iPhone screenshot (dark mode, 2026-10-23) shows the problems:
- **It's too big.** A long behavior name wraps the message to 3 lines. Undo and "Time or detail" sit on their own rows, so the box covers about a third of the screen, right over the list being tapped.
- **The two buttons don't match.** A solid black "Undo" sits next to an outlined "Time or detail", in different places and at different weights. They don't read as a pair of actions.
- **There is a form inside it.** "Time or detail" expands the box into time chips, a time field, a checkbox and the phone's native pop-up menu. The box then grows up the screen. Material's guidance is that snackbars hold brief feedback and at most a short action, with no forms. Apple has no toast at all and puts editing in a sheet.
- **There are two editors for one log.** The box edits a log just made; Recent logs has a second, smaller inline editor with only the time and Delete. Someone who learns one doesn't learn the other.
- **Its colors are fixed hex values,** so the box ignores the high-contrast setting.

## Options
1. **Restyle the box only.** Shorter text and matching buttons. It's cheap, but the form stays inside it.
2. **A compact confirmation plus one "Log details" sheet.** The confirmation is two lines: the behavior name (cut short with "…" if long) and "P-DEMO-B · 7:29 PM". It has two text buttons, **Edit** and **Undo**. Edit opens a bottom sheet, built like the patient switcher, holding every detail of one log. The **Edit** button in Recent logs opens the same sheet.
3. **No confirmation, only the list highlight.** It's the quietest option, but it loses Undo, the main protection against a mis-tap.

## Decision
**Option 2.**
- **Confirmation (snackbar):**
  - **Layout:**
    - A check icon.
    - The behavior name in bold, on one line, cut short with "…" if long. Screen readers still hear the full name.
    - "Logged for P-DEMO-B · 7:29 PM" underneath.
    - Edit and Undo as matching text buttons, at least 44 px tall.
  - **Colors:** it uses an inverse surface (dark on a light screen, light on a dark one), as Material's snackbar does. The colors are now tokens (`--inverse-*`), set separately for light, dark and both high-contrast modes.
  - **Timing:** it closes after 8 seconds. The timer pauses while a finger, mouse or keyboard focus is on it (WCAG 2.2.1, unchanged).
  - **Deletes:** after a delete it reads "Deleted for P-DEMO-B · 7:29 PM" with Undo only.
- **Log details sheet** (`LogSheet.tsx`, on a shared `Sheet` component that the patient switcher now uses too):
  - **Header:** the behavior name as the heading, and the patient and log time under it.
  - **"When did it happen?":**
    - chips "When I logged it", "5 min before", "15 min before", "30 min before", "1 hr before";
    - a time field.
    - The chips count back from when the log was made, so they mean the same thing for a log made now and for one made hours ago.
  - **Rest of the sheet:**
    - "Time is approximate" checkbox.
    - **"What happened just before?":**
      - The answers are tappable chips instead of the native pop-up menu.
      - Tapping the chosen chip again clears it.
      - It stays optional.
  - **Footer:** Delete (danger outline) and Done.
  - **Saving:** changes save as they're made, as before, so closing the sheet any way loses nothing.
  - **Focus:** starting focus follows how the sheet was opened (note 002 follow-up). A tap gives no focus ring; the keyboard starts on the first chip.
- **Recent logs:** the inline editor is removed. Each row's Edit button opens the same sheet.

## Left out
- **Swipe to dismiss the confirmation.** It disappears on its own; gesture code is easy to get wrong (same call as note 002).
- **Changing which behavior a log is for.** Delete and re-log does it, and keeps the audit trail simple.

## Done when
- After a tap, the confirmation is two lines with matching Edit and Undo.
- All editing of a log happens in one sheet, reached the same way from the confirmation and from Recent logs.
- All checks in `docs/process/change-process.md` pass.

## Follow-up, 2026-10-24: tidier details sheet
**Problem.** Devin reviewed the first build of the sheet and said it "could use some attention." It had:
- 13 chips of the same weight in two ragged blocks.
- Two ways to close it: Close in the header and Done in the footer.
- A full-size red outlined Delete beside Done.
- A plain checkbox.

**Decision.** The sheet now uses the grouped-form layout found in iOS and Material settings sheets:
- **Header:** one primary **Done**. The sheet saves as you go, so Close and Done meant the same thing.
- **"When it happened":** a grouped card with three rows.
  - A Time row with the time field.
  - A five-way control: "At log · 5 min · 15 min · 30 min · 1 hr", under the hint "How long before you logged it". Screen readers hear "15 min before logging".
  - "Time is approximate" as a switch (`role="switch"`).
- **"What happened just before":** an even two-column grid. The chosen answer is tinted and shows a check, and tapping it again clears it.
- **Delete log:** a quiet red text button at the end. Undo still follows a delete.
- **Keyboard:** a keyboard user starts on the time field.

**Revised the same day, from Devin's comment on the screenshot.** The Done button moves out of the header and into one action row pinned at the bottom: Delete log on the left, Done on the right. The header holds only the title. The row stays in thumb reach however far the form scrolls. Done is the right word rather than Save, because every change already saves as it is made. Esc and tapping outside still close the sheet without losing anything.

## Follow-up, 2026-10-24: iPhone test of the sheet (F-16)
Devin tested the merged sheet on his iPhone and found three problems:
1. **A drag on the sheet footer scrolled the page behind it, and a swipe down did not close the sheet.** iOS Safari lets a scroll that starts on a modal `<dialog>` move the page underneath. The grab handle also suggests a swipe that wasn't wired up.
   - **Fix:** while a sheet is open, the page is held in place: the body is fixed at its scroll position and restored exactly on close.
   - **Fix:** a downward drag on the handle, header or footer moves the sheet with the finger. It closes past 100 px or on a quick flick, and springs back otherwise.
   - These parts use `touch-action: none`, and a drag never also presses a button.
   - The form keeps scrolling normally, and both sheets get this behavior because they share `Sheet.tsx`.
2. **"Other" had no way to say what.**
   - **Fix:** choosing Other shows a "What happened?" field ("A few words, no names", 120 characters max). It takes focus, so the keyboard opens and the field scrolls clear of the action row.
   - **Storage:** the note is saved as `beforeNote`. It appears in Recent logs, the JSON backup and restore, and a new `before_note` CSV column.
   - Choosing another answer removes the note. No schema version change is needed, because the field is not indexed.
3. **The time didn't always look tappable.** On iOS a time input renders as bare text.
   - **Fix:** it now sits in a tinted pill with a clock icon, and in Chrome the whole pill opens the picker.

**Verified.**
- `e2e/sheet.cjs`: 17 checks (scroll lock, drag and flick, spring-back, note flow, pill).
- `tests/manage.test.ts`: the note survives a restore and appears in the CSV.
- axe: 72 scans, 0 violations, now including the note field.

## Follow-up, 2026-10-26: the keyboard covered the note (F-19)
**Problem.** On his iPhone, Devin tapped Other in Log details. The keyboard opened, but the "What happened?" field stayed hidden behind it. iOS Safari does not resize the page for the keyboard: it shrinks only the *visual* viewport. A dialog pinned to the bottom of the page therefore stays where it was, under the keyboard. The scroll-into-view from F-16 worked out where the field was, but it measured against the full screen.

**Fix.** It is in the shared `Sheet.tsx`, so every sheet gets it.
- While a sheet is open, it listens to `visualViewport` resize and scroll events.
- It writes the keyboard's height (`--kb`) and the visible height (`--vvh`) onto the dialog:
  - the sheet's bottom margin becomes `--kb`, so it sits right on the keyboard;
  - its maximum height becomes `--vvh` minus a small gap, so it still fits on screen.
- The focused field is then scrolled back into view inside the sheet.
- While the keyboard is up, the home-indicator padding is dropped.
- When the keyboard closes, the sheet returns to the bottom.

**Verified.** `e2e/sheet.cjs` stands in for iOS's `visualViewport` and raises a 336 px keyboard. It then checks that:
- the sheet sits on the keyboard;
- the sheet still fits on screen;
- the note field stays in view above the action row;
- the sheet returns to the bottom when the keyboard closes.

The check fails on the code before this fix and passes after it. A real iPhone check is still needed (Chromium has no on-screen keyboard).
