"""One-click preset analytics. Each returns title/desc/kpis/chart/table/insights."""
import pandas as pd
import numpy as np
from .pro_helpers import fmt, kpi, correlation_highlights, top_breakdown, quality_flags

MAX_CATS = 8
MAX_POINTS = 50


def p_overview(df, num, cat, dt, summary):
    tb = (summary.get("top_breakdown") or {}) if summary else {}
    chart = None
    if tb.get("chart"):
        chart = {"type": "bar", "data": tb["chart"][:MAX_CATS], "x_key": "name",
                 "series": [{"key": "value", "name": tb.get("numeric", "")}],
                 "title": f"Top {tb.get('category','')} by {tb.get('numeric','')}"}
    return {"title": "Executive Overview",
            "description": f"{len(df):,} rows · {df.shape[1]} columns · top findings below.",
            "kpis": (summary.get("kpis", []) or [])[:5],
            "chart": chart,
            "table": {"columns": ["category", "total", "average", "count"],
                      "rows": (tb.get("rows", []) or [])[:8]},
            "insights": summary.get("insights", []) if summary else []}


def p_breakdown(df, num, cat, dt):
    if not (num and cat):
        return {"title": "Top Breakdown",
                "description": "Needs one number and one category column.",
                "kpis": [], "chart": None,
                "table": {"columns": [], "rows": []},
                "insights": ["Add a numeric metric and a category column to use this."]}
    tb = top_breakdown(df, num, cat, MAX_CATS)
    rows = tb.get("rows", [])
    kpis = []
    if rows:
        top = rows[0]
        kpis.append(kpi(f"Top: {top['category']}", fmt(top["total"]),
                        f"{top['count']:,} records · avg {fmt(top['average'])}"))
        total = sum(r["total"] for r in rows) or 1
        kpis.append(kpi("Top share", f"{top['total']/total*100:.1f}%", f"of top {len(rows)}"))
    kpis.append(kpi("Segments", str(len(rows)), f"{tb['category']} split by {tb['numeric']}"))
    ins = []
    if rows:
        ins.append(f"“{rows[0]['category']}” leads with {fmt(rows[0]['total'])} ({rows[0]['count']:,} records).")
    if len(rows) >= 3:
        ins.append(f"Top 3 total {fmt(sum(r['total'] for r in rows[:3]))} — focus effort there.")
    return {"title": f"{tb['numeric']} by {tb['category']}",
            "description": "Ranked segments with totals and averages.",
            "kpis": kpis,
            "chart": {"type": "bar",
                      "data": [{"name": r["category"], "value": r["total"]} for r in rows],
                      "x_key": "name", "series": [{"key": "value", "name": tb["numeric"]}],
                      "title": f"{tb['numeric']} by {tb['category']}"},
            "table": {"columns": ["category", "total", "average", "count"], "rows": rows},
            "insights": ins}


def p_trend(df, num, cat, dt):
    if not num:
        return {"title": "Trend", "description": "Needs a numeric column.",
                "kpis": [], "chart": None,
                "table": {"columns": [], "rows": []}, "insights": []}
    nc = num[0]
    s = pd.to_numeric(df[nc], errors="coerce")
    if dt:
        try:
            d = pd.to_datetime(df[dt[0]], errors="coerce")
            m = pd.DataFrame({"d": d, "v": s}).dropna().sort_values("d")
            if len(m) >= 2:
                m["bin"] = pd.cut(m["d"].astype("int64"), bins=min(MAX_POINTS, len(m)))
                g = m.groupby("bin", observed=True)["v"].mean()
                pts = []
                for i, (idx, v) in enumerate(g.items()):
                    try:
                        name = str(idx.mid.date())
                    except Exception:
                        name = str(i)
                    pts.append({"name": name, "value": round(float(v), 2)})
                chg = (g.iloc[-1]-g.iloc[0])/abs(g.iloc[0])*100 if g.iloc[0] else 0
                tone = "good" if chg > 2 else ("bad" if chg < -2 else "neutral")
                msg = (f"{nc} moved {chg:+.1f}% start → end."
                       + (" Momentum is positive." if chg > 5
                          else (" Declining — investigate." if chg < -5 else " Essentially flat.")))
                return {"title": f"{nc} over {dt[0]}",
                        "description": f"{len(m):,} points bucketed.",
                        "kpis": [kpi("Start", fmt(g.iloc[0]), ""),
                                 kpi("End", fmt(g.iloc[-1]), f"{chg:+.1f}%", tone),
                                 kpi("Peak", fmt(g.max()), "")],
                        "chart": {"type": "line", "data": pts, "x_key": "name",
                                  "series": [{"key": "value", "name": nc}], "title": f"{nc} trend"},
                        "table": {"columns": ["period", "value"],
                                  "rows": [{"period": p["name"], "value": p["value"]} for p in pts[-10:]]},
                        "insights": [msg]}
        except Exception:
            pass
    v = s.dropna().reset_index(drop=True)
    if len(v) == 0:
        return {"title": "Trend", "description": "No numeric values.",
                "kpis": [], "chart": None,
                "table": {"columns": [], "rows": []}, "insights": []}
    step = max(1, len(v)//MAX_POINTS)
    pts = [{"name": str(i*step), "value": round(float(x), 2)} for i, x in enumerate(v[::step])]
    return {"title": f"{nc} trend (row order)",
            "description": "No date column — plotted in row order.",
            "kpis": [kpi("Average", fmt(v.mean()), ""), kpi("Last", fmt(v.iloc[-1]), "")],
            "chart": {"type": "line", "data": pts, "x_key": "name",
                      "series": [{"key": "value", "name": nc}], "title": nc},
            "table": {"columns": [], "rows": []},
            "insights": ["Add a date column for a true time trend."]}
