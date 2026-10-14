"""Matplotlib charts rendered to PNG bytes for PDF embedding."""
import io
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

plt.rcParams.update({"font.size": 8, "axes.titlesize": 9,
                     "axes.labelsize": 8, "xtick.labelsize": 7,
                     "ytick.labelsize": 7})


def _png(fig) -> bytes:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight",
                facecolor="white")
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def bar_chart(labels, values, title="", color="#6366F1") -> bytes:
    fig, ax = plt.subplots(figsize=(6.5, 2.8))
    labels = [str(x)[:18] for x in labels]
    ax.bar(labels, values, color=color, edgecolor="white")
    ax.set_title(title, fontweight="bold", loc="left")
    ax.tick_params(axis="x", rotation=20)
    ax.spines[["top", "right"]].set_visible(False)
    for i, v in enumerate(values):
        ax.text(i, v, f"{v:,.0f}" if abs(v) >= 100 else f"{v:.1f}",
                ha="center", va="bottom", fontsize=7)
    return _png(fig)


def line_chart(x, y, title="", color="#6366F1") -> bytes:
    fig, ax = plt.subplots(figsize=(6.5, 2.8))
    ax.plot(x, y, color=color, linewidth=2)
    ax.fill_between(range(len(y)), y, alpha=0.12, color=color)
    ax.set_title(title, fontweight="bold", loc="left")
    step = max(1, len(x) // 8)
    ax.set_xticks(range(0, len(x), step))
    ax.set_xticklabels([str(x[i])[:12] for i in range(0, len(x), step)], rotation=20)
    ax.spines[["top", "right"]].set_visible(False)
    return _png(fig)


def hist_chart(series: pd.Series, title="") -> bytes:
    fig, ax = plt.subplots(figsize=(6.5, 2.8))
    vals = pd.to_numeric(series, errors="coerce").dropna()
    ax.hist(vals, bins=min(20, max(5, len(vals) // 15 or 5)),
            color="#6366F1", edgecolor="white", alpha=0.9)
    try:
        ax.axvline(vals.mean(), color="#E11D48", linestyle="--",
                   linewidth=1.5, label=f"Mean {vals.mean():.1f}")
        ax.axvline(vals.median(), color="#059669", linestyle=":",
                   linewidth=1.5, label=f"Median {vals.median():.1f}")
        ax.legend(fontsize=7)
    except Exception:
        pass
    ax.set_title(title, fontweight="bold", loc="left")
    ax.spines[["top", "right"]].set_visible(False)
    return _png(fig)


def corr_heatmap(corr: pd.DataFrame) -> bytes:
    n = len(corr.columns)
    fig, ax = plt.subplots(figsize=(max(4, n * 1.1), max(3, n * 0.9)))
    im = ax.imshow(corr.values, cmap="RdYlGn", vmin=-1, vmax=1)
    ax.set_xticks(range(n))
    ax.set_yticks(range(n))
    ax.set_xticklabels([str(c)[:14] for c in corr.columns], rotation=30, ha="right")
    ax.set_yticklabels([str(c)[:14] for c in corr.columns])
    for i in range(n):
        for j in range(n):
            v = corr.values[i, j]
            ax.text(j, i, f"{v:.2f}", ha="center", va="center",
                    fontsize=7, color="white" if abs(v) > 0.5 else "black",
                    fontweight="bold")
    ax.set_title("Correlation Matrix (Pearson r)", fontweight="bold", loc="left")
    fig.colorbar(im, ax=ax, shrink=0.8)
    return _png(fig)
