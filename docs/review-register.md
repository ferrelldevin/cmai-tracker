# Review register

This file lists everything in the app that still needs a decision, approval or independent check. It also records who signs off on each item and when. Every open item in the repo is listed here, so nothing has to be pieced together from the spec, the README and the study notes.

## How to read it

**Gates.** Each item is tied to the earliest point where it has to be settled.

| Gate | When | Who owns it |
|---|---|---|
| **G0: Interview demo** | Now. The app has to work properly for the hands-on interview. | Devin |
| **G1: Lab adoption** | After Devin joins the lab, and only if the lab decides to use this app. | Professor Gupta and the lab |
| **G2: Real-world use** | Before any real caregiver logs a real resident. | The lab, the ODU IRB, and the CMAI copyright holder |

Nothing at G1 or G2 blocks the interview demo. Until an item is signed off, the app uses the default in the "In this build" column. That default is labeled in the app or the docs, so no one mistakes it for an approved rule.

**Status.** `Open` (no one has acted on it yet), `Default in build` (works now, waiting on sign-off), `Done` (finished, with evidence linked), `Deferred` (deliberately parked until a gate).

**Changing a scoring rule.** A change gets a new rule version (`RULE_VERSION` in `src/scoring/engine.ts`, now `cmai-count-rule-2`). The new version is logged under "Decision log" below, and the hand-scored cases in `docs/test-cases.json` are updated. Old exports keep the label of the rule that scored them.

## D. Scoring decisions

| ID | Decision | In this build | Evidence | Sign-off from | Gate | Status |
|---|---|---|---|---|---|---|
| D-01 | Count-to-rating boundaries (bands 1 to 6) | N=0→1, 1→2, 2-4→3, 5-13→4, 14-28→5, 29+→6 | `scoring-spec.md` §2; robustness proposal 1 | Lab; two-rater study (V-01) settles boundary cases V03, V05, V06 | G1 | Default in build |
| D-02 | Rule for rating 7 | 3+ logs within 60 min on 7+ of 14 days; a cluster that crosses midnight counts for the day it starts | `scoring-spec.md` §3; `cmai-count-rule-2` | Lab | G1 | Default in build |
| D-03 | Likely 7s: ask the caregiver at the day-14 review when 3 to 6 days have clusters | Not built. The rating falls back to the count bands. | Robustness rerun: rating 7 is lost in 38% of runs at 10% missed logs | Lab | G1 | Open |
| D-04 | Form version | 29-item long form, 1 to 7 | Manual p.22 | Lab | G1 | Default in build |
| D-05 | 14-day periods fixed from the first log, or rolling | Fixed | `scoring-spec.md` §1 | Lab | G1 | Default in build |
| D-06 | Code 8 (prevented): a separate code, or an estimate of the unprevented frequency (p.5 allows either) | Separate code, entered at day-14 review | Manual p.3, p.5 | Lab | G1 | Default in build |
| D-07 | Partial prevention: tell reviewers to estimate "how frequently it would happen if not prevented" (p.24)? | No instruction shown | Robustness proposal 6 | Lab | G1 | Open |
| D-08 | Lead with per-behavior ratings, with the total secondary | Per-behavior first; total labeled secondary | Manual p.5 ("not useful"); trials use the total (`research-notes.md`) | Lab | G1 | Default in build |
| D-09 | Factor set: nursing home (p.7) or community (p.7 to 8) | Nursing home | Manual p.7 | Lab, once the care setting is known | G1 | Default in build |
| D-10 | When a behavior's change counts as meaningful | Marked at a 2+ point move, or a 1-point move in the same direction over two finished periods | Manual p.7 (raters agree within 1 point); Smith 2025 | Lab | G1 | Default in build |
| D-11 | Unlogged days: flag only, or also leave the period out of trend lines | Flag only | Robustness proposal 4 | Lab | G1 | Default in build |
| D-12 | Never scale counts up to make up for missed logs | Not scaled | Robustness proposal 5 | Lab | G1 | Default in build |
| D-13 | Back-dated logs (approximate times) in rating-7 clusters: count them, or count only exact times | Counted like any other log | F-03; spec section 3 | Lab | G1 | Default in build |

## P. Permissions and compliance

| ID | Item | Current state | Evidence | Sign-off from | Gate | Status |
|---|---|---|---|---|---|---|
| P-01 | Permission to show reworded CMAI definitions in the app and keep them in a public repo | Definitions are reworded in our own language with a manual page reference. NOTICE keeps CMAI content out of the MIT license. | DOMS: free for non-commercial use, "for other uses... seek permission"; forms say "All rights reserved" | CMAI copyright holder (Cohen-Mansfield) | G1 before the lab reuses the app; G2 at the latest | Deferred (email drafted, not sent) |
| P-02 | No commercial use without the author's permission | Non-commercial interview prototype | DOMS terms | CMAI copyright holder | G2 | Default in build |
| P-03 | IRB determination before any real resident or caregiver data | No real data. Demo data and stories are fictional. | ODU IRB pages (main campus irb@odu.edu; medical campus VHS-IRB@odu.edu) | ODU IRB | G2 | Deferred |
| P-04 | HIPAA and data handling if data come from a clinic or nursing home | Data stays on the device; patients are codes; export is manual | `README.md` Privacy | Lab, partner site (e.g. EVMS) | G2 | Deferred |
| P-05 | Code license and ownership: MIT now, but work done as an RA may fall under ODU's intellectual property policy | MIT, © Devin Ferrell | `LICENSE` | Professor Gupta / ODU policy | G1 | Open |
| P-06 | Usability sessions (SUS, think-aloud) if results are used beyond the lab | Materials written, no sessions run | `docs/usability/` | ODU IRB, for a determination | G1 | Deferred |

## V. Validation and verification

Each check is done by someone or something other than the author.

| ID | Check | Pass mark | Evidence | Who | Gate | Status |
|---|---|---|---|---|---|---|
| V-01 | Two independent raters score the 12 fictional stories on paper | App within 1 point of each rater on 88%+ of items (manual p.7) | `docs/agreement/` | Two raters who have not seen the code | G1 (optional earlier) | Open: materials ready |
| V-02 | Missed-log simulation under the current rule | Results reported, not a pass/fail | `docs/agreement/robustness.md` | Script | G0 | Done (rerun under rule 2 on 2026-10-23) |
| V-03 | Offline test on a real iPhone after Add to Home Screen | Logs, scores and export all work with airplane mode on | Devin, 2026-10-23, his words: "I did the Home Screen test, behaved as I assume it should". Which steps he ran (log, scores, export) was not itemized | Devin | G0 | Passed (2026-10-23) |
| V-04 | Lighthouse and axe (WCAG 2.2 AA) | Accessibility 100, 0 axe violations | `docs/audits/` | Tools | G0 | Done |
| V-05 | Every citation resolves and none is retracted | All sources verified or marked unverified | `research-notes.md`; 31 of 40 Crossref-verified | Crossref | G0 | Done, with 3 marked unverified (Cohen-Mansfield 1992, 1996; Yao 2023 DOI) |
| V-06 | DOMS permission quote checked in a browser | Quote matches the live page word for word | `README.md` Permissions | Devin | G0 | Open |
| V-07 | Other platform builds pass the same `docs/test-cases.json` | Same ratings on every case | `docs/test-cases.json` | Other candidates' apps | G1 | Open |
| V-08 | Literature recall against a published review | Misses reported | Möhler 2023 Cochrane: 0 of 11 caught (map was scoped to the app's questions) | Published review | G1 | Done (a gap, reported) |
| V-09 | Five-person usability test with SUS | SUS 68+ (industry average) | `docs/usability/` | Caregivers or nurses | G1 | Deferred (P-06) |
| V-11 | Back-swipe on a real iPhone Home Screen app: from a Data page (such as Display), swipe back | Returns to the Data hub, and a second swipe does not reopen the page | `e2e/navigation.cjs` passes in Chromium; not yet on a phone | Devin | G0 | Open |
| V-10 | End-to-end check of the production build in headless Chromium at phone size: load demo data, log, undo, Scores, Day-14 review, export, reload, then reload offline | Every step works and the console has no errors | Run on 2026-10-23 | Script | G0 | Done |

## F. Proposed features

Each one waits on a lab decision or on V-01. Severity comes from the heuristic review in `docs/usability/`, where it applies.

| ID | Feature | Why | Depends on | Gate |
|---|---|---|---|---|
| F-01 | Show the resident's code on the Log screen and in the toast | Stops logs going to the wrong resident (severity 3) | none | Done (2026-10-23) |
| F-02 | Recent logs list with edit and delete after the undo window | Fixes mistakes found later | none | Built (2026-10-23): last 24 hours, edit time or delete, delete has Undo |
| F-03 | Back-date a log ("Happened earlier?") | Caregivers often log after the fact | D-02 (clusters need accurate times) | Built (2026-10-23): 5/15/30/60 min ago or a clock time, plus "approximate". How back-dated logs should count toward rating-7 clusters is still D-13 |
| F-04 | Day-14 prompt for likely 7s | Rating 7 is fragile | D-03 | G1 |
| F-05 | Medication-change marker on the charts, with a baseline period first | The lab's goal is reducing medication | Lab | G1 |
| F-06 | Rater print view of 14-day counts per behavior | Supports a rater's CMAI interview (as with the AVP-786 caregiver diary) | Lab | G1 |
| F-07 | Target behaviors: pick 1 to 3 to sort to the top | Long scroll (walkthrough W4); clinicians judge change behavior by behavior | Lab | G1 |
| F-08 | Show total change next to published meaningful-change values | Two values disagree: about -4 (Liu 2025) vs -20 (Meunier 2024) | Lab picks a value | G1 |
| F-09 | In-app page explaining how ratings are worked out | Transparency for caregivers and raters | D-01, D-02 | Built (2026-10-23): Data screen. The count table is generated from the engine, so it cannot drift from the rule; wording still needs lab review at G1 |
| F-10 | Encrypt the backup file, or a passcode on the app | A backup holds behavior logs; codes, not names, but still sensitive | P-04 | G2 |
| F-11 | Sync or shared device use for several caregivers on one resident | One phone per resident today; shift handover needs shared data | P-04, lab infrastructure | G1 |
| F-12 | Quick navigation on long screens: pinned section bar with scroll tracking on Log, Scores and Review; Data split into a hub and sub-pages; back gesture and reload keep your place | Screens were 3.3 to 5.5 phone heights with no pinned shortcuts (design note 001) | none | Built (2026-10-23) |

## Decision log

Newest first. Every rule change and every sign-off goes here, with who and when.

| Date | Change | By | Approved by |
|---|---|---|---|
| 2026-10-23 | V-03 (iPhone Home Screen offline test) recorded as passed on Devin's report. V-11 (back-swipe on iPhone) added, open | Devin | n/a |
| 2026-10-23 | Change process written down (`docs/process/change-process.md`, PR template). Navigation (round 8, F-12, design note 001): pinned section bar with scroll tracking on Log, Scores and Review; Review grouped like Log with progress per group; Data split into a hub and five pages; screens in the URL so the back gesture and reload keep your place; tapping the current tab scrolls to top; browser checks moved into `e2e/` | Devin | n/a (no scoring change) |
| 2026-10-23 | Light and dark mode as a setting (round 7): header sun/moon toggle, Data > Display "Appearance" (Match phone, Light, Dark), theme set before first paint, status bar follows. Replaces the media-query-only dark mode | Devin | n/a (no scoring change) |
| 2026-10-23 | High-contrast display option (round 6): Data screen "Display" setting (Match phone, Standard, High). High uses AAA text contrast (7:1 or better), 2px outlines and a stronger rating ramp, in light and dark. "Match phone" follows the phone's Increase Contrast setting. Windows forced-colors mode keeps the selected-tab and rating-cell cues | Devin | n/a (no scoring change) |
| 2026-10-23 | Visual redesign (round 5): care-teal palette, Atkinson Hyperlegible Next, patient banner, grouped Log list, amber status instead of red and green, Okabe-Ito chart colors, new icon. Sources in `docs/design/design-brief.md` | Devin | n/a (no scoring change) |
| 2026-10-23 | UX round 4: recent logs (edit, delete), back-dating, restore from backup, delete patient, remove demo data, welcome screen, loading and storage-error states, icon tab bar with review-due dot, install button, in-app rating explainer | Devin (F-02, F-03, F-09; heuristic review round 4) | n/a (no scoring change) |
| 2026-10-23 | Lab approvals deferred until after hiring; this register created | Devin | n/a (process) |
| 2026-10-23 | Log screen and toast name the resident; toast shows the time of the log, not the time of the last redraw | Devin (F-01) | n/a (no scoring change) |
| 2026-10-22 | `cmai-count-rule-2`: rating-7 clusters found with a 60-minute window across midnight | Devin (from robustness proposal 2) | Pending (D-02) |
| 2026-10-22 | "Nothing to log today" check-in and unlogged-day counts | Devin (robustness proposal 4) | Pending (D-11) |
| 2026-10-22 | Meaningful-change marker (2+ points, or 1 point held) | Devin (research map) | Pending (D-10) |
| 2026-10-22 | Item definitions reworded; MIT + NOTICE | Devin (permissions audit) | Pending (P-01, P-05) |
| 2026-10-21 | `cmai-count-rule-1`: count bands and rating-7 rule | Devin | Pending (D-01, D-02) |
