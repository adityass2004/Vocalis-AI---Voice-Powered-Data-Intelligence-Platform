"""Shared report theme: colors, fonts, header/footer."""
from reportlab.lib.colors import HexColor

NAVY = HexColor("#0F172A")
INDIGO = HexColor("#6366F1")
CYAN = HexColor("#22D3EE")
SLATE = HexColor("#475569")
LIGHT_BG = HexColor("#F1F5F9")
WHITE = HexColor("#FFFFFF")
GREEN = HexColor("#059669")
AMBER = HexColor("#D97706")
ROSE = HexColor("#E11D48")
BORDER = HexColor("#E2E8F0")
DARK_TEXT = HexColor("#1E293B")
MUTED = HexColor("#64748B")

FONTS = {"bold": "Helvetica-Bold", "reg": "Helvetica",
         "oblique": "Helvetica-Oblique", "mono": "Courier"}


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(MUTED)
    canvas.setFont(FONTS["reg"], 7.5)
    canvas.drawString(40, 30, "Vocalis AI  •  Professional Data Report  •  Confidential")
    canvas.drawRightString(doc.pagesize[0] - 40, 30, f"Page {doc.page}")
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(40, 38, doc.pagesize[0] - 40, 38)
    canvas.restoreState()


def cover_header(canvas, doc):
    if doc.page == 1:
        return
    header_footer(canvas, doc)
