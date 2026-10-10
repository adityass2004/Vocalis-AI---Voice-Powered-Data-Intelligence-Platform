import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Network } from 'lucide-react';

const CorrelationMatrix = ({ data, columnTypes = {} }) => {
  const correlations = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return null;

    let numericColumns = Object.entries(columnTypes)
      .filter(([_, type]) => type === 'number')
      .map(([col]) => col);

    if (numericColumns.length === 0) {
      const sample = data[0] || {};
      numericColumns = Object.keys(sample).filter((key) => {
        const val = Number(sample[key]);
        return typeof sample[key] !== 'object' && !isNaN(val) && isFinite(val);
      });
    }

    if (numericColumns.length < 2) return null;

    const correlationMatrix = {};
    numericColumns.forEach(col1 => {
      correlationMatrix[col1] = {};
      numericColumns.forEach(col2 => {
        if (col1 === col2) {
          correlationMatrix[col1][col2] = 1;
          return;
        }

  const values1 = data.map(row => Number(row[col1])).filter(val => !isNaN(val) && isFinite(val));
  const values2 = data.map(row => Number(row[col2])).filter(val => !isNaN(val) && isFinite(val));

        if (values1.length !== values2.length) {
          correlationMatrix[col1][col2] = 0;
          return;
        }

        const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
        const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;

        const variance1 = values1.reduce((a, b) => a + Math.pow(b - mean1, 2), 0);
        const variance2 = values2.reduce((a, b) => a + Math.pow(b - mean2, 2), 0);

        const covariance = values1.reduce((a, b, i) =>
          a + ((b - mean1) * (values2[i] - mean2)), 0);

        const correlation = covariance / Math.sqrt(variance1 * variance2);
        correlationMatrix[col1][col2] = correlation;
      });
    });

    return correlationMatrix;
  }, [data, columnTypes]);

  if (!correlations) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>Not enough numeric columns for correlation analysis</p>
      </div>
    );
  }

  const getCorrelationColor = (value) => {
    const absValue = Math.abs(value);
    if (absValue > 0.7) return value > 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold';
    if (absValue > 0.4) return value > 0 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
    return 'bg-slate-800/60 text-slate-400 border border-slate-700/40';
  };

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6 border border-white/10 shadow-xl">
        <div className="flex items-center space-x-2 mb-6">
          <Network className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-semibold text-slate-200">Pearson Correlation Analysis</h3>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-900/60 p-4">
          <table className="min-w-full text-xs font-mono">
            <thead>
              <tr>
                <th className="text-left font-semibold text-slate-400 p-2"></th>
                {Object.keys(correlations).map(column => (
                  <th
                    key={column}
                    className="text-left font-semibold text-slate-300 p-2 truncate max-w-[120px]"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {Object.entries(correlations).map(([row, cols]) => (
                <tr key={row} className="hover:bg-slate-800/30 transition-colors">
                  <td className="font-semibold text-slate-300 p-2 whitespace-nowrap">{row}</td>
                  {Object.entries(cols).map(([col, value]) => (
                    <td key={col} className="p-2">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className={`inline-block px-2.5 py-1 rounded-lg text-xs ${getCorrelationColor(value)}`}
                      >
                        {value.toFixed(2)}
                      </motion.div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
            <span>Strong Positive (&gt; 0.70)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]"></span>
            <span>Moderate Positive (0.40 - 0.70)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
            <span>Weak / No Correlation (&lt; 0.40)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorrelationMatrix;
