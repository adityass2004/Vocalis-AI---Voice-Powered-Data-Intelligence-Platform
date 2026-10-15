"""Report sections part 2: distribution, correlation, outliers, quality, appendix."""
import pandas as pd
import numpy as np
from reportlab.platypus import Paragraph, Spacer
from reportlab.lib.units import mm
from .report_build_a import ST, _img, _styled_table, COLORS
from . import report_charts as rc
from .pro_helpers import fmt


def distribution_section(story, df, num):
    if not num:
        return
    nc = num[0]
    s = pd.to_numeric(df[nc], errors="coerce").dropna()
    if not len(s):
        return
    q = s.quantile([0.25, 0.5, 0.75])
    story.append(Paragraph(f"4 &nbsp; Distribution — {nc}", ST["h1"]))
    story.append(Paragraph(
        f"Mean {fmt(s.mean())}  •  Median {fmt(q[0.5])}  •  Std {fmt(s.std())}  •  "
        f"P25–P75 {fmt(q[0.25])}–{fmt(q[0.75])}", ST["muted"]))
    story.append(Spacer(1, 2 * mm))
    story.append(_img(rc.hist_chart(s, f"Distribution of {nc}")))


def correlation_section(story, df, num):
    if len(num) < 2:
        return
    try:
        corr = df[num].select_dtypes(include="number").corr(numeric_only=True)
    except Exception:
        return
    if corr.empty:
        return
    story.append(Paragraph("5 &nbsp; Correlations", ST["h1"]))
    story.append(Paragraph("Ranked by |Pearson r| — strongest relationships first.", ST["muted"]))
    story.append(Spacer(1, 2 * mm))
    story.append(_img(rc.corr_heatmap(corr)))
    story.append(Spacer(1, 3 * mm))
    pairs = []
    cols = list(corr.columns)
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            v = corr.iloc[i, j]
            if pd.notna(v):
                pairs.append((cols[i], cols[j], float(v)))
    pairs.sort(key=lambda x: abs(x[2]), reverse=True)
    story.append(_styled_table(["Variable A", "Variable B", "r", "Reading"],
                               [[a, b, f"{v:.3f}",
                                 "strong" if abs(v) >= 0.7 else ("moderate" if abs(v) >= 0.4 else "weak")]
                                for a, b, v in pairs[:8]]))


def outliers_section(story, df, num, cat):
    if not num:
        return
    nc = num[0]
    s = pd.to_numeric(df[nc], errors="coerce").dropna()
    if not len(s):
        return
    q1, q3 = s.quantile(0.25), s.quantile(0.75)
    iqr = q3 - q1
    lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    outs = s[(s < lo) | (s > hi)].sort_values(ascending=False)
    pct = len(outs) / max(len(s), 1) * 100
    story.append(Paragraph(f"6 &nbsp; Outlier Scan — {nc}", ST["h1"]))
    story.append(Paragraph(
        f"IQR bounds [{fmt(lo)}, {fmt(hi)}]  •  {len(outs)} outliers ({pct:.1f}%).", ST["muted"]))
    story.append(Spacer(1, 2 * mm))
    if len(outs):
        cols = ["Row", nc] + ([cat[0]] if cat else [])
        rows = []
        for i in outs.index.tolist()[:10]:
            r = [str(i), f"{float(df.at[i, nc]):,.2f}"]
            if cat:
                r.append(str(df.at[i, cat[0]]))
            rows.append(r)
        story.append(_styled_table(cols, rows))
    else:
        story.append(Paragraph("No significant outliers — averages are safe.", ST["body"]))


def quality_section(story, df, dq):
    story.append(Paragraph("7 &nbsp; Data Quality", ST["h1"]))
    miss = df.isnull().mean().sort_values(ascending=False)
    story.append(Paragraph(
        f"Overall completeness {(1 - miss.mean() if len(miss) else 1) * 100:.1f}%  •  "
        f"{int(df.duplicated().sum()):,} duplicate rows.", ST["muted"]))
    story.append(Spacer(1, 2 * mm))
    story.append(_styled_table(["Column", "Missing %", "Complete %", "Status"],
                               [[str(c), f"{float(v)*100:.1f}",
                                 f"{(1-float(v))*100:.1f}",
                                 "OK" if float(v) < 0.05 else ("Review" if float(v) < 0.2 else "Fix")]
                                for c, v in miss.items()]))


def appendix_section(story, df):
    story.append(Paragraph("Appendix — Sample Records (first 15 rows)", ST["h2"]))
    head = df.head(15)
    cols = [str(c)[:20] for c in head.columns]
    rows = [[("" if pd.isna(v) else str(v)[:22]) for v in row]
            for row in head.itertuples(index=False)]
    story.append(_styled_table(cols, rows))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph(
        "Method notes: numeric stats use pandas describe; trend buckets capped at 40; "
        "outliers via 1.5×IQR; correlations are Pearson r on numeric columns.",
        ST["muted"]))
