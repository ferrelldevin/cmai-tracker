# Design brief: CMAI Tracker visual redesign (round 5)

2026-10-23. What the best healthcare products and public health design systems do, and how this app now follows them. The tokens live in `src/styles.css`.

## Who it is for

A caregiver or nurse on a phone, often rushed, often mid-shift, sometimes at night, sometimes older or with reduced vision. They log a behavior in the moment and look at trends every two weeks. Getting the patient wrong or misreading a rating is the costly mistake. A plain look is fine here. Being slow or hard to read is not.

## What the research says

| Practice | Where it comes from | What the app does now |
|---|---|---|
| A small, fixed palette. Colors come from variables with fixed jobs, and meaning never relies on color alone. Aim for AAA contrast where possible. | NHS design system, colour ([service-manual.nhs.uk](https://service-manual.nhs.uk/design-system/styles/colour)) | One brand color (care teal) for actions and data. Amber only for "meets agitated rule". Red only for errors and deleting. Every status has an icon and words as well as a color. Body text is 15:1, secondary text 6:1. |
| A yellow focus ring with a dark edge, visible on any background | NHS (focus #ffeb3b); GOV.UK uses the same pattern | One focus style everywhere: 3px yellow ring with an ink edge. |
| Contrast by lightness grade, not by eye | USWDS color grades and "magic number" ([designsystem.digital.gov](https://designsystem.digital.gov/design-tokens/color/overview/)) | Every text and color pair was measured. The rating ramp switches from ink to white text at the step where contrast would fall below 4.5:1. |
| Avoid red-green pairs, keep risk colors the same across all screens, show trends with lines and arrows, and use modal alerts sparingly | Better (healthcare design system), patient safety ([blog.better.care](https://blog.better.care/how-a-design-system-for-healthcare-can-ensure-patient-safety?hsLang=en)) | The old red and green status boxes are now neutral with a check, or amber with a warning sign. Nothing is red unless it is an error. No pop-up dialogs, only inline confirmation. |
| Chart colors that people with color-vision deficiency can tell apart | Okabe and Ito palette (Color Universal Design) | The three group lines use Okabe-Ito blue, vermillion and bluish green, and each also gets its own line pattern (solid, dashed, dotted). |
| A typeface built for legibility | Braille Institute's Atkinson Hyperlegible, made for low-vision readers, with letters that are hard to mix up (I, l, 1; O, 0). The Next version came out in 2025. SIL Open Font License ([Wikipedia](https://en.wikipedia.org/wiki/Atkinson_Hyperlegible)) | Atkinson Hyperlegible Next, bundled with the app so it works offline. The slashed zero is deliberate: patient codes such as P-07 cannot be misread. |
| Bigger text and targets for older users, simple and visible errors, and no drastic changes to key steps | NN/g: users over 65 succeeded on 55% of tasks against 75% for younger users, and blamed themselves 90% of the time ([nngroup.com](https://www.nngroup.com/articles/usability-seniors-improvements/)) | 17px body text (the iOS default), 15px minimum for secondary text, and 48px buttons. Logging works the same way as before, one tap. |
| A patient banner that names the patient on every screen. A passive identity cue works about as well as an interrupting alert. | AHRQ: patient photos in the record reduced wrong-patient orders, and a passive banner did as well as a pop-up ([digital.ahrq.gov](https://digital.ahrq.gov/program-overview/research-stories/displaying-patient-photos-medical-records-reduces-errors-improves)) | A sticky patient banner with a colored badge per patient (a stand-in for a photo, since this app uses codes, never faces), the code, and the period day. Tapping the banner switches patient. |
| A color per family member in a feed, plus quick access to the most-used actions | Epic MyChart's patient-designed redesign ([epic.com](https://www.epic.com/epic/post/idea-reality-new-patient-designed-mychart-experience)) | The same color per patient appears in the banner and the patient list. Jump chips take you straight to a behavior group. |
| Large, high-contrast text for people on the move; easy-to-hit controls; clear feedback when something starts or stops | Apple HIG, Workouts ([developer.apple.com](https://developer.apple.com/design/human-interface-guidelines/workouts)) | Each log gives a row flash, a haptic tick on Android, and a toast with a check icon and Undo. |
| Bottom navigation with icon and label, and an active "pill" behind the icon | Material 3 navigation bar; Apple tab bars | Four tabs, each an icon with a one-word label. The active tab has a teal pill. A dot on Review when a review is due. |
| A calm, warm canvas instead of clinical gray | One Medical ("no detail is too small" to make care less stressful) and Headspace use warm neutrals ([onemedical.com](https://www.onemedical.com/brand-guidelines/)) | Warm off-white canvas (#f6f5f1) with white surfaces and quiet shadows. Dark mode uses deep slate, not pure black, for night shifts. |
| Habits form when the action is easy, a prompt arrives at the right moment, and there is quick positive feedback | Fogg Behavior Model, B = MAP ([summary](https://www.thebehavioralscientist.com/?p=3058)). It has limited peer-reviewed validation, so treat it as a guide. | Ability: one tap, with the definition on the row. Prompt: "End of shift" check-in, and the Review dot. Feedback: the flash and the check toast. |
| No streaks, points or badges in health tracking. They can manipulate, make people feel defeated, and push people to chase the reward. | Ethics of gamification in health tracking ([MDPI IJERPH 2021](https://mdpi.com/1660-4601/18/21/11052)) | Deliberately left out. A logging streak would reward logging for its own sake and bias the counts the ratings come from. |

## The system

- **Color tokens:** canvas, surface, rule, text and muted text; one accent (teal #0b6b66, 6.4:1 with white); attention (amber #9a4d00); danger (#b42318); a 7-step teal rating ramp; three Okabe-Ito chart colors. Each has a dark-mode value of the same role, with contrast measured again.
- **Type:** Atkinson Hyperlegible Next at 400, 600 and 700. Sizes 13, 15, 17, 20 and 24px.
- **Space and shape:** 4-point spacing (4, 8, 12, 16, 24, 32). Radius 14px for cards and 10px for controls; pills for chips and tags.
- **Hierarchy per screen (MC-6):** on Log, the primary element is the behavior rows, the secondary is the patient banner, and the tertiary is the hint and recent logs. On Scores, the primary is the status and the heatmap; the total stays secondary, as the manual advises. On Data, the primary is the welcome card on first run, otherwise the patients list.
- **Patient switcher (round 9):** tapping the banner opens a sheet that shows, for each patient, the color badge, the code, the period and day, and the last log, with the current patient checked. A switch is confirmed with "Now on P-02" and a banner flash. Reasons: `docs/design/notes/002-patient-switcher.md`.
- **Log confirmation (round 11):** after a tap, a two-line confirmation (behavior, patient and time) offers Edit and Undo on an inverse surface. Edit, here and in Recent logs, opens one Log details sheet: when it happened, approximate, and what happened before as chips. Reasons: `docs/design/notes/003-log-confirmation.md`.
- **Patients card (round 12):** the code field has a visible label and an "e.g." example of the next free code. Deleting a patient confirms in the shared bottom sheet, Cancel first and Delete on the right. Text fields focus with a teal outline and halo (yellow only in high contrast). Reasons: `docs/design/notes/004-patients-card.md`.
- **Review (round 13):** each behavior is a row with its rating in the Scores colors (dashed until checked) and a state line. A tap opens a rating sheet with all nine answers, and the app's rating is tagged. Periods are chips, as on Scores. Reasons: `docs/design/notes/005-app-sweep.md`.
- **Navigation (round 8):** no screen is a long unbroken scroll. Log, Scores and Review have a pinned section bar under the patient banner that marks where you are and jumps on tap. Data is a hub with a page per job. The back gesture and a reload behave as on a native app. Reasons and options: `docs/design/notes/001-navigation.md`.
- **Light and dark (round 7):** the theme is a setting, not just a media query. `src/ui/display.ts` resolves the choice (Match phone, Light or Dark; Match phone is the default and follows the phone's Dark Mode live) and writes one attribute, `data-theme="light|dark"`, on `<html>`. All dark styling hangs off that attribute, so the phone setting and the user's choice can never disagree. A copy of the resolver runs inline in `index.html` before the first paint, so a stored choice never flashes the other theme on launch. The status-bar color (`theme-color`) and the browser's own controls (`color-scheme`) follow the theme too. Transitions are switched off for the frame the theme changes, so colors swap at once instead of fading piece by piece. A sun or moon button in the header flips between light and dark in one tap; Data, then Display has the full choice as a segmented control (real radio buttons, a check mark on the chosen one).
- **High contrast (round 6):** a Display setting on the Data screen with three choices: Match phone (the default, which follows iOS "Increase Contrast" and the Android and Windows equivalents through `prefers-contrast: more`), Standard and High. High swaps in a second token set: black or white text, every text pair at 7:1 or better (WCAG AAA), 2px outlines on cards, rows and controls, no decorative shadows or tints, and a rating ramp that keeps its number on every cell. Dark mode has its own high-contrast set. Windows forced-colors mode keeps the cues that were drawn with background color only (selected tab, chosen chip, rating cells).
- **Motion:** a 0.9s row flash on log, and smooth scrolling for the jump chips. Both are turned off under "reduce motion".

## Scores period overview (2026-10-26)

The total and behavior ratings now appear first for one selected period, following the operator's request. The total remains secondary in size and interpretation. Status, group values, counts, coverage and time of day follow the same period; finished-period history is a separate disclosure. Existing tokens and navigation components are reused. Rationale and options: [design note 006](notes/006-scores-by-period.md). Executed checks and remaining human validation: [verification record](scores-period-verification.md).

## Checked

- axe-core WCAG 2.2 AA: 0 violations on 10 screens in each of four modes: light, dark, and both with high contrast (`docs/audits/axe-wcag22aa.json`).
- The 26-step end-to-end flow passes. The font loads while offline.
- Unit tests: 53 pass.

## Not done

- Testing on a real iPhone, and with real caregivers (V-03, V-09).
- Pinning target behaviors to the top of Log (F-07). This is a clinical choice, so it waits for the lab.
