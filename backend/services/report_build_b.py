"""Report sections part 1: cover, KPIs, insights, breakdown, trend."""
import pandas as pd
import numpy as np
from reportlab.platypus import Paragraph, Spacer, HRFlowable
from reportlab.lib.units import mm
from .report_build_a import ST, _img, _styled_table, COLORS
from . import report_charts as rc
from . import report_theme as th
from .pro_helpers import fmt


def cover(story, df, info, src_name):
    story.append(Spacer(1, 28 * mm))
    story.append(Paragraph("VOCALIS AI", ParagraphStyle2("brand")))
    story.append(Paragraph("Professional Data Analysis Report",
                           ParagraphStyle2("covertitle")))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph(f"{len(df):,} records &nbsp;•&nbsp; {df.shape[1]} columns"
                           f" &nbsp;•&nbsp; {src_name}",
                           ParagraphStyle2("coversub")))
    story.append(Spacer(1, 6 * mm))
    story.append(HRFlowable(width="100%", thickness=1, color=COLORS["indigo"]))
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph(f"Generated {pd.Timestamp.now().strftime('%d %B %Y, %H:%M')}  •  Confidential",
                           ParagraphStyle2("coversub")))
    story.append(Spacer(1, 10 * mm))


def kpi_band(story, df, num, cat, dt, dq):
    rows, cols = df.shape
    comp = dq.get("completeness_score", 100) or 0
    dupes = dq.get("duplicate_rows", 0) or 0
    cards = [("Rows", f"{rows:,}"), ("Columns", str(cols)),
             ("Numeric", str(len(num))), ("Categories", str(len(cat))),
             ("Complete", f"{comp:.1f}%"), ("Duplicates", f"{dupes:,}")]
    row = []
    for label, val in cards:
        inner = [[Paragraph(val, ST["kpiV"])], [Paragraph(label.upper(), ST["kpiL"])]]
        from reportlab.platypus import Table, TableStyle
        t = Table(inner, colWidths=[26 * mm])
        t.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.6, COLORS["border"]),
                               ("BACKGROUND", (0, 0), (-1, -1), th.WHITE),
                               ("TOPPADDING", (0, 0), (-1, -1), 4),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
        row.append(t)
    from reportlab.platypus import Table as T2
    story.append(T2([row], colWidths=[28 * mm] * 6, hAlign="CENTER"))
    story.append(Spacer(1, 3 * mm))


def insights_section(story, insights):
    story.append(Paragraph("1 &nbsp; Executive Summary", ST["h1"]))
    story.append(Paragraph("Key findings in plain language — what matters most.",
                           ST["muted"]))
    for i, t in enumerate(insights[:6], 1):
        story.append(Paragraph(f"<b>{i}.</b>&nbsp;&nbsp;{t}", ST["body"]))
        story.append(Spacer(1, 1.5 * mm))


def breakdown_section(story, df, num, cat):
    if not (num and cat):
        return
    from .pro_helpers import top_breakdown
    tb = top_breakdown(df, num, cat)
    if not tb.get("rows"):
        return
    story.append(Paragraph(f"2 &nbsp; Top Breakdown — {tb['numeric']} by {tb['category']}", ST["h1"]))
    story.append(Paragraph("Ranked segments with totals and averages.", ST["muted"]))
    story.append(Spacer(1, 2 * mm))
    story.append(_img(rc.bar_chart([r["category"] for r in tb["rows"]],
                                   [r["total"] for r in tb["rows"]],
                                   f"{tb['numeric']} by {tb['category']}")))
    story.append(Spacer(1, 3 * mm))
    story.append(_styled_table(["Category", "Total", "Average", "Count"],
                               [[r["category"], f"{r['total']:,.2f}",
                                 f"{r['average']:,.2f}", f"{r['count']:,}"]
                                for r in tb["rows"]]))


def trend_section(story, df, num, dt):
    if not num:
        return
    nc = num[0]
    s = pd.to_numeric(df[nc], errors="coerce")
    if dt:
        try:
            d = pd.to_datetime(df[dt[0]], errors="coerce")
            m = pd.DataFrame({"d": d, "v": s}).dropna().sort_values("d")
            if len(m) >= 2:
                m["bin"] = pd.cut(m["d"].astype("int64"),
                                  bins=min(40, len(m)))
                g = m.groupby("bin", observed=True)["v"].mean()
                labels, vals = [], []
                for idx, v in g.items():
                    try:
                        labels.append(str(idx.mid.date()))
                    except Exception:
                        labels.append(str(len(labels)))
                    vals.append(float(v))
                chg = ((vals[-1]-vals[0])/abs(vals[0])*100) if vals[0] else 0
                story.append(Paragraph(f"3 &nbsp; Trend — {nc} over {dt[0]}", ST["h1"]))
                story.append(Paragraph(f"Overall move {chg:+.1f}% from start to end.", ST["muted"]))
                story.append(Spacer(1, 2 * mm))
                story.append(_img(rc.line_chart(labels, vals, f"{nc} trend")))
                story.append(Spacer(1, 3 * mm))
                return
        except Exception:
            pass
    v = s.dropna().reset_index(drop=True)
    if len(v):
        step = max(1, len(v) // 40)
        story.append(Paragraph(f"3 &nbsp; Trend — {nc} (row order)", ST["h1"]))
        story.append(Spacer(1, 2 * mm))
        story.append(_img(rc.line_chart([str(i*step) for i in range(len(v[::step]))],
                                        [float(x) for x in v[::step]], nc)))


from reportlab.lib.styles import ParagraphStyle


def ParagraphStyle2(kind):
    if kind == "brand":
        return ParagraphStyle("brand", parent=ST["muted"], fontName=th.FONTS["bold"],
                              fontSize=10, textColor=COLORS["indigo"],
                              spaceAfter=4, alignment=1)
    if kind == "covertitle":
        return ParagraphStyle("covertitle", fontName=th.FONTS["bold"], fontSize=26,
                              textColor=COLORS["navy"], leading=30, alignment=1)
    return ParagraphStyle("coversub", parent=ST["muted"], fontSize=9, alignment=1)
