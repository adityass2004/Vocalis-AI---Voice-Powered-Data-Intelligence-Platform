import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, Activity,
  AlertCircle, ArrowUpRight, ArrowDownRight,
  BarChart2, Hash
} from 'lucide-react';

const StatCard = ({ title, value, description, badgeColor = 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="glass-card p-4 rounded-xl border border-white/10 hover:border-indigo-500/30 transition-all shadow-md"
  >
    <p className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">{title}</p>
    <div className="flex items-center justify-between">
      <h4 className="text-lg font-bold font-outfit text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </h4>
      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${badgeColor}`}>
        Metric
      </span>
    </div>
    {description && (
      <p className="text-[11px] text-slate-400 mt-2">{description}</p>
    )}
  </motion.div>
);

const StatisticalInsights = ({ data, columnTypes }) => {
  if (!Array.isArray(data) || data.length === 0) return null;

  const getColumnStats = (columnName) => {
    const values = data.map(row => Number(row[columnName])).filter(val => !isNaN(val) && isFinite(val));
    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const q1 = sorted[Math.floor(sorted.length / 4)];
    const q3 = sorted[Math.floor(3 * sorted.length / 4)];
    const stdDev = Math.sqrt(
      values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
    );

    return {
      mean,
      median,
      min,
      max,
      q1,
      q3,
      stdDev,
      range: max - min,
      iqr: q3 - q1
    };
  };

  const numericColumns = Object.entries(columnTypes || {})
    .filter(([_, type]) => type === 'number')
    .map(([col]) => col);

  return (
    <div className="space-y-8">
      {/* Statistical Summary per Numeric Column */}
      {numericColumns.length > 0 && (
        <div className="space-y-6">
          {numericColumns.map(column => {
            const stats = getColumnStats(column);
            if (!stats) return null;

            return (
              <div key={column} className="glass-card rounded-2xl p-6 border border-white/10 shadow-xl">
                <h3 className="text-base font-semibold text-slate-200 mb-4 flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-indigo-400" />
                  <span>{column} — Descriptive Metrics</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <StatCard title="Mean" value={stats.mean.toFixed(2)} badgeColor="bg-indigo-500/10 text-indigo-300 border-indigo-500/20" />
                  <StatCard title="Median" value={stats.median.toFixed(2)} badgeColor="bg-cyan-500/10 text-cyan-300 border-cyan-500/20" />
                  <StatCard title="Std Dev" value={stats.stdDev.toFixed(2)} badgeColor="bg-purple-500/10 text-purple-300 border-purple-500/20" />
                  <StatCard title="Range" value={stats.range.toFixed(2)} badgeColor="bg-amber-500/10 text-amber-300 border-amber-500/20" />
                  <StatCard title="Q1 - Q3" value={`${stats.q1.toFixed(1)} - ${stats.q3.toFixed(1)}`} badgeColor="bg-emerald-500/10 text-emerald-300 border-emerald-500/20" />
                  <StatCard title="IQR" value={stats.iqr.toFixed(2)} badgeColor="bg-pink-500/10 text-pink-300 border-pink-500/20" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Field Integrity Indicators */}
      <div className="glass-card rounded-2xl p-6 border border-white/10 shadow-xl">
        <h3 className="text-base font-semibold text-slate-200 mb-4 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-cyan-400" />
          <span>Column Integrity & Distribution</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(columnTypes || {}).map(([column, type]) => {
            const nonNullCount = data.filter(row => row[column] !== null && row[column] !== undefined && row[column] !== '').length;
            const completeness = (nonNullCount / data.length) * 100;
            const uniqueCount = new Set(data.map(row => row[column])).size;

            return (
              <motion.div
                key={column}
                whileHover={{ scale: 1.01 }}
                className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/40"
              >
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold text-slate-200 truncate font-mono">{column}</h4>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono ${
                    type === 'number' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  }`}>
                    {type}
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Completeness</span>
                      <span className="text-slate-200 font-semibold">{completeness.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
                        style={{ width: `${completeness}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Unique Values</span>
                    <span className="text-slate-200 font-mono font-medium">{uniqueCount.toLocaleString()}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StatisticalInsights;
