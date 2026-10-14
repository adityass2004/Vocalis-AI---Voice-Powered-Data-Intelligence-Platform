import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Loader2, Gauge, FileDown } from 'lucide-react';
import { API, KpiCards, InsightList, HealthFlags, SectionTitle } from './pro_parts';
import { ProChart, ProTable } from './pro_charts';

const ProAnalysis = ({ datasetInfo, proSummaryProp, proPresetsProp }) => {
  const [summary, setSummary] = useState(proSummaryProp || datasetInfo?.pro_summary || null);
  const [presets, setPresets] = useState(
    proPresetsProp || datasetInfo?.pro_presets?.presets || datasetInfo?.pro_presets || []);
  const [active, setActive] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (proSummaryProp) setSummary(proSummaryProp);
    else if (datasetInfo?.pro_summary?.success) setSummary(datasetInfo.pro_summary);
  }, [proSummaryProp, datasetInfo]);

  useEffect(() => {
    const p = proPresetsProp || datasetInfo?.pro_presets?.presets || datasetInfo?.pro_presets;
    if (Array.isArray(p) && p.length) setPresets(p);
  }, [proPresetsProp, datasetInfo]);

  useEffect(() => {
    if (!summary) {
      fetch(`${API}/api/data/pro-summary`).then(r => r.json()).then(d => {
        if (d?.success) setSummary(d);
      }).catch(() => {});
    }
    if (!presets?.length) {
      fetch(`${API}/api/data/pro-presets`).then(r => r.json()).then(d => {
        if (d?.success) setPresets(d.presets);
      }).catch(() => {});
    }
  }, []);

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

  if (!summary && !presets?.length && !result) {
    return <div className="glass-card rounded-2xl p-8 text-center text-slate-400">
      Upload a dataset to see professional analysis.</div>;
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
      alert(`Report download failed: ${e.message}`);
    } finally { setDownloading(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle icon={<Gauge className="w-4 h-4 text-indigo-400" />}>At a Glance</SectionTitle>
        <KpiCards kpis={summary?.kpis} />
      </div>

      <div className="glass-card rounded-2xl p-5 border border-white/10">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-semibold text-slate-200">One-Click Analysis</h4>
          <button onClick={downloadReport} disabled={downloading}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            {downloading ? 'Building PDF…' : 'Download PDF Report'}
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-3">Curated for this dataset — only relevant ones shown.</p>
        <div className="flex flex-wrap gap-2">
          {visible.map(p => (
            <button key={p.id} onClick={() => runPreset(p.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                active === p.id
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-indigo-500/50 hover:text-white'}`}>
              {loading && active === p.id
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Play className="w-3.5 h-3.5" />}
              {p.title}
            </button>
          ))}
        </div>
      </div>

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="glass-card rounded-2xl p-5 border border-indigo-500/20 bg-indigo-500/5">
            <h3 className="text-base font-bold text-white font-outfit">{result.title}</h3>
            {result.description && <p className="text-xs text-slate-400 mt-1">{result.description}</p>}
          </div>
          <KpiCards kpis={result.kpis} />
          <ProChart chart={result.chart} />
          <ProTable table={result.table} />
          <InsightList insights={result.insights} />
        </motion.div>
      )}

      {!result && (
        <>
          <InsightList insights={summary?.insights} />
          {summary?.top_breakdown?.chart?.length > 0 && (
            <ProChart chart={{ type: 'bar', data: summary.top_breakdown.chart,
              x_key: 'name', series: [{ key: 'value', name: summary.top_breakdown.numeric }],
              title: `Top ${summary.top_breakdown.category} by ${summary.top_breakdown.numeric}` }} />
          )}
          <HealthFlags flags={summary?.quality_flags} />
        </>
      )}
    </div>
  );
};

export default ProAnalysis;
