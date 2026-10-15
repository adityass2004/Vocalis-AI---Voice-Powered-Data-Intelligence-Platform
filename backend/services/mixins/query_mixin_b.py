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
