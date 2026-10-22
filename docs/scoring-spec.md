# CMAI scoring spec

Rule version: `cmai-count-rule-1`. Every score the app saves carries this label, so a rule change never silently rewrites old results.

Source of truth: *Instruction Manual for the Cohen-Mansfield Agitation Inventory* (Cohen-Mansfield, 1991). Page numbers below are the manual's printed page numbers.

## 1. The problem this spec solves

- The lab asked for an app that records **each time** a behavior happens and **calculates CMAI scores every 14 days**.
- The CMAI itself is **not a count**. A caregiver looks back over the past 2 weeks and rates how often each behavior typically happened, on a 1 to 7 scale (p.1, p.5).
- So the app must turn counts into ratings. The manual does not say how, so this spec does. Every boundary below is a **proposed default for the lab to confirm** (section 7).

## 2. Count to rating (one behavior, one 14-day period)

`N` = number of times the behavior was logged in the period.

| Rating | Manual label (p.5) | Rule | Why this boundary |
|---|---|---|---|
| 1 | Never | N = 0 | |
| 2 | Less than once a week | N = 1 | 1 in 2 weeks = half a week's worth |
| 3 | Once or twice a week | N = 2 to 4 | 1 to 2 per week, times 2 weeks |
| 4 | Several times a week | N = 5 to 13 | 3+ a week, but under once a day |
| 5 | Once or twice a day | N = 14 to 28 | 1 to 2 per day, times 14 days |
| 6 | Several times a day | N of 29 or more | 3+ a day on average |
| 7 | Several times an hour | see section 3 | needs timing, not just a count |

The manual says to "average over the past two weeks" when a behavior is irregular (p.3, p.5). Counting across the whole 14 days does exactly that.

## 3. Rating 7: several times an hour

A plain count can't show "several times an hour", so rating 7 uses timing:

- A **clustered day** is a day with 3 or more logs of the behavior inside any 60-minute span.
- Rating 7 applies when **at least 7 of the 14 days** are clustered days (half the period, matching "average over two weeks").
- Otherwise the count table in section 2 applies.

## 4. What one tap means

- One tap = one occurrence.
- **Continuous behaviors** (#1 pacing, #26 repetitious mannerisms, #29 general restlessness): one tap = one stretch of the behavior, not one step or one tap of a finger.
- **Complex behaviors**: the manual says to split them into the simple behaviors they contain and log each (p.4, instruction 14).
- Each button shows the manual's definition, and "Does not count" shows its exclusions (p.12 to 13). Example: spitting into a tissue is not #3.

## 5. Day-14 review, and codes 8 and 9

When a period ends, the caregiver sees the app's rating for each behavior and can confirm or change it. This keeps the look-back judgment the CMAI was built on, and it is the only place to record:

- **8, would occur if not prevented** (for example, would pace if not restrained) (p.2, p.5).
- **9, not applicable** (for example, cannot walk, so cannot pace) (p.2).

The app stores both the derived rating and the caregiver's choice, so the lab can see how often caregivers disagree with the counts. Codes 8 and 9 are reported separately and left out of every sum (the manual says to analyze them separately, p.5).

## 6. What the app reports, in order

1. **Each behavior, period by period.** The manual recommends looking at specific behaviors (p.5; the summary table says the same).
2. **Agitated / not agitated** for three groups, using the manual's own thresholds (p.5 to 6). "At a frequency of k" is read as "rated k or higher".
   - Aggressive: one at 4, or two at 3, or three at 2.
   - Physically nonaggressive: one at 5, or two at 4, or three at 3, or four at 2.
   - Verbally agitated: same thresholds as physically nonaggressive.
3. **Group averages** using the nursing-home factors (p.6):
   - Aggressive: #3, 4, 7, 8, 9, 10, 14, 15, 25.
   - Physically nonaggressive: #1, 2, 16, 22, 26, 29.
   - Verbally agitated: #5, 6, 13, 18, 19.
   - Not in a factor: #11, 12, 17, 20, 21, 23, 24, 27, 28. Shown per behavior; not in group averages.
4. **Total** (sum of the 29 ratings, 29 to 203) as a secondary figure. The lab asked for it. The manual says a summed total is "not useful" for analysis (p.5), so the app labels it secondary.

## 7. Periods

- Period 1 starts at local midnight on the patient's first day in the app. Each period is 14 days. Periods are fixed, not rolling.
- A period that hasn't ended is **in progress**. It shows "so far" numbers and is left out of trend lines, because fewer days always looks like improvement.

## 8. Decisions the lab must confirm

| Decision | Default in this build |
|---|---|
| Count-to-rating boundaries (section 2) | As in the table |
| Rule for rating 7 (section 3) | 3+ logs in 60 minutes on 7+ of 14 days |
| Form version | 29-item long form, 1 to 7 scale |
| Fixed or rolling 14-day periods | Fixed |
| Code 8: separate code, or estimate the unprevented frequency (p.5 allows either) | Separate code |
| Lead with total, or per-behavior | Per-behavior first, total secondary |
| Factor set: nursing home (p.6) or community (p.7) | Nursing home |
| Permission to reproduce the CMAI wording in an app (forms say "All rights reserved") | Ask before any real use |

## 9. How the spec is checked

- `docs/test-cases.json` holds 17 cases a person can score by hand from this page, without reading code.
- `tests/engine.test.ts` runs the engine against every case. The expected answers were written by hand, never computed by the engine.
