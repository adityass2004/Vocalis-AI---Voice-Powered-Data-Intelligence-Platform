import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ScatterChart, Scatter, PieChart, Pie, Cell,
  ResponsiveContainer
} from 'recharts';
import { motion } from 'framer-motion';
import {
  BarChart3,
  ScatterChart as ScatterChartIcon,
  PieChart as PieChartIcon
} from 'lucide-react';
import ErrorBoundary from './ErrorBoundary';

const COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#F97316',
  '#A78BFA',
  '#34D399',
  '#FBBF24',
  '#EC4899',
  '#6366F1',
  '#F472B6'
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 p-3 rounded-lg border border-white/10 shadow-xl">
        <p className="text-gray-300 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const VisualizationTypeSelector = ({ type, onTypeChange }) => (
  <div className="flex flex-wrap gap-4 mb-6">
    <button
      onClick={() => onTypeChange('bar')}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
        type === 'bar'
          ? 'bg-primary text-white'
          : 'bg-slate-800/50 text-gray-400 hover:text-white'
      }`}
    >
      <BarChart3 className="w-4 h-4" />
      <span>Bar Chart</span>
    </button>
    <button
      onClick={() => onTypeChange('scatter')}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
        type === 'scatter'
          ? 'bg-primary text-white'
          : 'bg-slate-800/50 text-gray-400 hover:text-white'
      }`}
    >
      <ScatterChartIcon className="w-4 h-4" />
      <span>Scatter Plot</span>
    </button>
    <button
      onClick={() => onTypeChange('pie')}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
        type === 'pie'
          ? 'bg-primary text-white'
          : 'bg-slate-800/50 text-gray-400 hover:text-white'
      }`}
    >
      <PieChartIcon className="w-4 h-4" />
      <span>Pie Chart</span>
    </button>
  </div>
);

const ColumnSelector = ({ columns, columnTypes = {}, selectedColumns = [], onToggleColumn }) => {

  return (
    <div className="space-y-4 mb-6">
      <div className="text-sm font-medium text-gray-400 mb-2">Select columns to visualize:</div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {columns?.map(column => (
          <motion.button
            key={column}
            onClick={() => onToggleColumn(column)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`text-sm px-3 py-2 rounded-lg transition-all ${
              selectedColumns.includes(column)
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-slate-800/50 border-white/10 text-gray-400 hover:text-white'
            } border flex items-center justify-between`}
          >
            <span>{column}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              columnTypes[column] === 'number'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-purple-500/20 text-purple-400'
            }`}>
              {columnTypes[column] || 'text'}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

const Chart = ({ data, type, columns, columnTypes = {} }) => {
  if (!data || !columns || columns.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>Select columns to visualize</p>
        <p className="text-sm mt-2">Choose at least one column to create a visualization</p>
      </div>
    );
  }

  const pieComputed = useMemo(() => {
    if (type !== 'pie' || !Array.isArray(data) || data.length === 0 || !Array.isArray(columns) || columns.length === 0) {
      return { data: [], category: columns?.[0] || 'Category', value: columns?.[1] || 'Value' };
    }

    const cols = columns.slice(0, 2);
    const isNumericCol = (col) => {
      if (!col) return false;
      if (columnTypes[col] === 'number') return true;

      const sample = data.slice(0, 50).map(r => Number(r[col])).filter(v => !isNaN(v) && isFinite(v));
      return sample.length >= Math.min(5, data.length);
    };

    let categoryCol = cols.find(c => !isNumericCol(c));
    let valueCol = cols.find(c => c !== categoryCol && isNumericCol(c));

    if (!categoryCol && cols.length > 0) {

      categoryCol = cols[0];
      valueCol = cols[1];
    }
    if (!valueCol) {

      valueCol = null;
    }

    const aggregated = new Map();

    const toBinLabel = (values, bins = 5) => {
      const nums = values.filter(v => typeof v === 'number' && isFinite(v));
      if (nums.length === 0) return () => 'N/A';
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      if (min === max) return () => `${min}`;
      const step = (max - min) / bins;
      return (v) => {
        if (!isFinite(v)) return 'N/A';
        const idx = Math.min(bins - 1, Math.floor((v - min) / step));
        const start = min + idx * step;
        const end = idx === bins - 1 ? max : start + step;
        return `${start.toFixed(2)} – ${end.toFixed(2)}`;
      };
    };

    const catIsNumeric = isNumericCol(categoryCol);
    const catValues = data.map(r => Number(r[categoryCol]));
    const binFn = catIsNumeric ? toBinLabel(catValues, 6) : null;

    for (const row of data) {
      const rawKey = catIsNumeric ? Number(row[categoryCol]) : row[categoryCol];
      const key = catIsNumeric ? binFn(Number(rawKey)) : (rawKey ?? 'N/A');
      if (!aggregated.has(key)) aggregated.set(key, { name: key, value: 0 });
      if (valueCol) {
        const v = Number(row[valueCol]);
        aggregated.get(key).value += isFinite(v) ? v : 0;
      } else {
        aggregated.get(key).value += 1;
      }
    }

    let arr = Array.from(aggregated.values()).sort((a, b) => b.value - a.value);

    if (arr.length > 8) {
      const top = arr.slice(0, 8);
      const othersValue = arr.slice(8).reduce((sum, r) => sum + r.value, 0);
      top.push({ name: 'Others', value: othersValue });
      arr = top;
    }

    const categoryLabel = catIsNumeric ? `${categoryCol} (binned)` : categoryCol;
    const valueLabel = valueCol || 'count';
    return { data: arr, category: categoryLabel, value: valueLabel };
  }, [type, data, columns, columnTypes]);

  const chartData = useMemo(() => {

    if (type === 'pie') {
      return pieComputed.data;
    }

    if (type === 'scatter' && Array.isArray(columns) && columns.length >= 2) {
      const sXKey = columns[0];
      const sYKey = columns[1];
      const rows = Array.isArray(data) ? data : [];
      const out = [];
      const maxPoints = 1000;
      for (let i = 0; i < rows.length && out.length < maxPoints; i++) {
        const row = rows[i] || {};
        const xRaw = sXKey === '__index__' ? i + 1 : Number(row[sXKey]);
        const yRaw = sYKey === '__index__' ? i + 1 : Number(row[sYKey]);
        if (isFinite(xRaw) && isFinite(yRaw)) {
          out.push({ [sXKey]: xRaw, [sYKey]: yRaw });
        }
      }
      return out;
    }

    if (type === 'bar' && columns.length >= 2 && columnTypes[columns[0]] !== 'number') {
      const categoryCol = columns[0];
      const numericCols = columns.slice(1).filter(c => columnTypes[c] === 'number');
      if (numericCols.length > 0) {
        const aggMap = new Map();
        for (const row of data) {
          const key = row[categoryCol];
          if (!aggMap.has(key)) aggMap.set(key, { [categoryCol]: key });
          for (const numCol of numericCols) {
            const prev = aggMap.get(key)[numCol] || 0;
            const val = Number(row[numCol]);
            aggMap.get(key)[numCol] = prev + (isFinite(val) ? val : 0);
          }
        }

        const firstNum = numericCols[0];
        const arr = Array.from(aggMap.values()).sort((a, b) => (b[firstNum] || 0) - (a[firstNum] || 0));
        return arr.slice(0, 10);
      }
    }

    if (type === 'bar' && columns.length === 1 && columnTypes[columns[0]] === 'number') {
      const col = columns[0];

      return data.slice(0, 50).map((row, i) => ({ index: i + 1, [col]: Number(row[col]) }));
    }
    return data;
  }, [data, columns, type, columnTypes, pieComputed]);

  const renderChart = () => {
    if (!data || !columns || columns.length === 0) {
      return (
        <div className="text-center py-12 text-gray-400">
          <p>Select columns to visualize</p>
          <p className="text-sm mt-2">Choose at least one column to create a visualization</p>
        </div>
      );
    }

    switch (type) {
      case 'bar':

        const isSingleNumeric = columns.length === 1 && columnTypes[columns[0]] === 'number';
        const xKey = isSingleNumeric ? 'index' : columns[0];
        const series = isSingleNumeric ? [columns[0]] : columns.slice(1);
        return (
          <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey={xKey}
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
              tickLine={{ stroke: '#4B5563' }}
            />
            <YAxis
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
              tickLine={{ stroke: '#4B5563' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#9CA3AF' }} />
            {series.map((column, index) => (
              <Bar
                key={column}
                dataKey={column}
                fill={column.toLowerCase().includes('temp') ? '#3B82F6' :
                      column.toLowerCase().includes('condition') ? '#10B981' :
                      COLORS[index % COLORS.length]}
              />
            ))}
          </BarChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        if (columns.length < 2) {
          return <div className="text-gray-400">Pick a pair from the recommendations above</div>;
        }
        const sXKey = columns[0];
        const sYKey = columns[1];
        const xLabel = sXKey === '__index__' ? 'Index' : sXKey;
        const yLabel = sYKey === '__index__' ? 'Index' : sYKey;
        if (!chartData || chartData.length === 0) {
          return <div className="text-gray-400">No numeric pairs found. Try another recommendation.</div>;
        }
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey={sXKey}
                name={xLabel}
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
                tickLine={{ stroke: '#4B5563' }}
              />
              <YAxis
                dataKey={sYKey}
                name={yLabel}
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
                tickLine={{ stroke: '#4B5563' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#9CA3AF' }} />
              <Scatter name={`${xLabel} vs ${yLabel}`} data={chartData} fill={COLORS[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );

    case 'pie':
        return (
          <div className="bg-slate-800/30 p-6 rounded-lg">
            <h3 className="text-center text-gray-300 mb-4 font-medium">
        {pieComputed.value} by {pieComputed.category}
            </h3>
            <ResponsiveContainer width="100%" height={360}>
              <PieChart margin={{ top: 12, right: 16, bottom: 16, left: 16 }}>
                <Pie
          data={chartData}
                  nameKey="name"
                  dataKey="value"
                  cx="48%"
                  cy="46%"
                  outerRadius={120}
                  label={chartData.length <= 12 ? (({ name, value, percent }) =>
                    `${name}: ${value.toLocaleString()} (${(percent * 100).toFixed(1)}%)`
                  ) : false}
                  labelLine={chartData.length <= 12}
                  paddingAngle={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`${entry.name}-${index}`}
                      fill={entry.name.toLowerCase().includes('high') ? '#F59E0B' :
                           entry.name.toLowerCase().includes('low') ? '#3B82F6' :
                           COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={<CustomTooltip />}
                  formatter={(value) => value.toLocaleString()}
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{
                    color: '#9CA3AF',
                    paddingTop: '20px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );

      default:
        return <div>Select a visualization type</div>;
    }
  };

  return (
    <ErrorBoundary>
      {renderChart()}
    </ErrorBoundary>
  );
};

const DataVisualizer = ({
  data = [],
  columns = [],
  numericColumns = [],
  categoricalColumns = [],
  columnTypes = {},
  selectedColumns = [],
  type = 'bar',
  onTypeChange,
  onToggleColumn,
  onSelectColumns
}) => {
  const isNumeric = (col) => col === '__index__' || columnTypes[col] === 'number';
  const canRenderSelected = React.useMemo(() => {
    const sel = Array.isArray(selectedColumns) ? selectedColumns : [];
    if (type === 'bar') {
      if (sel.length === 1) return isNumeric(sel[0]);
      if (sel.length >= 2) return (columnTypes[sel[0]] !== 'number') && sel.slice(1).some(isNumeric);
      return false;
    }
    if (type === 'scatter') {
      return sel.length >= 2 && isNumeric(sel[0]) && isNumeric(sel[1]);
    }
    if (type === 'pie') {

      return sel.length >= 1;
    }
    return false;
  }, [selectedColumns, type, columnTypes]);

  const defaultCharts = useMemo(() => {
    const charts = [];
    const hasCatNum = categoricalColumns.length > 0 && numericColumns.length > 0;
    const hasTwoNums = numericColumns.length > 1;

    if (hasCatNum) {
      charts.push({ type: 'bar', columns: [categoricalColumns[0], numericColumns[0]] });
    } else if (numericColumns.length === 1) {
      charts.push({ type: 'bar', columns: [numericColumns[0]] });
    }

    if (hasTwoNums) {
      charts.push({ type: 'scatter', columns: [numericColumns[0], numericColumns[1]] });
    } else if (numericColumns.length === 1) {
      charts.push({ type: 'scatter', columns: [numericColumns[0], '__index__'] });
    } else if (hasCatNum) {
      charts.push({ type: 'pie', columns: [categoricalColumns[0], numericColumns[0]] });
    }

    if (charts.length === 0 && columns.length > 0) {
      charts.push({ type: 'bar', columns: [columns[0]] });
    }

    return charts.slice(0, 2);
  }, [categoricalColumns, numericColumns, columns]);

  const hasSelection = Array.isArray(selectedColumns) && selectedColumns.length > 0;

  const recommendedByType = useMemo(() => {
    const rec = { bar: [], scatter: [], pie: [] };

    for (const c of categoricalColumns) {
      for (const n of numericColumns) rec.bar.push({ label: `${c} × ${n}`, cols: [c, n] });
    }
    if (rec.bar.length === 0) for (const n of numericColumns) rec.bar.push({ label: `${n}`, cols: [n] });

    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        const a = numericColumns[i];
        const b = numericColumns[j];
        rec.scatter.push({ label: `${a} vs ${b}`, cols: [a, b] });
      }
    }

    if (rec.scatter.length === 0 && numericColumns.length === 1) {
      const n = numericColumns[0];
      rec.scatter.push({ label: `${n} vs index`, cols: [n, '__index__'] });
    }

    for (const c of categoricalColumns) {
      rec.pie.push({ label: `${c} (count)`, cols: [c] });
      for (const n of numericColumns) rec.pie.push({ label: `${c} → sum(${n})`, cols: [c, n] });
    }
    if (rec.pie.length === 0) for (const n of numericColumns) rec.pie.push({ label: `${n} (binned)`, cols: [n] });
    return {
      bar: rec.bar.slice(0, 12),
      scatter: rec.scatter.slice(0, 12),
      pie: rec.pie.slice(0, 12)
    };
  }, [categoricalColumns, numericColumns]);

  React.useEffect(() => {
    const sel = Array.isArray(selectedColumns) ? selectedColumns : [];
    const recList = (recommendedByType[type] || []);
  const arraysEqual = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const matchesARecommendation = recList.some(r => arraysEqual(sel, r.cols));
  const needsDefault = sel.length === 0 || !canRenderSelected || !matchesARecommendation;
    if (needsDefault && recList.length > 0) {
      const target = recList[0].cols;
      const same = sel.length === target.length && sel.every((c, i) => c === target[i]);
      if (!same) {
        if (typeof onSelectColumns === 'function') {
          onSelectColumns(target);
        } else if (onToggleColumn) {

          sel.forEach(c => { if (!target.includes(c)) onToggleColumn(c); });
          target.forEach(c => { if (!sel.includes(c)) onToggleColumn(c); });
        }
      }
    }
  }, [type, recommendedByType, selectedColumns, canRenderSelected, onSelectColumns, onToggleColumn]);

  const applyPairSelection = (cols, chartType) => {
    if (chartType && typeof onTypeChange === 'function') {
      onTypeChange(chartType);
    }
    if (typeof onSelectColumns === 'function') {
      onSelectColumns(cols);
      return;
    }

    const current = new Set(selectedColumns);

    current.forEach(col => { if (!cols.includes(col)) onToggleColumn && onToggleColumn(col); });

    cols.forEach(col => { if (!current.has(col)) onToggleColumn && onToggleColumn(col); });
  };

  return (
    <div className="space-y-6">
      <VisualizationTypeSelector type={type} onTypeChange={onTypeChange} />
      {(recommendedByType[type] && recommendedByType[type].length > 0) && (
        <div className={`border rounded-xl p-3 ${hasSelection && !canRenderSelected ? 'bg-amber-500/10 border-amber-400/20' : 'bg-slate-800/40 border-white/10'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-400">Recommended pairs for {type}</div>
            {(() => {
              const arraysEqual = (a = [], b = []) => a.length === b.length && a.every((v, i) => v === b[i]);
              const selRec = (recommendedByType[type] || []).find(r => arraysEqual(r.cols, selectedColumns));
              return selRec ? (
                <div className="text-[11px] text-primary/90">
                  Selected: <span className="font-medium">{selRec.label}</span>
                </div>
              ) : null;
            })()}
          </div>
          <div className="flex flex-wrap gap-2">
            {recommendedByType[type].map((p, i) => {
              const arraysEqual = (a = [], b = []) => a.length === b.length && a.every((v, idx) => v === b[idx]);
              const isSelected = arraysEqual(p.cols, selectedColumns);
              return (
                <button
                  key={`${type}-${i}`}
                  onClick={() => applyPairSelection(p.cols)}
                  aria-pressed={isSelected}
                  className={
                    `text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'bg-slate-800/60 border-white/10 text-gray-200 hover:bg-slate-700/60'
                    }`
                  }
                  title={`${type}: ${p.label}`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {hasSelection && canRenderSelected ? (
        <Chart
          data={data}
          type={type}
          columns={selectedColumns}
          columnTypes={columnTypes}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {defaultCharts.map((cfg, idx) => (
            <div key={idx} className="bg-slate-800/30 p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-3 capitalize">{cfg.type} preview</div>
              <Chart
                data={data}
                type={cfg.type}
                columns={cfg.columns}
                columnTypes={columnTypes}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DataVisualizer;
