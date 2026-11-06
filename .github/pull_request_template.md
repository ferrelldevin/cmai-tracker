## Problem
<!-- Who, when, and the evidence. Register ID (F-xx / D-xx). -->

## Shape
<!-- Options considered, the one chosen and why. Appetite. Link the design note if there is one. -->

## What changes

## States checked
- [ ] Empty, loading, error, first run
- [ ] Phone and desktop
- [ ] Light, dark, light high contrast, dark high contrast
- [ ] Touch targets, keyboard, screen reader
- [ ] Back gesture and reload
- [ ] Offline
- [ ] Reduce motion

## Verified
- [ ] `npm test`, `npm run lint`, `npm run typecheck` and `npm run build`
- [ ] End-to-end flow, including the offline reload
- [ ] axe WCAG 2.2 AA, 0 violations in 4 modes
- [ ] Before and after screenshots
- [ ] Real phone (if install, offline, storage, gestures or keyboard changed)

## Recorded
- [ ] Decision log in `docs/review-register.md`
- [ ] Docs match the code: spec, register row, design note and README say what this PR does, or "not needed, because..."
- [ ] A changed spec rule changes its row in the spec's "Checked by" table and its check together
- [ ] Screenshot baselines updated on purpose (`UPDATE_SCREENSHOTS=1`), if the PR changes how a screen looks
- [ ] Design brief and README, if affected
- [ ] Scoring rule unchanged, or a new `RULE_VERSION` with updated test cases
