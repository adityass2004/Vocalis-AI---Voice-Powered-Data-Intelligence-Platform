"""Professional analytics helpers: KPIs, insights, correlation highlights."""
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional


def compact(n) -> str:
    try:
        n = float(n)
    except Exception:
        return str(n)
    a = abs(n)
    if a >= 1_000_000:
        return f"{n/1_000_000:.1f}M"
    if a >= 1_000:
        return f"{n/1_000:.1f}K"
    if a >= 100:
        return f"{n:,.0f}"
    if a >= 1:
        s = f"{n:,.2f}".rstrip("0").rstrip(".")
        return s
    return f"{n:.3g}"


def fmt(v) -> str:
    if v is None:
        return "—"
    try:
        if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
            return "—"
    except Exception:
        pass
    if isinstance(v, float):
        return compact(v)
    if isinstance(v, (int, np.integer)):
        return f"{int(v):,}"
    return str(v)


def kpi(label: str, value: str, hint: str = "", tone: str = "neutral"):
    return {"label": label, "value": value, "hint": hint, "tone": tone}


def dataset_cols(df: pd.DataFrame, info: dict):
    num = list((info or {}).get("numeric_columns", []) or [])
    cat = list((info or {}).get("categorical_columns", []) or [])
    dt = list((info or {}).get("datetime_columns", []) or [])
    if not num:
        num = df.select_dtypes(include="number").columns.tolist()
    if not cat:
        cat = [c for c in df.columns if c not in num + dt][:10]
    return num, cat, dt


def correlation_highlights(df: pd.DataFrame, num: List[str], limit=5):
    if len(num) < 2:
        return []
    try:
        corr = df[num].select_dtypes(include="number").corr(numeric_only=True)
    except Exception:
        return []
    pairs = []
    cols = list(corr.columns)
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            v = corr.iloc[i, j]
            if pd.isna(v):
                continue
            pairs.append({"col_a": cols[i], "col_b": cols[j],
                          "correlation": round(float(v), 3),
                          "strength": ("strong" if abs(v) >= 0.7
                                       else ("moderate" if abs(v) >= 0.4 else "weak"))})
    pairs.sort(key=lambda x: abs(x["correlation"]), reverse=True)
    return [p for p in pairs if abs(p["correlation"]) >= 0.3][:limit]


def top_breakdown(df: pd.DataFrame, num: List[str], cat: List[str], limit=8):
    if not num or not cat:
        return {}
    nc, cc = num[0], cat[0]
    try:
        g = df.groupby(df[cc].astype(str))[nc].agg(["mean", "sum", "count"])
        g = g.sort_values("sum", ascending=False).head(limit)
        rows = [{"category": str(i), "total": round(float(r["sum"]), 2),
                 "average": round(float(r["mean"]), 2),
                 "count": int(r["count"])} for i, r in g.iterrows()]
        return {"numeric": nc, "category": cc, "rows": rows,
                "chart": [{"name": r["category"], "value": r["total"]} for r in rows]}
    except Exception:
        return {}


def quality_flags(df: pd.DataFrame, dq: dict, limit=6):
    flags = []
    for c in df.columns:
        pct = float(df[c].isnull().mean() * 100)
        if pct >= 20:
            flags.append({"level": "bad", "text": f"{c}: {pct:.0f}% missing"})
        elif pct >= 5:
            flags.append({"level": "warn", "text": f"{c}: {pct:.1f}% missing"})
    if (dq.get("duplicate_rows", 0) or 0) > 0:
        flags.append({"level": "warn", "text": f"{dq['duplicate_rows']:,} duplicate rows"})
    if not flags:
        flags.append({"level": "good", "text": "No major quality issues"})
    return flags[:limit]


def headline_insights(df: pd.DataFrame, num, cat, dt, max_n=6) -> List[str]:
    out: List[str] = [f"Dataset has {len(df):,} rows × {df.shape[1]} columns."]
    if num:
        c = num[0]
        s = pd.to_numeric(df[c], errors="coerce").dropna()
        if len(s):
            out.append(f"{c}: average {fmt(s.mean())}, median {fmt(s.median())}, "
                       f"spans {fmt(s.min())} to {fmt(s.max())}.")
            if s.mean() and abs(s.std() / s.mean()) > 1:
                out.append(f"{c} varies widely — check for outliers or segments.")
    if cat:
        c = cat[0]
        nn = int(df[c].notna().sum())
        vc = df[c].astype(str).value_counts().head(3)
        if len(vc) and nn:
            out.append(f"Top {c}: “{vc.index[0]}” ({vc.iloc[0]/nn*100:.1f}% of records).")
    if dt and num:
        try:
            d = pd.to_datetime(df[dt[0]], errors="coerce")
            s = pd.to_numeric(df[num[0]], errors="coerce")
            m = pd.DataFrame({"d": d, "v": s}).dropna().sort_values("d")
            if len(m) >= 4:
                first = m["v"].head(max(1, len(m)//4)).mean()
                last = m["v"].tail(max(1, len(m)//4)).mean()
                if first and not pd.isna(first) and not pd.isna(last):
                    chg = (last-first)/abs(first)*100 if first != 0 else 0
                    direction = "up" if chg > 2 else ("down" if chg < -2 else "flat")
                    out.append(f"{num[0]} trends {direction} over {dt[0]} ({chg:+.1f}%).")
        except Exception:
            pass
    h = correlation_highlights(df, num, limit=1)
    if h:
        out.append(f"Strongest link: {h[0]['col_a']} ↔ {h[0]['col_b']} (r = {h[0]['correlation']:.2f}).")
    miss = df.isnull().sum()
    worst = miss[miss > 0].sort_values(ascending=False).head(1)
    for c, n in worst.items():
        pct = n/len(df)*100
        if pct >= 5:
            out.append(f"Data gap: {c} is missing {pct:.1f}% — fill or exclude before reporting.")
    return out[:max_n]
