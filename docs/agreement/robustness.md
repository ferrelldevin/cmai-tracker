# Robustness of the count rule to missed logs

Rule tested: `cmai-count-rule-1` (`docs/scoring-spec.md`), run through the app's own `scoreWindow` and `summarize`. Nothing about the rule was reimplemented. Script: `scripts/simulate-missing-logs.ts`. Raw output: `robustness-output/`.

> **Note (repo copy).** These results are for `cmai-count-rule-1`. Since then the app adopted proposal 2 (`cmai-count-rule-2`, clusters across midnight) and part of proposal 4 ("Nothing to log today" check-in and unlogged-day counts; periods with unlogged days are flagged but not left out of trend lines). The simulation has not been rerun under rule 2. Proposals 1 and 3 are still open.

## Answer first

- **Missed logs can only push ratings down, never up.** Every change in the simulation is a drop.
- **At 10% missed, the rule holds.** About 1 in 8 active items drops one band, and essentially none (0.1%) drops two or more. One band is inside the manual's own inter-rater tolerance (0 or 1 point counts as agreement, manual p.7).
- **At 30% missed, ratings slip but mostly stay within 1 point.** 36 to 42% of active items drop a band; 1 to 3% drop two or more, so about 97 to 99% stay within 1 point. The agitated / not agitated status (manual p.5 to 6) flips in 15% of demo windows.
- **At 50% missed, the rule is unreliable.** 70 to 78% of items drop, 6 to 10% by two or more bands, and the agitated status flips in 29 to 49% of windows.
- **Rating 7 is the fragile part.** With 30% of logs missed, the one rating-7 item loses its 7 in 70% of runs (82% when busy days lose more), and it falls two bands, to 5. At 50% it is lost every time.
- **Busy-day misses are only slightly worse than random misses** for the count bands (about 1 point of percentage higher). They matter for rating 7, because the clusters that rating 7 needs happen on busy days.
- **Recommendation:** keep the count bands as they are for now. Fix how clusters are found, send likely 7s to the day-14 review, and add a way to tell a quiet day from a day nobody logged. Details under "Decisions the lab must confirm".

## What was simulated

- **Data.** (1) The app's seeded demo data (`src/data/seed.ts`, two fictional patients, 42 days each, so 6 complete 14-day windows, 626 logs). (2) The 12 agreement vignettes (`vignettes.json`, 574 logs). 18 windows in all.
- **Deletion.** In each run, exactly 10%, 30% or 50% of a window's logs are removed, then the window is re-scored.
  - *Uniform:* every log equally likely to be missed.
  - *Busy days:* a log's chance of being missed is proportional to how many logs (all behaviors) were made that day.
- **Runs.** 2,000 per window, per rate, per mode (216,000 re-scorings). Seeded, so the numbers repeat exactly.
- **What is counted.** Only *active* items, meaning items with at least one log in the full data (74 item-windows). Items with no logs cannot change.

## Results

Percentages are of active item-windows, averaged over all runs.

| Data | Mode | Missed | Items that change | Drop 1 band | Drop 2+ bands | Mean drop in total | Windows whose agitated status flips | Rating 7 lost |
|---|---|---|---|---|---|---|---|---|
| Demo | uniform | 10% | 12.4% | 12.3% | 0.1% | 0.7 | 0.1% | no 7s |
| Demo | uniform | 30% | 41.1% | 40.4% | 0.7% | 2.3 | 14.5% | no 7s |
| Demo | uniform | 50% | 76.3% | 70.8% | 5.6% | 4.5 | 48.5% | no 7s |
| Demo | busy days | 10% | 12.8% | 12.7% | 0.1% | 0.7 | 0.0% | no 7s |
| Demo | busy days | 30% | 42.3% | 41.5% | 0.8% | 2.4 | 15.2% | no 7s |
| Demo | busy days | 50% | 77.6% | 71.2% | 6.4% | 4.6 | 48.8% | no 7s |
| Vignettes | uniform | 10% | 12.4% | 12.3% | 0.1% | 0.4 | 0.1% | 0.1% |
| Vignettes | uniform | 30% | 35.7% | 33.2% | 2.5% | 1.3 | 5.2% | 70.5% |
| Vignettes | uniform | 50% | 69.9% | 61.0% | 8.8% | 2.7 | 29.4% | 99.9% |
| Vignettes | busy days | 10% | 13.2% | 13.1% | 0.1% | 0.5 | 0.0% | 0.4% |
| Vignettes | busy days | 30% | 37.1% | 33.9% | 3.2% | 1.4 | 5.2% | 81.8% |
| Vignettes | busy days | 50% | 71.2% | 60.9% | 10.2% | 2.8 | 31.0% | 100.0% |

"Mean drop in total" is the drop in the 29-item sum (29 to 203), per window.

### Which bands are fragile (both data sets, uniform misses)

| Original rating | Changes at 10% | Changes at 30% | 2+ band drop at 30% | 2+ band drop at 50% |
|---|---|---|---|---|
| 2 (one log) | 11% | 33% | 0% | 0% |
| 3 (2 to 4 logs) | 11% | 39% | 4.7% | 20.1% |
| 4 (5 to 13 logs) | 8% | 31% | 0.4% | 5.7% |
| 5 (14 to 28 logs) | 12% | 31% | 0% | 1.1% |
| 6 (29+ logs) | 25% | 65% | 0% | 9.5% |
| 7 (clusters on 7+ days) | 0.1% | 70.5% | 70.3% | 99.8% |

Full table, including busy-day mode: `robustness-output/robustness-by-band.csv`.

- **Band 6 is touchy** because many items rated 6 sit just above its floor of 29 logs (29, 29, 30, 33, 36, 37, 38). Losing 1 log in 10 can be enough.
- **Band 3 is the one that falls two bands** among the count bands: 2 logs can easily become 0 (rating 1).
- **Rating 7 falls two bands** because losing it sends the item back to the count table, and V07's 36 logs minus 30% is about 25 logs, which is band 5.

### Why this matters for the trend screen

Missed logs look exactly like improvement. In the demo data, patient P-DEMO-A's 29-item total falls 5 points from window 1 to window 3 (54 to 49), presented as a non-drug approach working. A caregiver who simply logs 30% less by window 3 produces a drop of about 2.5 points with no change in behavior. For P-DEMO-B, who gets worse (total 44 to 50), the same logging fatigue would hide about half the rise (about 2.9 points). Logging adherence in long self-report studies is known to fall over time, so this bias points the same way as the app's main claim. (Adherence decay is a step 3 literature question; it is not cited here.)

## Limits of this simulation

- **Missed logs only.** It does not model extra logs (double taps, logging one stretch of pacing as several), wrong items (V10 in the vignettes), or wrong times.
- **Busy-day weighting is linear.** A real caregiver may miss whole shifts. Whole-shift misses would wipe out clusters even faster than shown here.
- **Only one rating-7 item.** The demo generator never puts 3 logs inside 60 minutes, so no demo window reaches rating 7. The rating-7 numbers come from vignette V07 alone.
- **The demo data is synthetic**, made by the app's own generator; it is not real patient data.

## Decisions the lab must confirm

These are proposals. `scoring-spec.md` and the app source were not changed. Any change should ship as a new rule version (for example `cmai-count-rule-2`) so old scores keep their label.

1. **Count bands: keep them for now (no change).** Up to 30% missed logs, 97 to 99% of items stay within 1 point of the full-data rating, inside the manual's inter-rater tolerance (p.7). The open boundary questions (5 logs = 4 or 3? 13 logs = 4 or 5? 29 logs = 6 or 5?) should be settled by the two raters' answers on V03, V05 and V06, not by this simulation. Note that rounding gap counts *up*, as the rule does now, partly offsets the downward pull of missed logs; rounding them down would make the rule more fragile.
2. **Clusters across midnight: fix (recommended).** The engine groups logs by calendar day before looking for 3 logs in 60 minutes, so a burst at 11:40 pm, 11:55 pm and 12:15 am never counts. Vignette V08 shows the effect: 3 screams in 35 minutes on 8 nights scores 5, not 7. Proposal: find clusters with a 60-minute window that runs across midnight, and credit each cluster to the day it starts.
3. **Rating 7: send likely 7s to the day-14 review (recommended).** Proposal: when an item has 3 to 6 clustered days, the review screen asks the caregiver whether the behavior happened several times an hour on most days, instead of silently showing 5 or 6. On V07, 30% missed logs leave 3+ clustered days in 100% of runs (7+ in only 16%), so the prompt would catch nearly every lost 7. This keeps the judgment with the caregiver, which is how the CMAI was built (p.2, p.5), and uses the review step the app already has.
4. **Tell a quiet day from an unlogged day (recommended).** Add a once-a-day "nothing to log today" tap (or end-of-shift check-in). Windows with several days that have neither logs nor a check-in get a "logging may be incomplete" mark, and are left out of trend lines the same way unfinished windows are now (spec section 7). This is the only proposal here that addresses the downward bias itself.
5. **Do not scale counts up to correct for missed logs.** The app cannot know the true miss rate, so any correction would be a guess applied to every patient.
6. **Partial prevention: decide.** The expanded long form says "If prevented part of the time, estimate how frequently it would happen if not prevented" (p.24). The count rule cannot do this; only the day-14 review can. The lab should say whether reviewers are told to do this.
