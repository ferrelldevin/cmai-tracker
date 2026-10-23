#!/usr/bin/env python3
"""Single source for the 12 agreement-study vignettes.

Writes, next to this script's parent folder:
  vignettes.json                 machine-readable events (UTC timestamps) + design notes
  vignettes.md                   the narratives raters read (no app output, no design notes)
  rating-sheet.html              printable rater packet (narratives + blank 1-9 grids)
  human-ratings-template.csv     blank sheet for two raters

All people and events are fictional. Window: 14 days starting Monday 2026-01-05 00:00 UTC.
Day numbers shown to raters run 1-14; in the JSON, `day` runs 0-13.
Standard library only. Run: python3 scripts/build_vignettes.py
"""
import csv
import html
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent
WINDOW_START = datetime(2026, 1, 5, tzinfo=timezone.utc)  # a Monday
WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

# Short item names as printed on the long form (manual p.22-23).
ITEM_NAMES = {
    1: "Pacing, aimless wandering", 2: "Inappropriate dress or disrobing", 3: "Spitting (include at meals)",
    4: "Cursing or verbal aggression", 5: "Constant unwarranted request for attention or help",
    6: "Repetitive sentences or questions", 7: "Hitting (including self)", 8: "Kicking",
    9: "Grabbing onto people", 10: "Pushing", 11: "Throwing things", 12: "Strange noises (weird laughter or crying)",
    13: "Screaming", 14: "Biting", 15: "Scratching", 16: "Trying to get to a different place",
    17: "Intentional falling", 18: "Complaining", 19: "Negativism", 20: "Eating/drinking inappropriate substances",
    21: "Hurt self or other", 22: "Handling things inappropriately", 23: "Hiding things", 24: "Hoarding things",
    25: "Tearing things or destroying property", 26: "Performing repetitious mannerisms",
    27: "Making verbal sexual advances", 28: "Making physical sexual advances", 29: "General restlessness",
}

LABELS = {
    1: "Never", 2: "Less than once a week", 3: "Once or twice a week", 4: "Several times a week",
    5: "Once or twice a day", 6: "Several times a day", 7: "Several times an hour",
    8: "Would occur if not prevented", 9: "Not applicable",
}

ALL_DAYS = list(range(14))


def at(days, times):
    """Every listed time on every listed day. days are 0-based."""
    return [(d, t) for d in days for t in times]


def minus(events, drop):
    return [e for e in events if e not in set(drop)]


# Each vignette: id, title, setting, narrative (list of paragraphs), items {itemId: [(day, "HH:MM"), ...]},
# rate (item ids on the rater's sheet, in order), notes (design notes, never shown to raters),
# predicted (author's guess of a manual-only rating, NOT a key; used only to explain the design).
V = []

V.append(dict(
    id="V01", title="Ruth", setting="84, moderate Alzheimer's disease, assisted-living memory unit",
    narrative=[
        "Ruth walks to meals and activities on her own and knows the way. Staff have not seen her wander without a purpose.",
        "On Day 2 (Tue) mid-morning, Day 6 (Sat) late afternoon and Day 11 (Thu) mid-morning she asked her aide \"Is my daughter coming today?\" again and again, five or six times in a row, before she settled. She did not do this on any other day.",
        "On Day 4 (Thu) at 7:40 am the shower water ran too hot for a moment and Ruth screamed. The aide fixed the water and Ruth calmed at once. She did not scream at any other time.",
        "On Day 9 (Tue) in the afternoon she complained at length that her hip hurt and her coffee was cold. That was the only complaining staff noticed.",
    ],
    items={
        6: [(1, "10:15"), (5, "16:00"), (10, "10:30")],
        13: [(3, "07:40")],
        18: [(8, "14:00")],
        1: [],
    },
    rate=[1, 6, 13, 18],
    notes="Low band. #13 is one scream fully explained by the hot water; the expanded form (p.24) says not to include rare behaviors clearly explained by situational factors, so a manual rater may give 1 while the app counts it (2).",
    predicted={1: 1, 6: 3, 13: 1, 18: 2},
))

V.append(dict(
    id="V02", title="Harold", setting="79, vascular dementia, nursing home",
    narrative=[
        "Week 1 was quiet for verbal outbursts. In week 2 his roommate changed, and Harold cursed at staff every evening at about 6:30 pm when they came to help him get ready for bed (Days 8 through 14, seven evenings). On Day 10 (Wed) and Day 13 (Sat) he also swore at the aide during late-morning care.",
        "He roughly grabbed the aide's wrist during morning care twice: Day 3 (Wed) and Day 10 (Wed).",
        "On six afternoons (Days 1, 3, 5, 7, 10 and 12) he could not stay seated during the mid-afternoon activity. He kept getting up and sitting back down for about twenty minutes. On the other days he sat comfortably.",
        "He has never tried to leave the unit or go into other residents' rooms.",
    ],
    items={
        4: at(range(7, 14), ["18:30"]) + [(9, "11:00"), (12, "11:00")],
        9: [(2, "08:15"), (9, "08:20")],
        29: [(0, "15:00"), (2, "15:30"), (4, "14:45"), (6, "15:10"), (9, "15:00"), (11, "15:20")],
        16: [],
    },
    rate=[4, 9, 16, 29],
    notes="Irregular weeks: all 9 cursing events in week 2. The manual (p.4 instruction 10, p.5) says to average over two weeks: 4.5 per week = several times a week (4). Tests whether raters average or rate the recent week (which would be 5).",
    predicted={4: 4, 9: 3, 16: 1, 29: 4},
))

V.append(dict(
    id="V03", title="Edith", setting="88, dementia with Lewy bodies, nursing home",
    narrative=[
        "Every third day or so, mid-morning, Edith pressed her call bell repeatedly and called \"Nurse! Nurse!\" for a long stretch, though nothing was wrong. This happened on Days 1, 4, 7, 10 and 13, five mornings in all.",
        "She tucked her glasses or hearing aids under her mattress on Days 2, 5, 9 and 12, four times in all.",
        "Every evening except Day 7, staff found her cardigan pockets stuffed with sugar packets, napkins and salt shakers from the dining room after supper (13 evenings).",
        "Once, at about 3 am on Day 8, the night aide heard her moaning and weeping in bed for several minutes. No pain or other cause was found.",
    ],
    items={
        5: at([0, 3, 6, 9, 12], ["10:00"]),
        23: at([1, 4, 8, 11], ["13:00"]),
        24: [(d, "19:00") for d in ALL_DAYS if d != 6],
        12: [(7, "03:10")],
    },
    rate=[5, 12, 23, 24],
    notes="Near-boundary counts. #5 has N=5 (2.5 per week): the app gives 4, a rater may say 'once or twice a week' (3). #24 has N=13 (every day but one): the app gives 4, a rater may say 'once or twice a day' (5).",
    predicted={5: 3, 12: 2, 23: 3, 24: 5},
))

V.append(dict(
    id="V04", title="Walter", setting="76, Alzheimer's disease, nursing home",
    narrative=[
        "Every day, twice a day (mid-morning and mid-afternoon), Walter sat rubbing the arm of his chair and picking at the seam of his trousers for a stretch of 20 to 30 minutes.",
        "He complained once every day around lunchtime, usually that the food was too salty or that nobody visits him.",
        "During morning care he struck the aide's arm three times: Day 2, Day 7 and Day 12.",
        "On seven evenings (Days 1, 3, 5, 8, 10, 12 and 14) he was negative about everything at supper: he turned down every suggestion and said nothing was right.",
    ],
    items={
        26: at(ALL_DAYS, ["10:00", "16:00"]),
        18: at(ALL_DAYS, ["12:30"]),
        7: [(1, "08:00"), (6, "08:10"), (11, "07:50")],
        19: at([0, 2, 4, 7, 9, 11, 13], ["17:00"]),
    },
    rate=[7, 18, 19, 26],
    notes="Clean mid-band case. #26 is a continuous behavior logged as two stretches a day (N=28, top of band 5). #19 at once every other day (N=7).",
    predicted={7: 3, 18: 5, 19: 4, 26: 5},
))

V.append(dict(
    id="V05", title="Margaret", setting="81, Alzheimer's disease, nursing home",
    narrative=[
        "Twice a day, every day, Margaret asked \"Where is my purse?\" over and over: once after breakfast and once mid-afternoon. On Day 9 there was a third time, in the evening.",
        "Three times every day (mid-morning, early afternoon and after supper) she had a stretch of fidgeting and getting up and down from her chair.",
        "She shouted for her late husband at bedtime on ten nights: Days 1, 2, 4, 5, 7, 8, 9, 11, 12 and 14.",
        "Once, on Day 6 at lunch, she shoved a tablemate's chair away from her.",
    ],
    items={
        6: at(ALL_DAYS, ["09:00", "15:00"]) + [(8, "20:00")],
        29: at(ALL_DAYS, ["10:00", "14:00", "19:00"]),
        13: at([0, 1, 3, 4, 6, 7, 8, 10, 11, 13], ["21:00"]),
        10: [(5, "12:15")],
    },
    rate=[6, 10, 13, 29],
    notes="Near-boundary count. #6 is 'twice a day' with one extra (N=29): the app crosses into 6, a rater will likely say 'once or twice a day' (5). #13 at 10 nights in 14 (N=10).",
    predicted={6: 5, 10: 2, 13: 4, 29: 6},
))

V.append(dict(
    id="V06", title="Frank", setting="73, early-onset Alzheimer's disease, physically strong, secure dementia unit",
    narrative=[
        "Frank paced the corridor in four stretches every day: early morning, late morning, early afternoon and early evening. Each stretch lasted 30 to 60 minutes.",
        "Three times most days (around 9:30 am, 1:30 pm and 5:30 pm) he tried the locked door at the end of the hall and asked to be let out. On Days 5 and 11 he did this only twice (morning and early afternoon).",
        "He took his shirt off in the lounge in the evening twice: Day 4 and Day 10.",
        "He swept his lunch tray onto the floor five times: Days 1, 4, 7, 10 and 13.",
    ],
    items={
        1: at(ALL_DAYS, ["08:00", "11:00", "14:00", "18:00"]),
        16: minus(at(ALL_DAYS, ["09:30", "13:30", "17:30"]), [(4, "17:30"), (10, "17:30")]),
        2: [(3, "21:00"), (9, "21:15")],
        11: at([0, 3, 6, 9, 12], ["12:10"]),
    },
    rate=[1, 2, 11, 16],
    notes="Band 6 for two items. #11 repeats the N=5 boundary from V03 in an aggressive-adjacent item.",
    predicted={1: 6, 2: 3, 11: 3, 16: 6},
))

V.append(dict(
    id="V07", title="Dorothy", setting="90, Alzheimer's disease, nursing home",
    narrative=[
        "Late afternoon is hard for Dorothy. On nine of the fourteen days (Days 1, 2, 4, 5, 7, 9, 10, 12 and 13), starting around 5:00 pm, she asked \"When is Jim coming to pick me up?\" again and again. The aide answered and she settled, but a few minutes later she started asking again. Staff counted four separate rounds of the repeated question between 5:00 and 5:20 pm on each of those days. On the other five days she did not do this at all.",
        "She screamed twice a day, every day: once late in the morning and once in the evening.",
        "She picks at her sleeve and rubs the table top. On six afternoons (Days 1, 3, 5, 7, 9 and 11) this came in three separate bouts within about 25 minutes, starting around 2:00 pm. On the other eight days there was just one bout, around 2:00 pm.",
    ],
    items={
        6: at([0, 1, 3, 4, 6, 8, 9, 11, 12], ["17:00", "17:05", "17:12", "17:20"]),
        13: at(ALL_DAYS, ["11:00", "20:00"]),
        26: at([0, 2, 4, 6, 8, 10], ["14:00", "14:10", "14:25"]) + at([1, 3, 5, 7, 9, 11, 12, 13], ["14:00"]),
    },
    rate=[6, 13, 26],
    notes="Clustered-hour case. #6 has 4 rounds inside 20 minutes on 9 of 14 days: the app gives 7. A rater may give 7 (several times an hour) or 6 (several times a day, since it happens in one hour only). #26 has bursts on 6 days, one short of the app's 7-day threshold: the app gives 5 from the count (26), a rater may give 6 or 7.",
    predicted={6: 7, 13: 5, 26: 6},
))

V.append(dict(
    id="V08", title="George", setting="85, Alzheimer's disease with night waking, nursing home",
    narrative=[
        "On eight nights George woke shortly before midnight and screamed for help three times in about 35 minutes: around 11:40 pm, 11:55 pm and again at 12:15 am. These were the nights starting on Days 1, 2, 3, 5, 6, 8, 10 and 12. On the other nights he slept through.",
        "Three times every day (around 9 am, 1 pm and 5 pm) he rang his bell and insisted that someone come and sit with him right away, though his needs had already been met.",
        "Once, on Day 7 during early-morning care, he kicked out at the aide.",
    ],
    items={
        13: [e for d in [0, 1, 2, 4, 5, 7, 9, 11] for e in [(d, "23:40"), (d, "23:55"), (d + 1, "00:15")]],
        5: at(ALL_DAYS, ["09:00", "13:00", "17:00"]),
        8: [(6, "07:30")],
    },
    rate=[5, 8, 13],
    notes="Clustered-hour case that crosses midnight. #13 has 3 screams within 35 minutes on 8 nights, which meets the spirit of the rating-7 rule (3+ in 60 min on 7+ days). The engine groups logs by calendar day, so every cluster is split at midnight and no day counts as clustered: the app gives 5 from the count (24).",
    predicted={5: 6, 8: 2, 13: 7},
))

V.append(dict(
    id="V09", title="Evelyn", setting="87, vascular dementia after a stroke, nursing home",
    narrative=[
        "Since her stroke two years ago Evelyn cannot speak. She makes sounds but no words.",
        "After several falls, her care plan has her seated in a reclining chair with a fixed lap tray whenever she is up. Staff are sure she would get up and wander constantly if the tray were not in place: the last time it was left off, before this two-week period, she walked off aimlessly within minutes. During these two weeks the tray was always in place when she was up, and she did not pace or wander at all.",
        "On eight nights, around 3 am, she moaned loudly for a while: Days 1, 3, 4, 6, 8, 10, 11 and 13.",
        "Every day, late in the morning, she rubbed the lap tray in circles for a long stretch. During the first six days (Days 1 to 6) she also had a second stretch after supper.",
    ],
    items={
        1: [],
        4: [],
        6: [],
        12: at([0, 2, 3, 5, 7, 9, 10, 12], ["03:00"]),
        26: at(ALL_DAYS, ["11:00"]) + at(range(0, 6), ["18:00"]),
    },
    rate=[1, 4, 6, 12, 26],
    notes="Codes 8 and 9. #1 pacing is prevented by the lap tray: manual code 8 (p.3, p.5, p.24). #4 and #6 need words and she cannot speak: code 9 (p.3). The engine can only output 1 for an item with no logs; 8 and 9 exist only at the day-14 review (spec section 5).",
    predicted={1: 8, 4: 9, 6: 9, 12: 4, 26: 5},
))

V.append(dict(
    id="V10", title="Leonard", setting="80, mild to moderate Alzheimer's disease, assisted living",
    narrative=[
        "At lunch on Day 5 and on Day 11 Leonard spat a piece of gristle into his napkin. A new aide logged both times under \"Spitting\".",
        "On Day 9 at breakfast he told the aide she was \"useless and stupid\" when she brought the wrong cereal.",
        "Otherwise he was calm and content. He sat through activities without fidgeting and did not complain.",
    ],
    items={
        3: [(4, "12:30"), (10, "12:40")],
        4: [(8, "09:00")],
        18: [],
        29: [],
    },
    rate=[3, 4, 18, 29],
    notes="Logging error, not a rule question. Spitting into a napkin is excluded from #3 (p.12, p.24), so a manual rater gives 1; the app counts the two mistaken taps (3). Analyze separately from rule cases.",
    predicted={3: 1, 4: 2, 18: 1, 29: 1},
))

V.append(dict(
    id="V11", title="Joan", setting="83, Alzheimer's disease, nursing home",
    narrative=[
        "Morning care is the flashpoint for Joan. She hit the aide during the morning wash on Days 2, 5, 9 and 12.",
        "On two of those mornings (Days 5 and 12) she also scratched the aide's forearm.",
        "On Day 9, also during morning care, she bit the aide's hand (the skin was not broken).",
        "On six evenings (Days 1, 3, 6, 8, 10 and 13) she shoved other residents out of her way in the hallway on the way to the evening snack.",
        "She cursed at the aide every morning when care started. On six evenings (Days 1, 3, 5, 7, 9 and 11) she also swore at other residents.",
    ],
    items={
        7: [(1, "08:00"), (4, "08:10"), (8, "07:55"), (11, "08:05")],
        15: [(4, "08:12"), (11, "08:07")],
        14: [(8, "07:58")],
        10: at([0, 2, 5, 7, 9, 12], ["19:30"]),
        4: at(ALL_DAYS, ["08:00"]) + at([0, 2, 4, 6, 8, 10], ["19:30"]),
    },
    rate=[4, 7, 10, 14, 15],
    notes="Aggressive factor spread across bands 2-5. #7 at exactly twice a week (N=4).",
    predicted={4: 5, 7: 3, 10: 4, 14: 2, 15: 3},
))

V.append(dict(
    id="V12", title="Albert", setting="78, Alzheimer's disease, nursing home",
    narrative=[
        "Albert had a urinary tract infection in week 1. On Days 1 to 7 he screamed four times every day: in the morning, early afternoon, late afternoon and at night. After antibiotics he did not scream at all in week 2.",
        "On Days 1 to 7 he paced three times a day. On Days 8 to 14 he paced once a day, mid-afternoon.",
        "On Days 1 to 4 he kept rummaging through his roommate's drawers and taking things: four times on Day 1 and on Day 2, three times on Day 3 and on Day 4. He did not do it again.",
        "On Day 3 at noon he put a denture-cleaning tablet in his mouth and tried to swallow it. The aide removed it.",
    ],
    items={
        13: at(range(0, 7), ["09:00", "13:00", "17:00", "21:00"]),
        1: at(range(0, 7), ["10:00", "15:00", "19:00"]) + at(range(7, 14), ["15:00"]),
        22: at([0, 1], ["10:30", "14:30", "18:30", "20:30"]) + at([2, 3], ["10:30", "14:30", "18:30"]),
        20: [(2, "12:00")],
    },
    rate=[1, 13, 20, 22],
    notes="Irregular weeks the other way: behavior front-loaded. #13 is 4 a day for one week, none the next (average 2 a day, 5). #22 is 14 events packed into 4 days (average 1 a day, 5); a rater may say 'several times a week' (4) because it happened on only 4 days.",
    predicted={1: 5, 13: 5, 20: 2, 22: 4},
))


def iso(day, hhmm):
    h, m = map(int, hhmm.split(":"))
    return (WINDOW_START + timedelta(days=day, hours=h, minutes=m)).strftime("%Y-%m-%dT%H:%M:%SZ")


def build_json():
    out = {
        "about": "Fictional 2-week caregiver vignettes for the CMAI agreement study. Raters must NOT see this file (it has design notes). Each event is one caregiver tap: itemId + UTC timestamp. Window: windowStart inclusive to windowEnd exclusive.",
        "windowStart": WINDOW_START.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "windowEnd": (WINDOW_START + timedelta(days=14)).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "dayNumbering": "Narratives use Day 1-14 (Day 1 = Monday 2026-01-05). JSON 'day' fields are 0-13.",
        "vignettes": [],
    }
    for v in V:
        events = sorted(({"itemId": i, "at": iso(d, t)} for i, evs in v["items"].items() for d, t in evs),
                        key=lambda e: (e["at"], e["itemId"]))
        out["vignettes"].append({
            "id": v["id"], "name": v["title"], "setting": v["setting"],
            "ratedItems": v["rate"],
            "designNotes": v["notes"],
            "authorPrediction": {str(k): val for k, val in v["predicted"].items()},
            "authorPredictionNote": "The author's guess of what a manual-only rater would give. Not an answer key; never shown to raters.",
            "events": events,
        })
    (OUT / "vignettes.json").write_text(json.dumps(out, indent=2) + "\n")


INSTRUCTIONS = [
    "Use only the CMAI manual (Cohen-Mansfield, 1991). Read pages 2 to 5 (how to rate), pages 12 to 13 (detailed behavior descriptions) and pages 24 to 25 (long form with expanded descriptions, including codes 8 and 9) before you start.",
    "Each vignette describes the past two weeks (Day 1 to Day 14) for one fictional resident, as a caregiver would remember them. Rate how often each listed behavior happened over those two weeks, the way you would fill in the paper CMAI.",
    "Circle one answer per behavior: 1 to 7 for frequency, 8 if the behavior would occur if not prevented, or 9 if it is not applicable. The manual says to use 8 or 9 only if the behavior really did not occur in the two weeks (p.3).",
    "Behaviors not listed under a vignette did not happen. You do not need to rate them.",
    "Work alone. Do not discuss the vignettes with the other rater until you have both handed in your sheets. Do not open the app, vignettes.json, or app-ratings.csv.",
    "If you are unsure, pick the answer that best fits and write a short note. Notes are useful; a blank is not.",
]


def build_md():
    lines = ["# CMAI agreement study: vignettes", "",
             "Twelve fictional residents. Every name and event is made up. Each vignette covers 14 days; Day 1 is a Monday.", "",
             "## Instructions for raters", ""]
    lines += [f"{n}. {t}" for n, t in enumerate(INSTRUCTIONS, 1)]
    lines += ["", "Rating scale (manual p.5; codes 8 and 9 from p.3 and p.24):", ""]
    lines += [f"- **{k}** {LABELS[k]}" for k in LABELS]
    for v in V:
        lines += ["", f"## {v['id']}. {v['title']}", "", f"*{v['setting']}*", ""]
        for p in v["narrative"]:
            lines += [p, ""]
        lines += ["Behaviors to rate: " + "; ".join(f"#{i} {ITEM_NAMES[i]}" for i in v["rate"]) + "."]
    (OUT / "vignettes.md").write_text("\n".join(lines) + "\n")


def build_html():
    e = html.escape
    parts = ["""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>CMAI Rating Sheet</title>
<style>
:root { --ink:#111; --muted:#555; --line:#999; --bg:#fff; --shade:#f2f2f2; }
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--ink); font: 11pt/1.45 Georgia, "Times New Roman", serif; margin: 0 auto; max-width: 52rem; padding: 16px; }
h1 { font-size: 17pt; margin: 0 0 4px; } h2 { font-size: 13pt; margin: 0 0 2px; }
.muted { color: var(--muted); } .small { font-size: 9.5pt; }
.rater { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin: 12px 0 16px; }
.rater span { border-bottom: 1px solid var(--ink); display: inline-block; min-width: 12rem; }
ol.inst li { margin-bottom: 4px; }
.scale { border-collapse: collapse; margin: 8px 0 16px; font-size: 9.5pt; }
.scale td { border: 1px solid var(--line); padding: 2px 6px; }
section.v { page-break-before: always; break-before: page; padding-top: 4px; }
section.v p { margin: 0 0 8px; }
table.grid { border-collapse: collapse; width: 100%; margin-top: 10px; font-size: 9.5pt; table-layout: fixed; }
table.grid th, table.grid td { border: 1px solid var(--line); padding: 4px 2px; text-align: center; vertical-align: middle; }
table.grid th.item, table.grid td.item { text-align: left; width: 30%; padding-left: 6px; }
table.grid th { background: var(--shade); font-weight: normal; line-height: 1.15; }
table.grid td.note { width: 16%; }
.box { display: inline-block; width: 15px; height: 15px; border: 1.5px solid var(--ink); border-radius: 50%; }
.wrap { overflow-x: auto; }
@media print { body { padding: 0; max-width: none; } .wrap { overflow: visible; } }
@page { margin: 14mm; }
</style></head><body>
<h1>CMAI agreement study: rating sheet</h1>
<p class="muted">Twelve fictional residents. Every name and event is made up. This packet holds the vignettes and a blank rating grid for each one.</p>
<div class="rater"><div>Rater name: <span>&nbsp;</span></div><div>Date: <span>&nbsp;</span></div>
<div>Rater ID (A or B): <span>&nbsp;</span></div><div>Time taken (minutes): <span>&nbsp;</span></div></div>
<h2>Instructions</h2><ol class="inst">"""]
    parts += [f"<li>{e(t)}</li>" for t in INSTRUCTIONS]
    parts.append('</ol><h2>Rating scale</h2><p class="small muted">Manual p.5; codes 8 and 9 from p.3 and p.24.</p><table class="scale">')
    parts += [f"<tr><td><b>{k}</b></td><td>{e(LABELS[k])}</td></tr>" for k in LABELS]
    parts.append("</table>")
    head = "".join(f'<th>{k}<br><span class="small">{e(LABELS[k])}</span></th>' for k in LABELS)
    for v in V:
        parts.append(f'<section class="v"><h2>{v["id"]}. {e(v["title"])}</h2><p class="muted small"><i>{e(v["setting"])}</i></p>')
        parts += [f"<p>{e(p)}</p>" for p in v["narrative"]]
        parts.append(f'<div class="wrap"><table class="grid"><thead><tr><th class="item">Behavior (long form #)</th>{head}<th>Note</th></tr></thead><tbody>')
        for i in v["rate"]:
            cells = "".join('<td><span class="box"></span></td>' for _ in LABELS)
            parts.append(f'<tr><td class="item">#{i} {e(ITEM_NAMES[i])}</td>{cells}<td class="note"></td></tr>')
        parts.append("</tbody></table></div></section>")
    parts.append("</body></html>")
    (OUT / "rating-sheet.html").write_text("\n".join(parts) + "\n")


def build_template():
    with open(OUT / "human-ratings-template.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["vignette_id", "item_id", "item_name", "rater_A", "rater_B", "note_A", "note_B"])
        for v in V:
            for i in v["rate"]:
                w.writerow([v["id"], i, ITEM_NAMES[i], "", "", "", ""])


if __name__ == "__main__":
    build_json()
    build_md()
    build_html()
    build_template()
    print(f"Wrote {len(V)} vignettes, {sum(len(v['rate']) for v in V)} rating slots, to {OUT}")
