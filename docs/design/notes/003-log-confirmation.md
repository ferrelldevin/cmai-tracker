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
