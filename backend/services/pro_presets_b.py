"""Presets part 2: distribution, correlation, outliers, quality."""
import pandas as pd
import numpy as np
from .pro_helpers import fmt, kpi, correlation_highlights, quality_flags


def p_distribution(df, num, cat, dt):
    if not num:
        return {"title": "Distribution", "description": "Needs a numeric column.",
                "kpis": [], "chart": None,
                "table": {"columns": [], "rows": []}, "insights": []}
    nc = num[0]
    s = pd.to_numeric(df[nc], errors="coerce").dropna()
    if len(s) == 0:
        return {"title": f"Distribution of {nc}", "description": "No values.",
                "kpis": [], "chart": None,
                "table": {"columns": [], "rows": []}, "insights": []}
    q = s.quantile([0.25, 0.5, 0.75])
    hist, edges = np.histogram(s, bins=min(20, max(5, len(s)//20 or 5)))
    pts = [{"name": f"{edges[i]:.1f}–{edges[i+1]:.1f}", "value": int(hist[i])}
           for i in range(len(hist))]
    skew = float(s.skew()) if len(s) > 2 else 0
    shape = ("roughly symmetric" if abs(skew) < 0.5
             else ("right-skewed (a few large values)" if skew > 0
                   else "left-skewed (a few small values)"))
    return {"title": f"Distribution of {nc}",
            "description": f"{len(s):,} values · {shape}.",
            "kpis": [kpi("Mean", fmt(s.mean()), f"median {fmt(q[0.5])}"),
                     kpi("Std dev", fmt(s.std()), ""),
                     kpi("P25 – P75", f"{fmt(q[0.25])} – {fmt(q[0.75])}",
                         f"IQR {fmt(q[0.75]-q[0.25])}")],
            "chart": {"type": "bar", "data": pts, "x_key": "name",
                      "series": [{"key": "value", "name": "count"}],
                      "title": f"{nc} histogram"},
            "table": {"columns": [], "rows": []},
            "insights": [f"{nc} is {shape}.",
                         f"Middle 50% sits between {fmt(q[0.25])} and {fmt(q[0.75])}."]}


def p_correlation(df, num, cat, dt):
    h = correlation_highlights(df, num, limit=5)
    if not h:
        return {"title": "Correlations", "description": "No meaningful links found.",
                "kpis": [], "chart": None,
                "table": {"columns": [], "rows": []},
                "insights": ["Numeric columns move independently — segment the data instead."]}
    top = h[0]
    return {"title": "Strongest Relationships",
            "description": "Ranked by |Pearson r|.",
            "kpis": [kpi(f"{top['col_a']} ↔ {top['col_b']}",
                         f"r = {top['correlation']:.2f}", top["strength"])],
            "chart": {"type": "bar",
                      "data": [{"name": f"{p['col_a']}↔{p['col_b']}",
                                "value": p["correlation"]} for p in h],
                      "x_key": "name", "series": [{"key": "value", "name": "r"}],
                      "title": "Top correlations"},
            "table": {"columns": ["col_a", "col_b", "correlation", "strength"], "rows": h},
            "insights": [f"{p['col_a']} and {p['col_b']}: "
                         f"{'move together' if p['correlation'] > 0 else 'move opposite'} "
                         f"(r={p['correlation']:.2f})." for p in h[:3]]}


def p_outliers(df, num, cat, dt):
    if not num:
        return {"title": "Outliers", "description": "Needs a numeric column.",
                "kpis": [], "chart": None,
                "table": {"columns": [], "rows": []}, "insights": []}
    nc = num[0]
    s = pd.to_numeric(df[nc], errors="coerce").dropna()
    q1, q3 = s.quantile(0.25), s.quantile(0.75)
    iqr = q3 - q1
    lo, hi = q1 - 1.5*iqr, q3 + 1.5*iqr
    outs = s[(s < lo) | (s > hi)].sort_values(ascending=False)
    rows = []
    for i in outs.index.tolist()[:10]:
        r = {"row": int(i), nc: round(float(df.at[i, nc]), 2)}
        if cat:
            r[cat[0]] = str(df.at[i, cat[0]])
        rows.append(r)
    cols = ["row", nc] + ([cat[0]] if cat else [])
    pct = len(outs)/max(len(s), 1)*100
    return {"title": f"Outlier Scan — {nc}",
            "description": f"IQR bounds [{fmt(lo)}, {fmt(hi)}] · {len(outs)} outliers ({pct:.1f}%).",
            "kpis": [kpi("Outliers", str(len(outs)), f"{pct:.1f}% of values",
                         "warn" if len(outs) else "good"),
                     kpi("Normal range", f"{fmt(lo)} – {fmt(hi)}", f"IQR {fmt(iqr)}"),
                     kpi("Max outlier", fmt(outs.max()) if len(outs) else "—", "")],
            "chart": None,
            "table": {"columns": cols, "rows": rows},
            "insights": ([f"{len(outs)} values outside [{fmt(lo)}, {fmt(hi)}] — review before averaging."]
                         if len(outs) else ["No significant outliers — averages are safe."])}


def p_quality(df, num, cat, dt, dq):
    miss = df.isnull().mean().sort_values(ascending=False)
    rows = [{"column": str(c), "missing_pct": round(float(v)*100, 1),
             "complete_pct": round((1-float(v))*100, 1)} for c, v in miss.items()]
    chart = {"type": "bar",
             "data": [{"name": r["column"], "value": r["complete_pct"]} for r in rows],
             "x_key": "name", "series": [{"key": "value", "name": "complete %"}],
             "title": "Completeness by column"}
    flags = quality_flags(df, dq or {})
    dupes = int(df.duplicated().sum())
    comp = (1-miss.mean() if len(miss) else 1)*100
    return {"title": "Data Quality",
            "description": "Completeness per column and fixes.",
            "kpis": [kpi("Completeness", f"{comp:.1f}%", ""),
                     kpi("Duplicates", f"{dupes:,}", "remove before reporting",
                         "warn" if dupes else "good")],
            "chart": chart,
            "table": {"columns": ["column", "missing_pct", "complete_pct"], "rows": rows},
            "insights": [f["text"] for f in flags]}
