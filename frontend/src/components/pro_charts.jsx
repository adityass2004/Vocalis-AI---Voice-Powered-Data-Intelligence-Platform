import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line } from 'recharts';
import { BarChart3, Table as TableIcon } from 'lucide-react';

export const ProChart = ({ chart }) => {
  if (!chart?.data?.length) return null;
  const key = chart.series?.[0]?.key || 'value';
  const tip = { backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 12, color: '#f8fafc' };
  return (
    <div className="glass-card rounded-2xl p-5 border border-white/10">
      <h4 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-indigo-400" /> {chart.title || 'Chart'}
      </h4>
      <ResponsiveContainer width="100%" height={280}>
        {chart.type === 'line' ? (
          <LineChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis dataKey={chart.x_key} tick={{ fill: '#94a3b8', fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip contentStyle={tip} />
            <Line type="monotone" dataKey={key} stroke="#6366f1" strokeWidth={2.5} dot={false} />
          </LineChart>
        ) : (
          <BarChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis dataKey={chart.x_key} tick={{ fill: '#94a3b8', fontSize: 11 }} interval={0} angle={-15} dy={10} height={60} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip contentStyle={tip} />
            <Bar dataKey={key} fill="#6366f1" radius={[6, 6, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export const ProTable = ({ table }) => {
  if (!table?.rows?.length || !table?.columns?.length) return null;
  return (
    <div className="glass-card rounded-2xl p-5 border border-white/10">
      <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
        <TableIcon className="w-4 h-4 text-emerald-400" /> Ranked Results
      </h4>
      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-slate-900/80 text-xs uppercase text-slate-400">
            <tr>{table.columns.map(c => <th key={c} className="py-2.5 px-4 font-semibold">{c}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
            {table.rows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-800/40">
                {table.columns.map(c => (
                  <td key={c} className="py-2.5 px-4 font-mono text-slate-200">
                    {r[c] ?? '—'}{i === 0 && c === table.columns[0] ? '  ★' : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
