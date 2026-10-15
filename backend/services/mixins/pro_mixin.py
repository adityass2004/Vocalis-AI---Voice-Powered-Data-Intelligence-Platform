"""Pro analytics mixin for DataService: focused KPIs + presets."""
import pandas as pd
from typing import Dict, Any


class ProAnalyticsMixin:
    def get_pro_summary(self) -> Dict[str, Any]:
        from services.pro_helpers import (
            dataset_cols, correlation_highlights, top_breakdown,
            quality_flags, headline_insights, kpi)
        if self.current_data is None:
            return {"success": False, "error": "No dataset loaded"}
        df = self.current_data
        num, cat, dt = dataset_cols(df, self.data_info or {})
        dq = (self.data_info or {}).get('data_quality', {}) or {}
        total_rows, total_cols = df.shape
        completeness = dq.get('completeness_score', 100) or 0
        dupes = dq.get('duplicate_rows', 0) or 0
        kpis = [
            kpi("Rows", f"{total_rows:,}", f"{total_cols} columns"),
            kpi("Numeric fields", str(len(num)), ", ".join(num[:3]) if num else "none"),
            kpi("Categories", str(len(cat)), ", ".join(cat[:3]) if cat else "none"),
            kpi("Completeness", f"{completeness:.1f}%", "filled cells",
                "good" if completeness >= 95 else ("warn" if completeness >= 80 else "bad")),
        ]
        if dupes:
            kpis.append(kpi("Duplicates", f"{dupes:,}", "review", "warn"))
        if dt:
            try:
                s = pd.to_datetime(df[dt[0]], errors='coerce').dropna()
                if len(s):
                    kpis.append(kpi("Date range", f"{s.min().date()} -> {s.max().date()}", dt[0]))
            except Exception:
                pass
        return self._json_safe({
            "success": True,
            "kpis": kpis,
            "insights": headline_insights(df, num, cat, dt),
            "correlation_highlights": correlation_highlights(df, num),
            "top_breakdown": top_breakdown(df, num, cat),
            "quality_flags": quality_flags(df, dq),
            "columns": {"numeric": num, "categorical": cat, "datetime": dt},
        })

    def list_pro_presets(self) -> Dict[str, Any]:
        from services.pro_helpers import dataset_cols
        if self.current_data is None:
            return {"success": False, "error": "No dataset loaded"}
        num, cat, dt = dataset_cols(self.current_data, self.data_info or {})
        presets = [
            {"id": "overview", "title": "Executive Overview",
             "description": "KPIs, headlines and top breakdown in one view."},
            {"id": "top_breakdown", "title": "Top Breakdown",
             "description": f"{cat[0]} x {num[0]}" if (cat and num) else "Best category x metric"},
            {"id": "trend", "title": "Trend Over Time",
             "description": dt[0] if dt else (f"Index trend of {num[0]}" if num else "Needs numbers")},
            {"id": "distribution", "title": "Distribution",
             "description": f"Spread of {num[0]}" if num else "Needs numbers"},
            {"id": "correlation", "title": "Correlations",
             "description": "Strongest relationships"},
            {"id": "outliers", "title": "Outlier Scan",
             "description": f"IQR scan of {num[0]}" if num else "Needs numbers"},
            {"id": "quality", "title": "Data Quality",
             "description": "Completeness and fixes"},
        ]
        out = []
        for p in presets:
            ok = True
            if p["id"] == "top_breakdown" and not (num and cat):
                ok = False
            if p["id"] in ("trend", "distribution", "outliers") and not num:
                ok = False
            if p["id"] == "correlation" and len(num) < 2:
                ok = False
            out.append({**p, "available": ok})
        return self._json_safe({"success": True, "presets": out})

    def run_pro_preset(self, preset_id: str) -> Dict[str, Any]:
        from services.pro_helpers import dataset_cols
        from services import pro_presets_a as pa
        from services import pro_presets_b as pb
        if self.current_data is None:
            return {"success": False, "error": "No dataset loaded"}
        df = self.current_data
        num, cat, dt = dataset_cols(df, self.data_info or {})
        dq = (self.data_info or {}).get('data_quality', {}) or {}
        try:
            if preset_id == "overview":
                out = pa.p_overview(df, num, cat, dt, self.get_pro_summary())
            elif preset_id == "top_breakdown":
                out = pa.p_breakdown(df, num, cat, dt)
            elif preset_id == "trend":
                out = pa.p_trend(df, num, cat, dt)
            elif preset_id == "distribution":
                out = pb.p_distribution(df, num, cat, dt)
            elif preset_id == "correlation":
                out = pb.p_correlation(df, num, cat, dt)
            elif preset_id == "outliers":
                out = pb.p_outliers(df, num, cat, dt)
            elif preset_id == "quality":
                out = pb.p_quality(df, num, cat, dt, dq)
            else:
                return {"success": False, "error": f"Unknown preset '{preset_id}'"}
            out.update({"success": True, "preset_id": preset_id})
            return self._json_safe(out)
        except Exception as e:
            return {"success": False, "error": f"Preset failed: {e}"}
