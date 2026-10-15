import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Loader2, Gauge, FileDown, Sparkles, RefreshCw } from 'lucide-react';
import { API, KpiCards, InsightList, HealthFlags, SectionTitle } from './pro_parts';
import { ProChart, ProTable } from './pro_charts';

const ProAnalysis = ({ datasetInfo, proSummaryProp, proPresetsProp }) => {
  const [summary, setSummary] = useState(proSummaryProp || datasetInfo?.pro_summary || null);
  const [presets, setPresets] = useState(
    proPresetsProp || datasetInfo?.pro_presets?.presets || datasetInfo?.pro_presets || []);
  const [active, setActive] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingSummary, setFetchingSummary] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Synchronize summary when prop or dataset changes
  useEffect(() => {
    if (proSummaryProp) {
      setSummary(proSummaryProp);
    } else if (datasetInfo?.pro_summary?.success) {
      setSummary(datasetInfo.pro_summary);
    } else if (datasetInfo) {
      fetchSummary();
    }
  }, [proSummaryProp, datasetInfo]);

  // Synchronize presets when prop or dataset changes
  useEffect(() => {
    const p = proPresetsProp || datasetInfo?.pro_presets?.presets || datasetInfo?.pro_presets;
    if (Array.isArray(p) && p.length) {
      setPresets(p);
    } else if (datasetInfo) {
      fetchPresets();
    }
  }, [proPresetsProp, datasetInfo]);

  const fetchSummary = async () => {
    setFetchingSummary(true);
    try {
      const r = await fetch(`${API}/api/data/pro-summary`);
      if (r.ok) {
        const d = await r.json();
        if (d?.success) setSummary(d);
      }
    } catch (e) {
      console.warn('pro-summary fetch warning:', e);
    } finally {
      setFetchingSummary(false);
    }
  };

  const fetchPresets = async () => {
    try {
      const r = await fetch(`${API}/api/data/pro-presets`);
      if (r.ok) {
        const d = await r.json();
        if (d?.success && Array.isArray(d?.presets)) setPresets(d.presets);
      }
    } catch (e) {
      console.warn('pro-presets fetch warning:', e);
    }
  };

  const runPreset = async (id) => {
    setActive(id); setLoading(true); setResult(null);
    try {
      const r = await fetch(`${API}/api/data/pro-preset/${id}`);
      const d = await r.json();
      if (d?.success) setResult(d);
      else setResult({ title: 'Failed', description: d?.error || 'Preset failed',
        kpis: [], chart: null, table: null, insights: [] });
    } catch (e) {
      setResult({ title: 'Failed', description: String(e),
        kpis: [], chart: null, table: null, insights: [] });
    } finally { setLoading(false); }
  };

  // If NO dataset exists at all:
  if (!datasetInfo && !summary && !presets?.length && !result) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-slate-400">
        <Sparkles className="w-10 h-10 text-cyan-400 mx-auto mb-3 opacity-60" />
        Upload a dataset to see professional analysis.
      </div>
    );
  }

  // If dataset exists, but summary is still computing / fetching
  if (datasetInfo && !summary && !presets?.length && !result) {
    const rows = datasetInfo.total_rows || datasetInfo.shape?.[0] || datasetInfo.data?.length || 0;
    const cols = datasetInfo.columns?.length || datasetInfo.shape?.[1] || 0;
    return (
      <div className="glass-card rounded-2xl p-8 text-center space-y-4">
        {fetchingSummary ? (
          <div className="space-y-3">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto" />
            <p className="text-white font-medium">Computing KPI metrics and professional insights...</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <Gauge className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white font-outfit">Dataset Loaded ({rows} rows, {cols} columns)</h4>
              <p className="text-xs text-slate-400 mt-1">Ready to generate statistical KPIs, correlations, and automated executive report.</p>
            </div>
            <button
              onClick={() => { fetchSummary(); fetchPresets(); }}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-lg inline-flex items-center gap-2 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Generate Professional Analysis</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  const visible = (presets || []).filter(p => p.available !== false);

  const downloadReport = async () => {
    setDownloading(true);
    try {
      const r = await fetch(`${API}/api/data/report.pdf`);
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        let errMsg = d?.error;
        if (!errMsg) {
          if (r.status === 404) errMsg = 'Report endpoint not found (404). The backend server needs to be restarted.';
          else if (r.status === 400) errMsg = 'No dataset loaded. Please upload a dataset first.';
          else errMsg = `Report generation failed (${r.status})`;
        }
        throw new Error(errMsg);
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const disp = r.headers.get('Content-Disposition') || '';
      const m = disp.match(/filename="?([^"]+)"?/);
      a.href = url;
      a.download = m ? m[1] : 'Vocalis_Report.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message || 'Report download failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar: Presets + PDF Download */}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 border border-white/10">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Gauge className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-white">Automated Presets:</span>
          <span className="text-slate-400 hidden sm:inline">One-click deep dives into this dataset</span>
        </div>
        <button
          onClick={downloadReport}
          disabled={downloading}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
        >
          {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
          <span>{downloading ? 'Compiling PDF...' : 'Download Executive PDF'}</span>
        </button>
      </div>

      {/* Preset Buttons Grid */}
      {visible.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {visible.map((p) => {
            const isSelected = active === p.id;
            return (
              <motion.button
                key={p.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => runPreset(p.id)}
                disabled={loading}
                className={`p-3 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                  isSelected
                    ? 'bg-gradient-to-br from-indigo-600/40 to-cyan-600/40 border-cyan-400 text-white shadow-lg shadow-indigo-500/20'
                    : 'glass-card border-white/10 hover:border-slate-600 text-slate-300 hover:text-white'
                }`}
              >
                <div>
                  <div className="font-semibold truncate">{p.title}</div>
                  <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">{p.description}</div>
                </div>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-cyan-400">
                  <Play className="w-2.5 h-2.5" />
                  <span>Run</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Preset Result View if active */}
      {loading && (
        <div className="glass-card rounded-2xl p-10 text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400">Running preset analysis...</p>
        </div>
      )}

      {result && !loading && (
        <div className="glass-card rounded-2xl p-6 border border-cyan-500/30 space-y-5 bg-gradient-to-b from-cyan-950/20 to-slate-900/60">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-bold text-white font-outfit">{result.title}</h4>
              <p className="text-xs text-slate-300 mt-0.5">{result.description}</p>
            </div>
            <button
              onClick={() => { setActive(null); setResult(null); }}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-800"
            >
              Close
            </button>
          </div>
          {result.kpis && <KpiCards kpis={result.kpis} />}
          {result.chart && <ProChart chart={result.chart} />}
          {result.table && <ProTable table={result.table} />}
          {result.insights && <InsightList insights={result.insights} />}
        </div>
      )}

      {/* Default Summary View */}
      {summary && (
        <div className="space-y-6">
          {summary.kpis && <KpiCards kpis={summary.kpis} />}
          {summary.insights && <InsightList insights={summary.insights} />}
          {summary.quality_flags && <HealthFlags flags={summary.quality_flags} />}
        </div>
      )}
    </div>
  );
};

export default ProAnalysis;
