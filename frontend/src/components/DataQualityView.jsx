import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CheckCircle, AlertTriangle, FileCode } from 'lucide-react';

const DataQualityView = ({ dataInfo }) => {
  if (!dataInfo) return null;

  const totalRows = dataInfo.total_rows || dataInfo.rows || 0;
  const dq = dataInfo.data_quality || {};

  const normalizedCompleteness = {};
  if (dq.completeness && typeof dq.completeness === 'object') {
    Object.entries(dq.completeness).forEach(([col, stats]) => {
      const score = typeof stats.score === 'number' ? stats.score : undefined;
      const missingCount = typeof stats.missing_count === 'number' ? stats.missing_count : undefined;
      let completePct;
      let missingPct;
      if (typeof score === 'number') {
        completePct = Math.max(0, Math.min(100, score));
        missingPct = 100 - completePct;
      } else if (typeof missingCount === 'number' && totalRows > 0) {
        missingPct = Math.max(0, Math.min(100, (missingCount / totalRows) * 100));
        completePct = 100 - missingPct;
      } else if (typeof stats.missing_percentage === 'number') {
        missingPct = Math.max(0, Math.min(100, stats.missing_percentage));
        completePct = 100 - missingPct;
      } else {
        completePct = 0;
        missingPct = 0;
      }
      normalizedCompleteness[col] = { completePct, missingPct };
    });
  }

  const completenessData = Object.entries(normalizedCompleteness).map(([column, v]) => ({
    column,
    completeness: Number.isFinite(v.completePct) ? Number(v.completePct.toFixed(2)) : 0,
    missing: Number.isFinite(v.missingPct) ? Number(v.missingPct.toFixed(2)) : 0,
  }));

  const dataTypes = dataInfo.data_types || dataInfo.column_types || {};
  const issues = dq.issues || dq.quality_issues || [];

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6 border border-white/10 shadow-xl">
        <h3 className="text-base font-semibold text-slate-200 mb-6 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          Data Quality & Completeness Analysis
        </h3>

        <div className="mb-8">
          <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3">Field Completeness (%)</h4>
          {completenessData.length > 0 ? (
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={completenessData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="column" tick={{ fill: '#94a3b8', fontSize: 11 }} interval={0} angle={-15} dy={10} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar dataKey="completeness" fill="#10b981" radius={[4, 4, 0, 0]} name="Complete %" />
                  <Bar dataKey="missing" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Missing %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No completeness metrics available for this dataset.</p>
          )}
        </div>

        <div className="mb-8">
          <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-indigo-400" />
            Detected Data Types
          </h4>
          {Object.keys(dataTypes).length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(dataTypes).map(([column, type]) => (
                <div key={column} className="flex justify-between items-center bg-slate-900/60 p-3 rounded-xl border border-slate-700/40">
                  <span className="font-mono text-xs text-slate-200 truncate pr-2">{column}</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    {String(type)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No column type information available.</p>
          )}
        </div>

        {Array.isArray(issues) && issues.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-amber-300 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Detected Quality Warnings ({issues.length})
            </h4>
            <ul className="space-y-1 text-xs text-amber-200/90 list-disc list-inside">
              {issues.map((issue, index) => (
                <li key={index}>{String(issue)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataQualityView;
