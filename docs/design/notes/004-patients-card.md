# 004. The Patients card: adding and deleting patients

2026-10-25 · Register: F-17 · Status: built

## Problem
Devin's four iPhone screenshots of Data > Patients (light mode, 2026-10-24) show:
- **The example code looked typed in.** The field's placeholder was "P-03" in nearly full-strength text. Tapping Add on what looked like a filled field gave "Use a code like P-03: 2 to 12 letters, numbers or dashes", which reads as "your code is wrong."
- **A heavy yellow ring on the text field** and on Cancel. The global focus style (the high-contrast yellow) applied to every focused input. Cancel was focused by script when the confirm opened, so Safari drew the ring after a tap (the same cause as F-14).
- **The delete confirm was cramped inside the list.** A pink block with the warning, Delete and Cancel was inserted between rows, pushing the list around. Delete came first, where the thumb lands.
- **Old messages stayed.** "Deleted P-01 and all of its logs…" stayed on screen above a new "Delete P-02?" confirm.

## Options
1. **Restyle the inline confirm.** Cheap, but it still pushes the list around and keeps two styles of confirmation in the app.
2. **Confirm in the shared bottom sheet** (as the switcher and log details already do). One pattern for every interruption; the actions sit in thumb reach; Cancel first and Delete on the right, as iOS action sheets do.
3. **Delete with Undo instead of a confirm.** Deleting a patient removes weeks of logs; an 8-second Undo is too thin a safety net for that.

## Decision
**Option 2**, plus fixes to the field.
- **Code field:**
  - A visible label, "New patient code", instead of an aria-label only.
  - The placeholder reads "e.g. P-03", is the next free code, and is lighter.
  - Tapping Add on an empty field says "Type a code first, such as P-03." Typing clears any message.
- **Focus style for text fields:** a 2 px teal outline with a soft teal halo, matching the app accent. High contrast keeps the yellow ring.
- **Delete confirm sheet** (`Sheet.tsx`, no header Close):
  - Title "Delete P-01?"; the warning; "P-01 is the patient open now" when it is; "Export a backup first if you may need them."
  - Footer: Cancel (left) and a solid red "Delete P-01" (right).
  - Opened by tap, the sheet takes focus, so no ring appears. Opened by keyboard, focus starts on Cancel, the safe choice.
  - Esc, tapping outside and swiping down all cancel.
- Opening a delete confirm clears the previous message.

## Left out
- Undo after deleting a patient (option 3). The backup is the recovery path, and the sheet says so.

## Done when
- No ring after a tap; an empty Add explains itself; the confirm is a sheet; stale messages clear.
- All checks in `docs/process/change-process.md` pass.
