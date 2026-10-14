import React from 'react';
import { Table, Layers, Hash, Database } from 'lucide-react';

const DataOverview = ({ datasetInfo }) => {
  const hasData = Boolean(
    datasetInfo && (
      datasetInfo.info ||
      datasetInfo.columns?.length ||
      datasetInfo.data?.length ||
      datasetInfo.total_rows ||
      datasetInfo.shape
    )
  );

  if (!hasData) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-slate-400">
        <Database className="w-10 h-10 mx-auto mb-3 text-slate-500 animate-pulse" />
        No dataset uploaded yet. Please upload a file to view statistics.
      </div>
    );
  }

  const totalRows = datasetInfo.info?.total_rows ?? datasetInfo.total_rows ?? datasetInfo.shape?.[0] ?? datasetInfo.data?.length ?? 0;
  const totalCols = datasetInfo.info?.total_columns ?? datasetInfo.total_columns ?? datasetInfo.shape?.[1] ?? datasetInfo.columns?.length ?? 0;

  // Build column types mapping
  let types = datasetInfo.data_types || datasetInfo.column_types;
  if (!types || Object.keys(types).length === 0) {
    types = {};
    const cols = datasetInfo.columns || Object.keys(datasetInfo.data?.[0] || {});
    const numCols = new Set(datasetInfo.numeric_columns || []);
    cols.forEach(col => {
      types[col] = numCols.has(col) ? 'number' : 'text';
    });
  }

  const missingMap = datasetInfo.info?.missing_values || datasetInfo.missing_values || {};
  const sampleData = datasetInfo.info?.sample_data || datasetInfo.data?.slice(0, 10) || [];
  const firstSample = sampleData[0] || {};

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
            <p className="text-2xl font-bold font-outfit text-white">{totalRows.toLocaleString()}</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/10 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Hash className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Total Fields</p>
            <p className="text-2xl font-bold font-outfit text-white">{totalCols.toLocaleString()}</p>
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
              {Object.entries(types).map(([column, type]) => {
                const missingCount = missingMap[column] ?? 0;
                const sampleVal = firstSample[column];
                return (
                  <tr key={column} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-200">{column}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {String(type)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        missingCount > 0 
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {missingCount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-xs truncate max-w-xs">
                      {sampleVal !== undefined && sampleVal !== null ? String(sampleVal) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Data */}
      {sampleData.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-white/10">
          <h3 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Dataset Preview (First {sampleData.length} Rows)
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-700/50">
            <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
              <thead className="bg-slate-900/80 font-semibold text-slate-400 uppercase">
                <tr>
                  {Object.keys(firstSample).map(header => (
                    <th key={header} className="py-3 px-4 font-mono whitespace-nowrap">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {sampleData.map((row, index) => (
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
