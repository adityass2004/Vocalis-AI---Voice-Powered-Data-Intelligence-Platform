"""Assemble the full PDF report and return bytes."""
import io
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, PageBreak
from . import report_theme as th
from .pro_helpers import dataset_cols, headline_insights
from .report_build_b import cover, kpi_band, insights_section, breakdown_section, trend_section
from .report_build_c import (distribution_section, correlation_section,
                             outliers_section, quality_section, appendix_section)


def build_pdf(data_service, src_name="dataset") -> bytes:
    df = data_service.current_data
    if df is None or df.empty:
        raise ValueError("No dataset loaded")
    info = getattr(data_service, "data_info", {}) or {}
    dq = info.get("data_quality", {}) or {}
    num, cat, dt = dataset_cols(df, info)
    insights = headline_insights(df, num, cat, dt)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=18, rightMargin=18,
                            topMargin=22, bottomMargin=28,
                            title="Vocalis AI — Data Report",
                            author="Vocalis AI")
    story = []
    cover(story, df, info, src_name)
    story.append(PageBreak())
    kpi_band(story, df, num, cat, dt, dq)
    insights_section(story, insights)
    breakdown_section(story, df, num, cat)
    trend_section(story, df, num, dt)
    distribution_section(story, df, num)
    correlation_section(story, df, num)
    outliers_section(story, df, num, cat)
    quality_section(story, df, dq)
    appendix_section(story, df)
    doc.build(story, onFirstPage=th.header_footer, onLaterPages=th.cover_header)
    buf.seek(0)
    return buf.read()
