"""Robust NL-query engine: typo-tolerant, column-aware, chart-safe."""
import re
import difflib
from typing import Dict, Any, List, Optional


TYPO_MAP = {
    "averga": "average", "averge": "average", "avrage": "average",
    "averag": "average", "avgrage": "average",
    "salaray": "salary", "salry": "salary", "salery": "salary",
    "salaries": "salary",
    "medain": "median", "meadian": "median",
    "corelation": "correlation", "correlaton": "correlation",
    "distribtion": "distribution", "distributon": "distribution",
    "histogrm": "histogram", "histogramm": "histogram",
    "tredn": "trend", "trned": "trend",
    "maximun": "maximum", "minimun": "minimum",
    "higest": "highest", "heighest": "highest", "lowset": "lowest",
    "whats": "what", "whats'": "what", "the ": " ",
}

INTENT_WORDS = {
    "averages": ["average", "mean", "avg", "averga", "averge"],
    "median": ["median", "medain", "middle value"],
    "sum": ["sum", "total", "totals"],
    "minmax": ["min", "max", "minimum", "maximum", "lowest", "highest",
               "smallest", "largest", "top", "bottom", "range"],
    "correlation": ["correlation", "correlat", "relationship", "related"],
    "trend": ["trend", "trends", "time", "over time", "evolution", "change"],
    "distribution": ["distribution", "histogram", "spread", "distribute"],
    "summary": ["summary", "describe", "overview", "summarize", "profile"],
    "compare": ["compare", "comparison", "vs", "versus"],
    "count": ["count", "how many", "number of"],
}


def normalize_query(q: str) -> str:
    t = f" {q.lower()} "
    for k, v in TYPO_MAP.items():
        t = t.replace(k, v)
    t = re.sub(r"[^a-z0-9_ %?.-]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def detect_intent(qn: str) -> str:
    for intent, words in INTENT_WORDS.items():
        if any(w in qn for w in words):
            return intent
    return "general"


def fuzzy_column(query: str, columns: List[str]) -> Optional[str]:
    q = query.lower()
    # 1. exact substring
    for c in columns:
        if c.lower() in q:
            return c
    # 2. token overlap (handles Salary vs salary, Experience_Years vs experience)
    qtokens = set(re.findall(r"[a-z]+", q))
    best, best_score = None, 0
    for c in columns:
        ctokens = set(re.findall(r"[a-z]+", c.lower()))
        overlap = len(qtokens & ctokens)
        if overlap > best_score:
            best, best_score = c, overlap
    if best_score > 0:
        # singular/plural tolerance: salary vs salaries
        return best
    # 3. difflib on full words
    words = re.findall(r"[a-z]+", q)
    names = [c.lower().replace("_", " ") for c in columns]
    for w in words:
        m = difflib.get_close_matches(w, names, n=1, cutoff=0.75)
        if m:
            return columns[names.index(m[0])]
    return None
