# 007. Locked app scores, and deleting a log with a reason

2026-10-27 · Register: D-14, F-21 · Status: built on a draft PR, waiting on Devin

## Problem
In the meeting with Dr. Gupta on 2026-10-27, Devin set two rules for the study (his words, paraphrased):
- **The app's score must not be changeable.** The lab is there to check whether the app's rating matches the caregiver's rating, or is more accurate. If a caregiver can change the app's rating, the check is defeated.
- **Deleting a logged behavior needs a reason and a confirmation.**

What the build did before this change:
- The day-14 review let the caregiver confirm or change every rating, and the changed value replaced the app's rating on Scores, in the totals and in `scores.csv` (`final_rating`).
- Delete, in the log details sheet, removed the log from storage at once (with an 8-second Undo). Nothing recorded that the log had existed, and the snackbar's Undo after a tap did the same.
- Editing a log's time saved over the old time, with no record of the change.

## Options
1. **Keep the review, but store the caregiver's answer beside the app's instead of over it.** The app's rating stays untouched. But the caregiver still sees the app's rating while answering, so their answer leans toward it and can't serve as an independent check. Devin raised this bias himself.
2. **Remove the review screen; the app's rating is computed from logs only.** Nothing a person enters reaches a score. Codes 8 and 9 can't be recorded until a caregiver's own rating exists.
3. **Option 2, plus a blind caregiver rating at day 14** on its own screen. Best for the study, but whether the lab wants it is pending Dr. Gupta, so it is not built.

For delete:
1. **Hard delete after a confirm.** Simple, but the record is gone, so nobody can audit how many logs were removed or why.
2. **Soft delete: mark the log deleted with when and why, keep it, and skip it in scoring.** Every removal can be counted and checked. The cost is one more field on a log and a filter on every read.

## Decision
- **Scores: option 2.** `appRatings()` replaces `finalRatings()`, and it takes no override. The Review tab, its route and its review-due dot are removed. Review records already on a phone stay in storage and backups and are never read for scores. `scores.csv` drops `final_rating` and `reviewed`; `derived_rating` is the rating.
- **Delete: soft delete.** A log gets `deletedAt`, `deleteReason`, and `deleteNote` for Other. Scoring, Recent logs and the today count read live logs only.
- **The reason is a pick list**: Tapped by mistake, Wrong behavior, Wrong patient, Logged twice, Other (with a short note, no names). A list can be counted, and it keeps names out of the data. Free text would need cleaning before analysis.
- **Two steps.** Delete log opens "Delete this log?" in the same sheet. The Delete button stays off until a reason is picked (and a note for Other). Keep log goes back to the details.
- **Undo right after a tap stays one tap.** It is recorded as a delete with the reason "Undone right after logging". Asking for a reason inside the 8-second snackbar would slow down the most common fix.
- **Change history.** A new `changes` table records every edit (from and to), delete and restore. Edits a few minutes apart count as one entry, because the note field saves on every key. The history goes in the backup, and restore points it at each log's new id.

## Left out
- **Who made the change.** The app has no sign-in, so the history can only say which phone. Recording a person needs accounts (F-11).
- **The blind caregiver rating.** Designed in `scoring-spec.md` §5, not built, until Dr. Gupta decides.
- **Deleting a whole patient** still removes everything, with its own confirm. It's a data-management step (for example, someone leaving the study), not a correction to a log.
