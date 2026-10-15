"""Robust NL-query mixin: typo-tolerant, column-aware, chart-safe."""
import os
from datetime import datetime
from typing import Dict, Any


class RobustQueryMixin:
    def _ensure_static_dir(self):
        try:
            base = self.static_dir
            if not os.path.isabs(base):
                here = os.path.dirname(os.path.abspath(__file__))
                cand = os.path.normpath(os.path.join(here, "..", "static"))
                self.static_dir = cand
            os.makedirs(self.static_dir, exist_ok=True)
        except Exception:
            pass

    def process_query_robust(self, query: str) -> Dict[str, Any]:
        from services.nl_query import normalize_query, detect_intent, fuzzy_column
        try:
            if self.current_data is None:
                return {"error": "No dataset loaded"}
            self.analysis_history.append({"query": query,
                "timestamp": datetime.now().isoformat(), "type": "user_query"})
            qn = normalize_query(query)
            intent = detect_intent(qn)
            cols = list(self.current_data.columns)
            num_cols = self.current_data.select_dtypes(include="number").columns.tolist()
            target = fuzzy_column(qn, cols)
            if intent in ("averages", "median", "sum", "minmax", "distribution", "trend"):
                fnum = fuzzy_column(qn, num_cols) if num_cols else None
                if fnum:
                    target = fnum
                elif target not in (num_cols or [target]):
                    target = num_cols[0] if num_cols else target
            self._ensure_static_dir()
            if intent == "averages":
                res = self._q_average(target, num_cols)
            elif intent == "median":
                res = self._q_median(target, num_cols)
            elif intent == "sum":
                res = self._q_sum(target, num_cols)
            elif intent == "minmax":
                res = self._q_minmax(qn, target, num_cols)
            elif intent == "count":
                res = self._q_count(target)
            elif intent == "correlation":
                res = self._analyze_correlation(query)
            elif intent == "trend":
                res = self._analyze_trends(query)
            elif intent == "distribution":
                res = self._q_distribution(target, num_cols)
            elif intent == "compare":
                res = self._compare_data(query)
            elif intent == "summary":
                res = self._generate_summary()
            else:
                res = self._q_describe_column(target) if target else self._generate_summary()
            if res and "error" not in res:
                try:
                    res["query_context"] = self._analyze_query_intent(query)
                    res["ai_insights"] = self._generate_ai_insights(res)
                    res["related_analyses"] = self._suggest_related_analyses(query, res)
                except Exception:
                    pass
                self.analysis_history.append({"query": query, "result": "ok",
                    "timestamp": datetime.now().isoformat(), "type": "completed_analysis"})
            return res
        except Exception as e:
            return {"error": f"Query failed: {e}"}

    def _q_series(self, target, num_cols):
        import pandas as pd
        if target and target in self.current_data.columns:
            s = self.current_data[target]
            try:
                return target, pd.to_numeric(s, errors="coerce").dropna()
            except Exception:
                return target, s.dropna()
        c = num_cols[0] if num_cols else self.current_data.columns[0]
        import pandas as pd
        return c, pd.to_numeric(self.current_data[c], errors="coerce").dropna()

    def _q_average(self, target, num_cols):
        col, s = self._q_series(target, num_cols)
        if len(s) == 0:
            return {"error": f"No numeric values in '{col}'"}
        avg = float(s.mean())
        try:
            ch = self._create_bar_chart([col], [avg], f"Average {col}", "Column", "Average")
        except Exception:
            ch = None
        return {"analysis_type": "averages", "column": col, "average": avg,
            "median": float(s.median()), "count": int(len(s)),
            "results": {col: avg}, "chart_path": ch,
            "insights": f"Average {col} is {avg:,.2f} (median {float(s.median()):,.2f}, n={len(s)})."}

    def _q_median(self, target, num_cols):
        col, s = self._q_series(target, num_cols)
        med = float(s.median())
        return {"analysis_type": "median", "column": col, "median": med,
            "average": float(s.mean()), "count": int(len(s)),
            "results": {col: med}, "chart_path": None,
            "insights": f"Median {col} is {med:,.2f}."}

    def _q_sum(self, target, num_cols):
        col, s = self._q_series(target, num_cols)
        tot = float(s.sum())
        return {"analysis_type": "sum", "column": col, "total": tot,
            "results": {col: tot}, "chart_path": None,
            "insights": f"Total {col} is {tot:,.2f} across {len(s)} records."}
    def _q_minmax(self, qn, target, num_cols):
        col, s = self._q_series(target, num_cols)
        lo, hi = float(s.min()), float(s.max())
        want = "both"
        if any(w in qn for w in ["highest", "largest", "maximum", "max", "top"]):
            want = "max"
        elif any(w in qn for w in ["lowest", "smallest", "minimum", "min", "bottom"]):
            want = "min"
        if want == "max":
            msg = f"Highest {col} is {hi:,.2f}."
        elif want == "min":
            msg = f"Lowest {col} is {lo:,.2f}."
        else:
            msg = f"{col} ranges {lo:,.2f} to {hi:,.2f}."
        return {"analysis_type": "minmax", "column": col, "min": lo, "max": hi,
            "results": {"min": lo, "max": hi}, "chart_path": None, "insights": msg}

    def _q_count(self, target):
        if target and target in self.current_data.columns:
            vc = self.current_data[target].astype(str).value_counts().head(10)
            rows = [{"value": str(k), "count": int(v)} for k, v in vc.items()]
            top_txt = f" Top is '{rows[0]['value']}' ({rows[0]['count']} records)." if rows else ""
            return {"analysis_type": "count", "column": target, "results": rows,
                "chart_path": None,
                "insights": f"{target} has {self.current_data[target].nunique()} unique values.{top_txt}"}
        n = len(self.current_data)
        return {"analysis_type": "count", "results": {"rows": n}, "chart_path": None,
            "insights": f"Dataset has {n:,} rows."}

    def _q_distribution(self, target, num_cols):
        col, s = self._q_series(target, num_cols)
        try:
            ch = self._create_histogram(s, col)
        except Exception:
            ch = None
        return {"analysis_type": "distribution", "column": col,
            "statistics": {"mean": float(s.mean()), "median": float(s.median()),
                "std": float(s.std()), "min": float(s.min()), "max": float(s.max())},
            "chart_path": ch,
            "insights": f"Distribution of {col}: mean {float(s.mean()):,.2f}, std {float(s.std()):,.2f}."}

    def _q_describe_column(self, target):
        import pandas as pd
        s = self.current_data[target]
        try:
            sn = pd.to_numeric(s, errors="coerce")
            if sn.notna().sum() > 0:
                return {"analysis_type": "column", "column": target,
                    "results": {"average": float(sn.mean()), "median": float(sn.median()),
                        "min": float(sn.min()), "max": float(sn.max()),
                        "count": int(sn.notna().sum())},
                    "chart_path": None,
                    "insights": f"{target}: average {float(sn.mean()):,.2f}, spans {float(sn.min()):,.2f} to {float(sn.max()):,.2f}."}
        except Exception:
            pass
        vc = s.astype(str).value_counts().head(5)
        top = f" Top value '{vc.index[0]}' ({int(vc.iloc[0])} records)." if len(vc) else ""
        return {"analysis_type": "column", "column": target,
            "results": {"unique": int(s.nunique()),
                        "top": str(vc.index[0]) if len(vc) else None},
            "chart_path": None,
            "insights": f"{target} has {int(s.nunique())} unique values." + top}
