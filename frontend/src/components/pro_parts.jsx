import React from 'react';
import { motion } from 'framer-motion';
import { Gauge, Sparkles, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

export const toneStyle = (tone) => {
  if (tone === 'good') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (tone === 'warn') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  if (tone === 'bad') return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
  return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-200';
};

export const KpiCards = ({ kpis }) => {
  if (!kpis?.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {kpis.map((k, i) => (
        <motion.div key={i} whileHover={{ scale: 1.02 }}
          className={`rounded-xl p-4 border ${toneStyle(k.tone)}`}>
          <p className="text-[11px] uppercase tracking-wider font-semibold opacity-70">{k.label}</p>
          <p className="text-xl font-bold font-outfit mt-1">{k.value}</p>
          {k.hint && <p className="text-[11px] mt-1 opacity-70 truncate" title={k.hint}>{k.hint}</p>}
        </motion.div>
      ))}
    </div>
  );
};

export const InsightList = ({ insights }) => {
  if (!insights?.length) return null;
  return (
    <div className="glass-card rounded-2xl p-5 border border-white/10">
      <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-cyan-400" /> Key Insights
      </h4>
      <ul className="space-y-2">
        {insights.map((t, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-300 leading-relaxed">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const HealthFlags = ({ flags }) => {
  if (!flags?.length) return null;
  return (
    <div className="glass-card rounded-2xl p-5 border border-white/10">
      <h4 className="text-sm font-semibold text-slate-200 mb-3">Data Health</h4>
      <div className="flex flex-wrap gap-2">
        {flags.map((f, i) => (
          <span key={i} className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${
            f.level === 'good' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
            : f.level === 'warn' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
            : 'bg-rose-500/10 text-rose-300 border-rose-500/20'}`}>
            {f.level === 'good' ? <CheckCircle2 className="w-3.5 h-3.5" />
              : f.level === 'warn' ? <AlertTriangle className="w-3.5 h-3.5" />
              : <Info className="w-3.5 h-3.5" />}
            {f.text}
          </span>
        ))}
      </div>
    </div>
  );
};

export const SectionTitle = ({ icon, children }) => (
  <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
    {icon}{children}
  </h3>
);
export { Gauge };
