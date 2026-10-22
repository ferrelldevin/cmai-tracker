#!/usr/bin/env python3
"""Agreement analysis for the CMAI vignette study. Standard library only (no numpy, sklearn or matplotlib needed).

Inputs (same folder by default):
  app-ratings.csv      from scripts/score-vignettes.ts (the app's derived ratings)
  human-ratings.csv    a filled-in copy of human-ratings-template.csv (columns rater_A, rater_B)

Outputs:
  agreement-report.md            kappa, within-1-point agreement, code 8/9 table, biggest disagreements
  bland-altman-app-vs-raters.svg totals: app vs the mean of the two raters
  bland-altman-rater-A-vs-B.svg  totals: rater A vs rater B (the human baseline)

Usage:
  python3 analyze.py                       # uses human-ratings.csv
  python3 analyze.py --human my-file.csv
  python3 analyze.py --demo                # makes dummy-human-ratings.csv and analyzes it (self-test)
  python3 analyze.py --selftest            # checks the kappa code against hand-worked values

Statistics:
  - Quadratic weighted kappa (Cohen 1968; weights (i-j)^2/(k-1)^2, fixed categories 1-7).
  - Exact agreement and agreement within 1 point. The manual's inter-rater standard counts a 0- or
    1-point discrepancy as agreement (CMAI manual p.7; reported values .88 to .92).
  - 95% CIs by bootstrap over vignettes (items in one vignette are not independent).
  - Codes 8 and 9 are not on the 1-7 scale, so items where either side used 8 or 9 are left out of kappa
    and reported in their own table (manual p.5: analyze them separately).
  - Bland-Altman (1986) on per-vignette totals over the items every source rated 1-7.
"""
import argparse
import csv
import math
import random
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
CATS = list(range(1, 8))
LOGGING_ERROR_VIGNETTES = {"V10"}  # by design a mis-tap case, not a test of the count rule
WITHIN1_STANDARD = 0.88  # lowest of the manual's reported within-1-point rates (p.7)


# ---------------------------------------------------------------- statistics

def weighted_kappa(a, b, cats=CATS):
    """Quadratic weighted Cohen's kappa. a, b: equal-length lists of category values."""
    k = len(cats)
    idx = {c: i for i, c in enumerate(cats)}
    n = len(a)
    if n == 0:
        return float("nan")
    obs = [[0.0] * k for _ in range(k)]
    for x, y in zip(a, b):
        obs[idx[x]][idx[y]] += 1
    ra = [sum(row) for row in obs]
    cb = [sum(obs[i][j] for i in range(k)) for j in range(k)]
    num = den = 0.0
    for i in range(k):
        for j in range(k):
            w = (i - j) ** 2 / (k - 1) ** 2
            num += w * obs[i][j]
            den += w * ra[i] * cb[j] / n
    return float("nan") if den == 0 else 1 - num / den


def pct(cond):
    return sum(cond) / len(cond) if cond else float("nan")


def mean(xs):
    return sum(xs) / len(xs) if xs else float("nan")


def sd(xs):
    if len(xs) < 2:
        return float("nan")
    m = mean(xs)
    return math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))


def bootstrap(rows_by_v, stat, reps=2000, seed=7):
    """Percentile 95% CI, resampling whole vignettes."""
    rng = random.Random(seed)
    keys = list(rows_by_v)
    vals = []
    for _ in range(reps):
        sample = [r for _k in keys for r in rows_by_v[rng.choice(keys)]]
        v = stat(sample)
        if not math.isnan(v):
            vals.append(v)
    if not vals:
        return (float("nan"), float("nan"))
    vals.sort()
    return vals[int(0.025 * len(vals))], vals[int(0.975 * len(vals)) - 1]


# ---------------------------------------------------------------- data

def read_csv(path):
    with open(path, newline="") as f:
        return list(csv.DictReader(f))


def to_int(s):
    s = (s or "").strip()
    return int(s) if s.isdigit() else None


def load(app_path, human_path):
    app = {(r["vignette_id"], int(r["item_id"])): r for r in read_csv(app_path)}
    rows = []
    for h in read_csv(human_path):
        key = (h["vignette_id"], int(h["item_id"]))
        if key not in app:
            sys.exit(f"{human_path}: {key} is not in {app_path}")
        a, b = to_int(h.get("rater_A")), to_int(h.get("rater_B"))
        for name, val in (("rater_A", a), ("rater_B", b)):
            if val is not None and not 1 <= val <= 9:
                sys.exit(f"{key} {name}={val}: ratings must be 1-9")
        rows.append({"v": key[0], "item": key[1], "name": app[key]["item_name"],
                     "app": int(app[key]["app_rating"]), "count": int(app[key]["count"]), "A": a, "B": b})
    missing = [(r["v"], r["item"]) for r in rows if r["A"] is None or r["B"] is None]
    if missing:
        sys.exit(f"{len(missing)} blank ratings, for example {missing[:3]}. Fill every rater_A and rater_B cell first.")
    return rows


# ---------------------------------------------------------------- report

PAIRS = [("A", "B", "Rater A vs rater B (human baseline)"),
         ("app", "A", "App vs rater A"),
         ("app", "B", "App vs rater B")]


def pair_stats(rows, x, y):
    sub = [r for r in rows if r[x] <= 7 and r[y] <= 7]
    by_v = {}
    for r in sub:
        by_v.setdefault(r["v"], []).append(r)
    k = lambda s: weighted_kappa([r[x] for r in s], [r[y] for r in s])
    w1 = lambda s: pct([abs(r[x] - r[y]) <= 1 for r in s])
    return {
        "n": len(sub),
        "kappa": k(sub), "kappa_ci": bootstrap(by_v, k),
        "exact": pct([r[x] == r[y] for r in sub]),
        "within1": w1(sub), "within1_ci": bootstrap(by_v, w1),
        "bias": mean([r[x] - r[y] for r in sub]),
    }


def fmt(x, p=2):
    return "n/a" if x is None or (isinstance(x, float) and math.isnan(x)) else f"{x:.{p}f}"


def fmtp(x):
    return "n/a" if math.isnan(x) else f"{100 * x:.0f}%"


def totals(rows):
    """Per-vignette totals over items that app, A and B all rated 1-7."""
    out = {}
    for r in rows:
        if r["A"] <= 7 and r["B"] <= 7:
            t = out.setdefault(r["v"], {"app": 0, "A": 0, "B": 0, "n": 0})
            t["app"] += r["app"]; t["A"] += r["A"]; t["B"] += r["B"]; t["n"] += 1
    return out


def bland_altman_svg(path, points, title, xlab, ylab):
    """points: list of (label, mean, diff). Writes a plain SVG (no plotting library)."""
    diffs = [d for _, _, d in points]
    md, s = mean(diffs), sd(diffs)
    lo, hi = (md - 1.96 * s, md + 1.96 * s) if not math.isnan(s) else (md, md)
    W, H, L, R, T, B = 640, 420, 64, 120, 48, 52
    xs = [m for _, m, _ in points]
    xmin, xmax = min(xs) - 2, max(xs) + 2
    yspan = max([abs(d) for d in diffs] + [abs(lo), abs(hi), 2]) + 1
    ymin, ymax = -yspan, yspan
    X = lambda v: L + (v - xmin) / (xmax - xmin) * (W - L - R)
    Y = lambda v: T + (ymax - v) / (ymax - ymin) * (H - T - B)
    e = lambda t: t.replace("&", "&amp;").replace("<", "&lt;")
    g = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="Helvetica, Arial, sans-serif" font-size="12">',
         f'<rect width="{W}" height="{H}" fill="#fff"/>',
         f'<text x="{L}" y="24" font-size="15" font-weight="bold" fill="#111">{e(title)}</text>',
         f'<line x1="{L}" y1="{Y(0)}" x2="{W - R}" y2="{Y(0)}" stroke="#bbb"/>']
    for v in range(math.ceil(ymin), math.floor(ymax) + 1):
        if v % 2 == 0:
            g.append(f'<text x="{L - 8}" y="{Y(v) + 4}" text-anchor="end" fill="#555">{v}</text>')
    step = max(1, round((xmax - xmin) / 8))
    for v in range(math.ceil(xmin), math.floor(xmax) + 1, step):
        g.append(f'<text x="{X(v)}" y="{H - B + 18}" text-anchor="middle" fill="#555">{v}</text>')
    for val, name, dash in ((md, f"mean {md:+.2f}", ""), (hi, f"+1.96 SD {hi:+.2f}", "6 4"), (lo, f"-1.96 SD {lo:+.2f}", "6 4")):
        g.append(f'<line x1="{L}" y1="{Y(val)}" x2="{W - R}" y2="{Y(val)}" stroke="#1f55a5" stroke-dasharray="{dash}"/>')
        g.append(f'<text x="{W - R + 6}" y="{Y(val) + 4}" fill="#1f55a5">{name}</text>')
    for lab, m, d in points:
        g.append(f'<circle cx="{X(m)}" cy="{Y(d)}" r="5" fill="#d9480f" fill-opacity="0.8"><title>{lab}: mean {m:.1f}, diff {d:+.1f}</title></circle>')
        g.append(f'<text x="{X(m) + 7}" y="{Y(d) - 6}" font-size="10" fill="#333">{lab}</text>')
    g.append(f'<rect x="{L}" y="{T}" width="{W - L - R}" height="{H - T - B}" fill="none" stroke="#333"/>')
    g.append(f'<text x="{(L + W - R) / 2}" y="{H - 10}" text-anchor="middle" fill="#111">{e(xlab)}</text>')
    g.append(f'<text transform="translate(16 {(T + H - B) / 2}) rotate(-90)" text-anchor="middle" fill="#111">{e(ylab)}</text>')
    g.append("</svg>")
    Path(path).write_text("\n".join(g) + "\n")
    return md, lo, hi


def report(rows, outdir, human_name):
    out = [f"# CMAI agreement report", "", f"Input: `{human_name}` and `app-ratings.csv`. Generated by `analyze.py`.", ""]
    rule_rows = [r for r in rows if r["v"] not in LOGGING_ERROR_VIGNETTES]
    headline = pair_stats(rule_rows, "app", "A"), pair_stats(rule_rows, "app", "B")
    base = pair_stats(rule_rows, "A", "B")
    passes = all(s["within1"] >= WITHIN1_STANDARD for s in headline)
    out += ["## Answer first", "",
            f"- App within 1 point of rater A on {fmtp(headline[0]['within1'])} of items and of rater B on {fmtp(headline[1]['within1'])} "
            f"(rule cases, n = {headline[0]['n']} and {headline[1]['n']}). The manual's own inter-rater rates were .88 to .92 (p.7).",
            f"- Verdict against the manual's standard (at least {WITHIN1_STANDARD:.0%} within 1 point with each rater): **{'meets it' if passes else 'does not meet it'}**.",
            f"- Human baseline: raters A and B agree within 1 point on {fmtp(base['within1'])}, weighted kappa {fmt(base['kappa'])}.",
            "- With 12 vignettes the confidence intervals are wide. Treat this as a pilot, not proof.", ""]
    for label, subset in (("Rule cases (all vignettes except the logging-error case " + ", ".join(sorted(LOGGING_ERROR_VIGNETTES)) + ")", rule_rows),
                          ("All vignettes", rows)):
        out += [f"## {label}", "", "| Comparison | Items | Weighted kappa (95% CI) | Exact | Within 1 point (95% CI) | Mean difference |",
                "|---|---|---|---|---|---|"]
        for x, y, name in PAIRS:
            s = pair_stats(subset, x, y)
            out.append(f"| {name} | {s['n']} | {fmt(s['kappa'])} ({fmt(s['kappa_ci'][0])} to {fmt(s['kappa_ci'][1])}) | {fmtp(s['exact'])} | "
                       f"{fmtp(s['within1'])} ({fmtp(s['within1_ci'][0])} to {fmtp(s['within1_ci'][1])}) | {s['bias']:+.2f} |")
        out.append("")
    out += ["Mean difference is first minus second (for example app minus rater A). Positive means the app rates higher.", ""]

    special = [r for r in rows if r["A"] >= 8 or r["B"] >= 8]
    out += ["## Codes 8 and 9", "",
            "The app's count rule can only give 1 to 7; codes 8 and 9 exist only at the day-14 review (scoring-spec section 5). "
            "These items are left out of kappa.", ""]
    if special:
        out += ["| Vignette | Item | App (derived) | Rater A | Rater B | Raters agree |", "|---|---|---|---|---|---|"]
        out += [f"| {r['v']} | #{r['item']} {r['name']} | {r['app']} | {r['A']} | {r['B']} | {'yes' if r['A'] == r['B'] else 'no'} |" for r in special]
    else:
        out.append("No rater used 8 or 9.")
    out.append("")

    big = sorted([r for r in rows if r["A"] <= 7 and r["B"] <= 7 and max(abs(r["app"] - r["A"]), abs(r["app"] - r["B"])) >= 2],
                 key=lambda r: -max(abs(r["app"] - r["A"]), abs(r["app"] - r["B"])))
    out += ["## Items where the app is 2 or more points from a rater", ""]
    if big:
        out += ["| Vignette | Item | Logs | App | Rater A | Rater B |", "|---|---|---|---|---|---|"]
        out += [f"| {r['v']} | #{r['item']} {r['name']} | {r['count']} | {r['app']} | {r['A']} | {r['B']} |" for r in big]
    else:
        out.append("None.")
    out.append("")

    t = totals(rows)
    pts_app = [(v, (x["app"] + (x["A"] + x["B"]) / 2) / 2, x["app"] - (x["A"] + x["B"]) / 2) for v, x in sorted(t.items())]
    pts_ab = [(v, (x["A"] + x["B"]) / 2, x["A"] - x["B"]) for v, x in sorted(t.items())]
    md1, lo1, hi1 = bland_altman_svg(outdir / "bland-altman-app-vs-raters.svg", pts_app, "Bland-Altman: app vs mean of raters (vignette totals)",
                                     "Mean of app total and raters' mean total", "App total minus raters' mean total")
    md2, lo2, hi2 = bland_altman_svg(outdir / "bland-altman-rater-A-vs-B.svg", pts_ab, "Bland-Altman: rater A vs rater B (vignette totals)",
                                     "Mean of the two raters' totals", "Rater A total minus rater B total")
    out += ["## Bland-Altman on vignette totals", "",
            "Totals use only the items that the app and both raters rated 1 to 7, so each vignette's three totals cover the same items. "
            "The manual says a summed total is not useful for analysis (p.5); this plot is here because the app shows a total.", "",
            f"- App vs raters' mean: bias {md1:+.2f}, 95% limits of agreement {lo1:+.2f} to {hi1:+.2f}. See `bland-altman-app-vs-raters.svg`.",
            f"- Rater A vs rater B: bias {md2:+.2f}, 95% limits of agreement {lo2:+.2f} to {hi2:+.2f}. See `bland-altman-rater-A-vs-B.svg`.", "",
            "| Vignette | Items | App | Rater A | Rater B |", "|---|---|---|---|---|"]
    out += [f"| {v} | {x['n']} | {x['app']} | {x['A']} | {x['B']} |" for v, x in sorted(t.items())]
    out.append("")
    (outdir / "agreement-report.md").write_text("\n".join(out) + "\n")
    return "\n".join(out)


# ---------------------------------------------------------------- self-tests and demo

def selftest():
    # Perfect agreement -> 1.
    assert abs(weighted_kappa([1, 2, 3, 4], [1, 2, 3, 4]) - 1) < 1e-12
    # Hand-worked example using categories 1 and 2 only (the 1/36 weight cancels in the ratio):
    # a=[1,1,2,2], b=[1,2,2,2]. Observed off-diagonal count = 1.
    # Margins: A has 2 ones, 2 twos; B has 1 one, 3 twos. Expected off-diagonal = (2*3 + 2*1)/4 = 2.
    # kappa = 1 - 1/2 = 0.5
    a, b = [1, 1, 2, 2], [1, 2, 2, 2]
    assert abs(weighted_kappa(a, b) - 0.5) < 1e-12
    # Symmetry.
    x, y = [1, 3, 5, 7, 2, 4], [2, 3, 4, 7, 1, 6]
    assert abs(weighted_kappa(x, y) - weighted_kappa(y, x)) < 1e-12
    # Known value from sklearn.metrics.cohen_kappa_score(x, y, weights="quadratic", labels=range(1, 8)).
    # (Also checked against sklearn on 200 random rating sets during development: max difference < 1e-9.)
    assert abs(weighted_kappa(x, y) - 0.8609271523178808) < 1e-9, weighted_kappa(x, y)
    print("selftest ok")


def make_demo(app_path, out_path, seed=1):
    """Dummy raters: app rating plus noise, with codes 8/9 where the design calls for them. For testing only."""
    rng = random.Random(seed)
    rows = read_csv(app_path)
    with open(out_path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["vignette_id", "item_id", "item_name", "rater_A", "rater_B", "note_A", "note_B"])
        for r in rows:
            app = int(r["app_rating"])
            vals = []
            for _ in range(2):
                v = min(7, max(1, app + rng.choice([-1, 0, 0, 0, 1, 0, -2 if app > 3 else 0])))
                vals.append(v)
            if r["vignette_id"] == "V09" and r["item_id"] == "1":
                vals = [8, 8]
            if r["vignette_id"] == "V09" and r["item_id"] in ("4", "6"):
                vals = [9, 9 if r["item_id"] == "6" else 1]
            w.writerow([r["vignette_id"], r["item_id"], r["item_name"], vals[0], vals[1], "DUMMY", "DUMMY"])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--app", default=str(HERE / "app-ratings.csv"))
    ap.add_argument("--human", default=str(HERE / "human-ratings.csv"))
    ap.add_argument("--out", default=str(HERE))
    ap.add_argument("--demo", action="store_true", help="write dummy-human-ratings.csv and analyze it into ./demo-output/")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()
    if a.selftest:
        selftest()
        return
    human, outdir = Path(a.human), Path(a.out)
    if a.demo:
        selftest()
        outdir = HERE / "demo-output"
        outdir.mkdir(exist_ok=True)
        human = outdir / "dummy-human-ratings.csv"
        make_demo(a.app, human)
        print(f"DEMO MODE: dummy ratings in {human}. These are not real ratings.")
    if not human.exists():
        sys.exit(f"{human} not found. Copy human-ratings-template.csv to human-ratings.csv and fill in rater_A and rater_B.")
    rows = load(a.app, human)
    text = report(rows, outdir, human.name)
    print(text.split("## Rule cases")[0])
    print(f"Full report: {outdir / 'agreement-report.md'}")


if __name__ == "__main__":
    main()
