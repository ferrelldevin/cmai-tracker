# 001. Navigation within long screens

2026-10-23 · Register: F-12 · Status: built

## Problem
With demo data on a 390 × 844 phone, the screens measure:

| Screen | Height |
|---|---|
| Log | 5.3 screens |
| Review | 5.5 screens |
| Scores | 3.3 screens (4.6 with all 29 behaviors shown) |
| Data | 3.4 screens |

The only shortcut was a row of group chips at the top of Log, which scrolled away with the page. Review and Scores had no shortcuts. Data stacked seven unrelated jobs on one page. The back gesture did nothing useful, because the app had no history: a reload always went back to Log. Nielsen's heuristics this breaks: *user control and freedom* (no way back), *recognition rather than recall* (people had to remember where things were further down), and *flexibility and efficiency of use* (no shortcuts).

## Options
1. **A sticky section bar on long screens** (an "on this page" index). The chips stay under the patient banner, highlight the section you are in as you scroll, and jump on tap. This is the pattern of the iOS section index, Material scrollable tabs, and the GOV.UK and NHS "contents" list. It is cheap and keeps everything on one page.
2. **Split long screens into more tabs.** This fails the four-tab limit for the bottom bar. Material allows 3 to 5 tabs, and a fifth would crowd labels on small phones.
3. **Drill-down sub-pages** (a list of rows, each opening its own page with Back). This is the pattern of iOS Settings and Android settings, and fits a screen of unrelated jobs. It is wrong for Log and Review, where people move between neighboring items.

## Decision
- **Log, Scores, Review: option 1.** One shared `SectionNav` component, so all three behave the same. Review is now grouped like Log (Aggressive, Physical, Verbal, Other), and each chip shows how many items are reviewed, such as "Physical 3/9".
- **Data: option 3.** The hub keeps the main job, Patients, on top. Below it is a list of rows, each with a one-line status: Backup and export (last export), Display (current theme), Keep data safe (installed or not), Demo data, and How ratings are worked out. Each row opens its own page with a Back button.
- **History and back:** screens live in the URL hash (`#/log`, `#/data/backup`). Switching tabs replaces the history entry, which is the platform norm, so Back does not walk through tab taps. Opening a Data page adds one, so the back gesture returns to the Data hub. A reload stays on the same screen. Tapping the tab you are already on scrolls it back to the top (iOS convention).
- **Header:** the brand row now scrolls away, and only the patient banner and the section bar stay pinned. That keeps the pinned area to about 130 px, so pinning the section bar doesn't add height.

## Left out
- A collapsing large-title header. More motion and code for about 50 px.
- Search within Log. 29 items in 4 groups is within what a section bar handles, so search can wait for user evidence (F-07, target behaviors, would do more).

## Done when
Every screen over 2 phone heights has a pinned way to jump. The back gesture and reload behave as above. The checks in `docs/process/change-process.md` pass.
