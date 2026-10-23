# Agreement study materials

Does the app's count-to-rating rule give the same 1 to 7 rating a person would give from the paper CMAI? And how badly does it break when logs are missed?

- **Everything here is fictional.** 12 made-up 2-week caregiver stories. No patient data.
- **Status:** materials ready, not yet run. No human ratings exist, so agreement is not yet known.
- **Robustness:** done, rerun under rule 2. See `robustness.md`.

**Raters must not open this folder.** It holds the app's answers (`app-ratings.csv`) and the design notes (`vignettes.json`). Give raters only the printed `rating-sheet.html` and the CMAI manual.

## Files

| File | For | What it is |
|---|---|---|
| `vignettes.md` | Raters | The 12 stories and the rating scale. No app output. |
| `rating-sheet.html` | Raters | Printable packet with a blank 1 to 9 grid per story. Open in a browser and print. |
| `human-ratings-template.csv` | Organizer | Blank sheet for both raters' answers (48 rows). |
| `vignettes.json` | Organizer | Every event as a timestamped log, plus design notes. |
| `app-ratings.csv` | Organizer | Each story run through the app's engine (`cmai-count-rule-2`). |
| `analyze.py` | Organizer | Quadratic weighted kappa, percent within 1 point, codes 8/9 table, Bland-Altman plots. Python 3 standard library only. |
| `robustness.md`, `robustness-output/` | Lab | Missed-log simulation results and raw tables. |
| `scripts/build_vignettes.py` | Organizer | Single source for the stories; regenerates the four files above it. |
| `scripts/score-vignettes.ts` | Organizer | Writes `app-ratings.csv` from the app's own engine. |
| `scripts/simulate-missing-logs.ts` | Organizer | The Monte Carlo simulation. |

## Rule 2 note

`app-ratings.csv` was regenerated with `cmai-count-rule-2`, which finds rating-7 clusters across midnight. Only one rating changed: V08 #13 Screaming, 3 screams in 35 minutes on 8 nights, went from 5 to 7. `robustness-output/` was rerun under rule 2 on 2026-10-23. Rating 7 is now lost in 38% of runs at 10% missed logs (see the note at the top of `robustness.md`).

## Running the study

1. Two raters who have not seen the code or this folder rate the stories alone, from the manual only. Do not coach.
2. Copy `human-ratings-template.csv` to `human-ratings.csv` and type in both raters' answers.
3. `python3 docs/agreement/analyze.py` writes `agreement-report.md` and two Bland-Altman SVGs here.
4. Pass mark: the app is within 1 point of each rater on at least 88% of items (the manual's inter-rater standard, p.7). The app cannot be expected to agree with a rater better than the raters agree with each other.

Check the script first: `python3 docs/agreement/analyze.py --selftest` (kappa against hand-worked values) or `--demo` (dummy ratings, not results).

## Regenerating

From the repo root, after `npm ci`:

```
python3 docs/agreement/scripts/build_vignettes.py
TZ=UTC APP_DIR=$PWD npx vite-node docs/agreement/scripts/score-vignettes.ts -- docs/agreement/vignettes.json docs/agreement/app-ratings.csv
TZ=UTC APP_DIR=$PWD npx vite-node docs/agreement/scripts/simulate-missing-logs.ts -- docs/agreement/vignettes.json docs/agreement/robustness-output 2000
```

Use `TZ=UTC`: the stories' times are in UTC and the engine splits days at local midnight.

**Human subjects.** Two people rating made-up stories to test a tool is not research on patients. If results go beyond the lab, ask the ODU IRB office for a determination first.
