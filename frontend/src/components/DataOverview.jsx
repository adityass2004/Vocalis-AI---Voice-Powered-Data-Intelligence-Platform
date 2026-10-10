import React from 'react';
import { Table, Layers, Hash, Database } from 'lucide-react';

const DataOverview = ({ datasetInfo }) => {
  if (!datasetInfo || !datasetInfo.info) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-slate-400">
        <Database className="w-10 h-10 mx-auto mb-3 text-slate-500 animate-pulse" />
        No dataset uploaded yet. Please upload a file to view statistics.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-5 border border-white/10 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Total Records</p>
            <p className="text-2xl font-bold font-outfit text-white">{datasetInfo.info.total_rows?.toLocaleString() || 0}</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/10 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Hash className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Total Fields</p>
            <p className="text-2xl font-bold font-outfit text-white">{datasetInfo.info.total_columns?.toLocaleString() || 0}</p>
          </div>
        </div>
      </div>

      {/* Schema / Columns Table */}
      <div className="glass-card rounded-2xl p-6 border border-white/10">
        <h3 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Table className="w-4 h-4 text-cyan-400" />
          Schema & Column Properties
        </h3>
        <div className="overflow-x-auto rounded-xl border border-slate-700/50">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
            <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase">
              <tr>
                <th className="py-3 px-4">Column Name</th>
                <th className="py-3 px-4">Data Type</th>
                <th className="py-3 px-4">Missing Values</th>
                <th className="py-3 px-4">Sample Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {Object.entries(datasetInfo.data_types || {}).map(([column, type]) => (
                <tr key={column} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-slate-200">{column}</td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {type}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      (datasetInfo.info.missing_values?.[column] || 0) > 0 
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {datasetInfo.info.missing_values?.[column] || 0}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-xs truncate max-w-xs">
                    {(datasetInfo.info.sample_data &&
                      datasetInfo.info.sample_data[0]?.[column] !== undefined && datasetInfo.info.sample_data[0]?.[column] !== null)
                      ? String(datasetInfo.info.sample_data[0][column])
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Data */}
      {datasetInfo.info.sample_data && datasetInfo.info.sample_data.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-white/10">
          <h3 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Dataset Preview (First {datasetInfo.info.sample_data.length} Rows)
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-700/50">
            <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
              <thead className="bg-slate-900/80 font-semibold text-slate-400 uppercase">
                <tr>
                  {Object.keys(datasetInfo.info.sample_data[0] || {}).map(header => (
                    <th key={header} className="py-3 px-4 font-mono">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {datasetInfo.info.sample_data.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-800/40 transition-colors">
                    {Object.values(row).map((value, i) => (
                      <td key={i} className="py-2.5 px-4 text-slate-300 font-mono whitespace-nowrap">
                        {value !== null && value !== undefined ? String(value) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataOverview;
