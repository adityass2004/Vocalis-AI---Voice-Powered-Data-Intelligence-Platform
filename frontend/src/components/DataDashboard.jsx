import React, { useState, useRef, useCallback, useEffect } from 'react'
import SampleDatasets from './SampleDatasets'
import DataVisualizer from './DataVisualizer'
import DataQualityView from './DataQualityView'
import DataOverview from './DataOverview'
import ErrorBoundary from './ErrorBoundary'
import StatisticalInsights from './StatisticalInsights'
import CorrelationMatrix from './CorrelationMatrix'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileText, BarChart3, Search, X, Loader2,
  TrendingUp, Database, Activity, Network, Sparkles, Layers
} from 'lucide-react'

const QueryInterface = ({ query, setQuery, analyzeQuery, isAnalyzing }) => (
  <div className="space-y-4">
    <div className="flex items-center space-x-3 mb-2">
      <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
        <Search className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-white font-outfit">Natural Language Query</h3>
        <p className="text-xs text-slate-400">Ask questions about your data to extract statistical insights</p>
      </div>
    </div>

    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. What is the average sales revenue? Show trends over time..."
          className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
          rows={2}
        />
      </div>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={analyzeQuery}
        disabled={!query.trim() || isAnalyzing}
        className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center space-x-2 self-stretch sm:self-auto"
      >
        {isAnalyzing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <TrendingUp className="w-5 h-5" />
        )}
        <span>Run Query</span>
      </motion.button>
    </div>
  </div>
);

const QueryResults = ({ results }) => {
  const insightsArray = Array.isArray(results.insights)
    ? results.insights
    : typeof results.insights === 'string' && results.insights.trim()
      ? [results.insights]
      : []
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
        <Sparkles className="w-4 h-4 text-cyan-400" />
        <span>Analysis Results</span>
      </div>
      {results.explanation && (
        <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800">
          <h4 className="font-semibold text-sm text-slate-200 mb-2 font-outfit">AI Explanation</h4>
          <p className="text-slate-300 text-sm leading-relaxed">
            {results.explanation}
          </p>
        </div>
      )}
      {insightsArray.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-slate-200 font-outfit">Key Insights:</h4>
          {insightsArray.map((insight, index) => (
            <div key={index} className="flex items-start space-x-2 text-sm text-slate-300 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
              <div className="w-2 h-2 mt-1.5 bg-cyan-400 rounded-full flex-shrink-0"></div>
              <span>{insight}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
};

const DatasetHeader = ({ activeTab, setActiveTab }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <div className="flex justify-between items-center mb-6 overflow-x-auto glass-card rounded-2xl p-2 border border-slate-800">
      <div className="flex space-x-1 min-w-max">
        {[
          { id: 'overview', label: 'Overview', icon: <Database className="w-4 h-4" /> },
          { id: 'visualizations', label: 'Visualizations', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'statistics', label: 'Statistics', icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'correlations', label: 'Correlations', icon: <Network className="w-4 h-4" /> },
          { id: 'quality', label: 'Data Quality', icon: <Activity className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium text-xs md:text-sm transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  </motion.div>
)

const DataDashboard = ({ onDatasetLoaded }) => {
  const [datasetInfo, setDatasetInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [queryResults, setQueryResults] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedColumns, setSelectedColumns] = useState([])
  const [visualizationType, setVisualizationType] = useState('bar')
  const [summaryStats, setSummaryStats] = useState(null)
  const [dataQuality, setDataQuality] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (datasetInfo?.columns?.length > 0) {
      const defaultCategorical = datasetInfo.categorical_columns?.[0]
      const defaultNumeric = datasetInfo.numeric_columns?.[0]
      if (defaultCategorical && defaultNumeric) {
        setSelectedColumns([defaultCategorical, defaultNumeric])
      } else {
        setSelectedColumns([datasetInfo.columns[0], datasetInfo.columns[1]].filter(Boolean))
      }
    }
  }, [datasetInfo])

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      uploadFile(files[0])
    }
  }, [])

  const uploadFile = async (file) => {
    if (!file) return

    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      alert('Please upload a CSV or Excel file')
      return
    }

    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/data/upload`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setDatasetInfo(data)
        if (data.columns && data.columns.length > 0) {
          setSelectedColumns([data.columns[0]])
        }
        setActiveTab('overview')
        onDatasetLoaded(data)
      } else {
        throw new Error(data.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload file. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      uploadFile(file)
    }
  }

  useEffect(() => {
    if (datasetInfo) {
      if (activeTab === 'quality') {
        fetchDataQuality()
      }
      if (activeTab === 'overview' || activeTab === 'statistics') {
        fetchSummaryStats()
      }
      if (activeTab === 'visualizations') {
        setSelectedColumns([])
        setVisualizationType('bar')
      }
    }
  }, [datasetInfo, activeTab])

  const analyzeQuery = async () => {
    if (!query.trim() || !datasetInfo) return

    setIsAnalyzing(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/data/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Analysis failed')
      }

      const transformed = {
        ...data,
        explanation: data.ai_explanation || data.explanation || '',
        insights: Array.isArray(data.insights)
          ? data.insights
          : (typeof data.insights === 'string' && data.insights.trim())
            ? [data.insights]
            : []
      }
      setQueryResults(transformed)
    } catch (error) {
      console.error('Analysis error:', error)
      alert('Failed to analyze query. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const clearDataset = () => {
    setDatasetInfo(null)
    setQueryResults(null)
    setQuery('')
    setSelectedColumns([])
    setDataQuality(null)
    setSummaryStats(null)
    onDatasetLoaded(null)
  }

  const toggleColumnSelection = (column) => {
    setSelectedColumns(prev =>
      prev.includes(column)
        ? prev.filter(col => col !== column)
        : [...prev, column]
    )
  }

  const fetchDataQuality = async () => {
    if (!datasetInfo) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/data/quality`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (data.success) {
        setDataQuality(data.quality)
      } else {
        console.error('Data quality fetch failed:', data.error)
      }
    } catch (error) {
      console.error('Failed to fetch data quality:', error)
      setDataQuality(null)
    }
  }

  const fetchSummaryStats = async () => {
    if (!datasetInfo) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/data/summary`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (data.success) {
        setSummaryStats(data.summary)
      } else {
        console.error('Summary stats fetch failed:', data.error)
      }
    } catch (error) {
      console.error('Failed to fetch summary stats:', error)
      setSummaryStats(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold mb-3">
          <Layers className="w-3.5 h-3.5 text-indigo-400" /> Automated Profiling & Data Visualizations
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-white font-outfit tracking-tight">
          Data <span className="text-gradient-primary">Explorer & Analytics</span>
        </h2>
        <p className="text-slate-400 text-sm mt-1 max-w-lg mx-auto">Upload datasets to explore distributions, correlation matrices, and quality metrics</p>
      </motion.div>

      {datasetInfo && <DatasetHeader activeTab={activeTab} setActiveTab={setActiveTab} />}

      {!datasetInfo ? (
        <>
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <div
              className={`glass-card rounded-2xl p-10 md:p-14 text-center border-2 border-dashed transition-all duration-300 ${
                dragActive
                  ? 'border-indigo-400 bg-indigo-500/10 scale-102'
                  : 'border-slate-700/80 hover:border-slate-500'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <AnimatePresence>
                {isLoading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4 py-8"
                  >
                    <Loader2 className="w-14 h-14 text-cyan-400 mx-auto animate-spin" />
                    <p className="text-white font-medium text-base">Parsing dataset and generating statistical profile...</p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    <div className="relative inline-block">
                      <div className="w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto mb-2">
                        <Upload className="w-10 h-10 text-cyan-400" />
                      </div>
                      {dragActive && (
                        <motion.div
                          className="absolute inset-0 bg-indigo-500/20 rounded-2xl"
                          animate={{ scale: [1, 1.15, 1] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                        />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1 font-outfit">
                        Upload Your Dataset
                      </h3>
                      <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">
                        Drag and drop your CSV or Excel file here to unlock automated analytics
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white px-8 py-3 rounded-xl font-medium text-sm transition-all shadow-lg shadow-indigo-500/25"
                    >
                      Browse Files
                    </motion.button>
                    <div className="flex justify-center space-x-8 text-xs font-medium text-slate-400 pt-2">
                      <div className="flex items-center space-x-1.5">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        <span>CSV Format</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <BarChart3 className="w-4 h-4 text-indigo-400" />
                        <span>Excel (.xlsx, .xls)</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <SampleDatasets onSampleUpload={(dataInfo) => {
            setDatasetInfo(dataInfo)
            onDatasetLoaded(dataInfo)
          }} />
        </>
      ) : (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6 border border-slate-800"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white font-outfit mb-1">
                  {activeTab === 'overview' ? 'Dataset Profile' :
                   activeTab === 'visualizations' ? 'Interactive Visualizations' :
                   activeTab === 'statistics' ? 'Statistical Metrics' :
                   activeTab === 'correlations' ? 'Correlation Matrix' :
                   activeTab === 'quality' ? 'Data Quality Audit' :
                   'Dataset Explorer'}
                </h3>
                <p className="text-slate-400 text-xs">
                  {activeTab === 'overview' ? 'Summary metrics, column breakdown, and entity roles' :
                   activeTab === 'visualizations' ? 'Generate dynamic plots from your dataset' :
                   activeTab === 'statistics' ? 'Distribution metrics, variance, and percentiles' :
                   activeTab === 'correlations' ? 'Pairwise variable correlations and heatmaps' :
                   activeTab === 'quality' ? 'Audit missing values, completeness, and formatting' :
                   'Explore your dataset'}
                </p>
              </div>
              <button
                onClick={clearDataset}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-700"
                title="Clear Dataset"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeTab === 'overview' && (
              <DataOverview datasetInfo={datasetInfo} />
            )}
            {activeTab === 'visualizations' && (
              <ErrorBoundary>
                <DataVisualizer
                  data={datasetInfo?.data || []}
                  columns={datasetInfo?.columns || []}
                  numericColumns={datasetInfo?.numeric_columns || []}
                  categoricalColumns={datasetInfo?.categorical_columns || []}
                  columnTypes={datasetInfo?.column_types || {}}
                  selectedColumns={selectedColumns}
                  type={visualizationType}
                  onTypeChange={setVisualizationType}
                  onToggleColumn={toggleColumnSelection}
                  onSelectColumns={(cols) => setSelectedColumns(cols)}
                />
              </ErrorBoundary>
            )}
            {activeTab === 'statistics' && (
              <ErrorBoundary>
                <StatisticalInsights
                  data={datasetInfo?.data || []}
                  columns={datasetInfo?.columns || []}
                  numericColumns={datasetInfo?.numeric_columns || []}
                  columnTypes={datasetInfo?.column_types || {}}
                />
              </ErrorBoundary>
            )}
            {activeTab === 'correlations' && (
              <ErrorBoundary>
                <CorrelationMatrix
                  data={datasetInfo?.data || []}
                  columnTypes={datasetInfo?.column_types || {}}
                />
              </ErrorBoundary>
            )}
            {activeTab === 'quality' && (
              <DataQualityView
                dataInfo={{
                  ...datasetInfo,
                  data_types: datasetInfo?.data_types || datasetInfo?.column_types || {},
                  data_quality: dataQuality || datasetInfo?.data_quality
                }}
              />
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-6 border border-slate-800"
          >
            <QueryInterface
              query={query}
              setQuery={setQuery}
              analyzeQuery={analyzeQuery}
              isAnalyzing={isAnalyzing}
            />
          </motion.div>

          <AnimatePresence>
            {queryResults && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-card rounded-2xl p-6 border border-slate-800"
              >
                <QueryResults results={queryResults} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

export default DataDashboard
