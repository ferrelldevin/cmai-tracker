# How a change gets made

Every feature or change to CMAI Tracker goes through the same route, small or large. A small change moves through it in minutes. The steps only get skipped on purpose and on the record, never by accident.

The route is the one product teams with a design system use (problem first, shaped before built, every state designed, verified in every mode, recorded), cut down to a one-person project.

## 1. Problem
- Say who has the problem and when: a caregiver mid-shift, a nurse at the day-14 review, a rater reading exports.
- Bring evidence: something measured (page height, tap count, contrast ratio), a heuristic finding from `docs/usability/`, or what someone said.
- Give it an ID in `docs/review-register.md` (F- for a feature, D- for a scoring decision). A scoring change also needs a new `RULE_VERSION` (see the register).

## 2. Shape
- Write at least two options and recommend one, with the trade-offs.
- Set the **appetite** (how much time the change is worth) before the scope, plus **done when** and **kill when**.
- Anything that changes navigation, data or scoring gets a design note in `docs/design/notes/` (problem, options, decision, what was left out). A small polish fix can use the PR description instead.
- Look for an existing pattern first: a token in `src/styles.css`, a component in `src/ui/`, or an established platform pattern (Apple HIG, Material, NHS, USWDS). New patterns need a reason.

## 3. Design every state
Before building, list what the change looks like in each of these. The PR checklist repeats them.
- **Data states:** empty, loading, error, one item, many items, first run.
- **Sizes:** phone (390 px wide) and desktop.
- **Modes:** light, dark, and both with high contrast. Colors come from tokens only, never hard-coded.
- **Input:** touch (targets of 44 px or more), keyboard (visible focus, logical order), and screen reader (names, roles, headings, live messages).
- **Navigation:** the back gesture or button does what people expect, and a reload lands in the same place.
- **Offline:** works with no signal once installed.
- **Motion:** respects "reduce motion".

## 4. Build
- On its own branch, one change per PR.
- Logic gets unit tests first (`tests/`). UI uses shared components and tokens, with no one-off styles.
- Plain-language copy: short, active, no jargon, the same words as the rest of the app.

## 5. Verify
- `npm test` and `npm run build` pass.
- The browser checks in `e2e/` pass against the production build: the end-to-end flow (including the offline reload), navigation and theme. A new feature adds its own checks there.
- `npm run checks` runs flows, navigation and scores-period in one go and writes one report; `npm run checks:report` also pushes it to the `checks-report` branch so a cloud session can read it.
- axe-core WCAG 2.2 AA shows 0 violations in all four modes (`docs/audits/axe-run.cjs`).
- Before and after screenshots, on a phone size, in light and dark.
- A real phone check when the change touches install, offline, storage, gestures or the keyboard.

## 6. Record
- A decision-log row in `docs/review-register.md`. Anything that needs the lab's approval is added there as an open item, and it does not block the demo.
- Update `docs/design/design-brief.md` if the design system changed, and `README.md` if what a user sees changed.

## 7. Ship
- A draft PR using the template, with the screenshots attached. CI must be green.
- Devin marks it ready and merges. The Pages deploy runs on merge; confirm it went live.

## Definition of done
The problem is recorded, the shape is written down, every state above is handled, every check in step 5 passed, the register and docs are updated, and the change is live.
