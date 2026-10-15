"""Professional PDF report: cover, KPIs, insights, charts, tables."""
import io
from datetime import datetime
import pandas as pd
import numpy as np

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, Image, PageBreak, HRFlowable)

from . import report_charts as rc
from . import report_theme as th
from .pro_helpers import (dataset_cols, correlation_highlights, top_breakdown,
                          quality_flags, headline_insights, fmt)

W, H = A4
COLORS = {"navy": th.NAVY, "indigo": th.INDIGO, "muted": th.MUTED,
          "dark": th.DARK_TEXT, "green": th.GREEN, "amber": th.AMBER,
          "rose": th.ROSE, "border": th.BORDER}

ST = {
    "h1": ParagraphStyle("h1", fontName=th.FONTS["bold"], fontSize=15,
                         textColor=th.NAVY, spaceAfter=4),
    "h2": ParagraphStyle("h2", fontName=th.FONTS["bold"], fontSize=11,
                         textColor=th.NAVY, spaceBefore=14, spaceAfter=6),
    "body": ParagraphStyle("body", fontName=th.FONTS["reg"], fontSize=9,
                           textColor=th.DARK_TEXT, leading=13),
    "muted": ParagraphStyle("muted", fontName=th.FONTS["reg"], fontSize=8,
                            textColor=th.MUTED, leading=11),
    "cell": ParagraphStyle("cell", fontName=th.FONTS["reg"], fontSize=8,
                           textColor=th.DARK_TEXT, leading=10),
    "cellH": ParagraphStyle("cellH", fontName=th.FONTS["bold"], fontSize=8,
                            textColor=th.WHITE, leading=10),
    "kpiV": ParagraphStyle("kpiV", fontName=th.FONTS["bold"], fontSize=14,
                           textColor=th.NAVY, alignment=TA_CENTER),
    "kpiL": ParagraphStyle("kpiL", fontName=th.FONTS["bold"], fontSize=7.5,
                           textColor=th.MUTED, alignment=TA_CENTER),
}


def _img(png: bytes, width=160 * mm):
    b = io.BytesIO(png)
    im = Image(b)
    im._restrictSize(width, 90 * mm)
    im.hAlign = "CENTER"
    return im


def _styled_table(header, rows, widths=None):
    data = [[Paragraph(f"<b>{h}</b>", ST["cellH"]) for h in header]]
    for r in rows:
        data.append([Paragraph(str(c), ST["cell"]) for c in r])
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), th.NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), th.WHITE),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [th.WHITE, HexColor("#F8FAFC")]),
        ("GRID", (0, 0), (-1, -1), 0.4, th.BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


from reportlab.lib.colors import HexColor
