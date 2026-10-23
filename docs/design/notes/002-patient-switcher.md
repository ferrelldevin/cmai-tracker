# 002. Patient switcher

2026-10-23 · Register: F-13 · Status: built

## Problem
Tapping the patient banner opened the phone's own pop-up menu, as Devin's iPhone screenshot of 2026-10-23 shows. That menu:
- **shows codes only.** P-01 and P-02 look alike, with no color badge, no period and day, and no sign of when each patient was last logged.
- **says nothing after a switch.** A mis-tap goes unnoticed, and the next logs go to the wrong patient.
- **leaves the yellow keyboard-focus ring on after a tap.** iOS Safari treats a tapped `<select>` as keyboard focus.
- **covers the banner it is switching,** and becomes a long plain list once there are more than a handful of patients.

Logging against the wrong patient is the costliest mistake in this app. AHRQ's work on identity cues found that showing more than a bare identifier, such as a photo, reduces wrong-patient orders, and that a passive cue works as well as an interrupting alert (design brief, "patient banner" row).

## Options
1. **Keep the native menu and add a confirmation after the switch.** Cheap, but each row is still only a code.
2. **A bottom sheet with rich rows.** This is the pattern of Apple's sheets (Health sharing, Wallet card picker), Material's modal bottom sheet, and Epic's mobile apps. Each row has the color badge, the code, the period and day, and the last log. The current patient is checked, a search box appears once the list is long, and a link leads to patient management. It is built on the native `<dialog>`, which provides focus trapping, Esc to close, an inert background and the top layer.
3. **A full-screen patient list page.** It works, but it is heavier than the task, and it pulls the user out of the screen they were on.

## Decision
**Option 2, plus the confirmation from option 1.**
- The banner is a real button with `aria-haspopup="dialog"`. A button does not keep a focus ring after a tap on iOS, which fixes the stuck yellow ring.
- Each row shows the badge, code, demo tag, "Period N · day X of 14" and "Last logged 2 h ago" (or "No logs yet"). The current patient has a check mark and `aria-current`.
- A search box appears at 8 or more patients, and filters as you type.
- The sheet slides up from the bottom on a phone and sits centered on a desktop. Tapping the backdrop, pressing Esc or tapping Close dismisses it. "Reduce motion" turns the slide off.
- After a switch, a status message says "Now on P-02" for 4 seconds and is announced to screen readers. The banner flashes once.
- The period and day come from one function (`patientPosition`) that uses the same 14-day windows as the scoring engine, so the sheet and the banner can never disagree.

## Left out
- Photos. The app stores codes only, never faces. The color badge stands in for a photo.
- A swipe-down gesture to close the sheet. Close, the backdrop and Esc cover it, and gesture code is easy to get wrong.
- The Android back gesture closing the sheet. It needs the sheet in history; this is noted for a later pass.

## Done when
Switching shows who each patient is before the tap and confirms the result after it, with no stuck focus ring. All checks in `docs/process/change-process.md` pass.
