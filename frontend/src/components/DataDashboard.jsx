import React, { useState, useRef, useCallback, useEffect } from 'react'
import SampleDatasets from './SampleDatasets'
import DataVisualizer from './DataVisualizer'
import DataQualityView from './DataQualityView'
import DataOverview from './DataOverview'
import ProAnalysis from './ProAnalysis'
import ErrorBoundary from './ErrorBoundary'
import StatisticalInsights from './StatisticalInsights'
import CorrelationMatrix from './CorrelationMatrix'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileText, BarChart3, Search, X, Loader2,
  TrendingUp, Database, Activity, Network, Sparkles, Layers,
  Lock, Unlock, Key, History, Trash2, Clock, ChevronDown, FolderOpen,
  PlusCircle, FileSpreadsheet
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
          { id: 'pro', label: 'Pro Analysis', icon: <Sparkles className="w-4 h-4" /> },
          { id: 'overview', label: 'Data Profile', icon: <Layers className="w-4 h-4" /> },
          { id: 'visualizations', label: 'Visualizations', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'statistics', label: 'Statistics', icon: <Activity className="w-4 h-4" /> },
          { id: 'correlations', label: 'Correlations', icon: <Network className="w-4 h-4" /> },
          { id: 'quality', label: 'Quality Audit', icon: <Database className="w-4 h-4" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm flex items-center space-x-2 transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-500/20'
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
);

const DataDashboard = ({ 
  currentDataset, 
  datasetHistory = [], 
  onDatasetLoaded, 
  onSelectFromHistory, 
  onDeleteDataset, 
  onDeleteHistoryItem 
}) => {
  const [datasetInfo, setDatasetInfo] = useState(currentDataset || null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [samplesOpen, setSamplesOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [queryResults, setQueryResults] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [activeTab, setActiveTab] = useState('pro')
  const [selectedColumns, setSelectedColumns] = useState([])
  const [visualizationType, setVisualizationType] = useState('bar')
  const [summaryStats, setSummaryStats] = useState(null)
  const [dataQuality, setDataQuality] = useState(null)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [pendingFile, setPendingFile] = useState(null)
  const [passwordError, setPasswordError] = useState('')
  const fileInputRef = useRef(null)

  // Synchronize datasetInfo with currentDataset from parent App
  useEffect(() => {
    if (currentDataset) {
      setDatasetInfo(currentDataset)
    } else {
      setDatasetInfo(null)
    }
  }, [currentDataset])

  const clearDataset = async () => {
    if (window.confirm('Are you sure you want to delete and reset the active dataset?')) {
      setDatasetInfo(null)
      setQueryResults(null)
      setSummaryStats(null)
      setDataQuality(null)
      setQuery('')
      setSelectedColumns([])
      if (onDeleteDataset) {
        await onDeleteDataset()
      }
    }
  }

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

  const uploadFile = async (file, password = null) => {
    if (!file) return

    const ext = file.name.split('.').pop().toLowerCase()
    const allowedExts = ['csv', 'xlsx', 'xls', 'pdf', 'tsv', 'html', 'htm', 'txt']
    if (!allowedExts.includes(ext)) {
      alert('Please upload a supported document format (CSV, Excel, PDF Statement, TSV, HTML)')
      return
    }

    setIsLoading(true)
    setPasswordError('')
    const formData = new FormData()
    formData.append('file', file)
    if (password) {
      formData.append('password', password)
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/data/upload`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.requires_password) {
        setPendingFile(file)
        setPasswordModalOpen(true)
        setIsLoading(false)
        return
      }

      if (data.success) {
        setPasswordModalOpen(false)
        setPendingFile(null)
        setPasswordInput('')
        setDatasetInfo(data)
        if (data.columns && data.columns.length > 0) {
          setSelectedColumns([data.columns[0]])
        }
        setActiveTab('pro')
        setSamplesOpen(false)
        if (onDatasetLoaded) onDatasetLoaded(data)
      } else {
        if (passwordModalOpen) {
          setPasswordError(data.error || 'Incorrect password')
        } else {
          throw new Error(data.error || 'Upload failed')
        }
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert(error.message || 'Failed to upload dataset')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      uploadFile(file)
    }
    // reset input value so re-selecting the same file triggers change
    if (e.target) e.target.value = ''
  }

  const analyzeQuery = async () => {
    if (!query.trim() || isAnalyzing) return

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

  const toggleColumnSelection = (column) => {
    setSelectedColumns(prev =>
      prev.includes(column)
        ? prev.filter(col => col !== column)
        : [...prev, column]
    )
  }

  return (
    <div className="space-y-6" onDragEnter={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
      {/* Hidden file input ALWAYS mounted so any Add Dataset button triggers it */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.pdf,.tsv,.html,.htm,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Global Drag Overlay */}
      {dragActive && (
        <div 
          onDragLeave={handleDrag}
          className="fixed inset-0 z-50 bg-indigo-950/80 backdrop-blur-md border-4 border-dashed border-cyan-400 flex flex-col items-center justify-center pointer-events-auto"
        >
          <Upload className="w-16 h-16 text-cyan-400 animate-bounce mb-4" />
          <h2 className="text-2xl font-bold text-white font-outfit">Drop your dataset here</h2>
          <p className="text-sm text-cyan-200 mt-2">CSV, Excel, PDF Bank Statement, HTML, or TSV</p>
        </div>
      )}

      {/* When a dataset is loaded */}
      {datasetInfo ? (
        <div className="space-y-6">
          <DatasetHeader activeTab={activeTab} setActiveTab={setActiveTab} />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6 border border-slate-800 shadow-2xl"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-white font-outfit">
                    {activeTab === 'pro' ? 'Professional Analysis' :
                     activeTab === 'overview' ? 'Dataset Profile' :
                     activeTab === 'visualizations' ? 'Interactive Visualizations' :
                     activeTab === 'statistics' ? 'Statistical Metrics' :
                     activeTab === 'correlations' ? 'Correlation Matrix' :
                     activeTab === 'quality' ? 'Data Quality Audit' :
                     'Dataset Explorer'}
                  </h3>
                  {datasetInfo?.filename && (
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 truncate max-w-xs font-mono">
                      {datasetInfo.filename.replace(/^[a-f0-9]{8}_/, '')}
                    </span>
                  )}
                  {datasetInfo?.shape && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {datasetInfo.shape[0]} rows • {datasetInfo.shape[1]} cols
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-xs">
                  {activeTab === 'pro' ? 'KPIs, key insights and one-click professional reports' :
                   activeTab === 'overview' ? 'Summary metrics, column breakdown, and entity roles' :
                   activeTab === 'visualizations' ? 'Generate dynamic plots from your dataset' :
                   activeTab === 'statistics' ? 'Distribution metrics, variance, and percentiles' :
                   activeTab === 'correlations' ? 'Pairwise variable correlations and heatmaps' :
                   activeTab === 'quality' ? 'Audit missing values, completeness, and formatting' :
                   'Explore your dataset'}
                </p>
              </div>

              {/* ACTION BAR: DATA ADDER + SAMPLES + HISTORY + DELETE */}
              <div className="flex flex-wrap items-center gap-2 relative">
                {/* 1. DATA ADDER / UPLOAD BUTTON (ALWAYS VISIBLE!) */}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-indigo-500/20"
                  title="Upload a new dataset (CSV, Excel, PDF Statement, TSV)"
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PlusCircle className="w-3.5 h-3.5" />
                  )}
                  <span>+ Add Dataset</span>
                </motion.button>

                {/* 2. SAMPLES TOGGLE BUTTON */}
                <button
                  onClick={() => setSamplesOpen(!samplesOpen)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                    samplesOpen
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/80'
                  }`}
                  title="Pick a preloaded sample dataset"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Samples</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${samplesOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* 3. HISTORY SWITCHER */}
                {datasetHistory && datasetHistory.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setHistoryOpen(!historyOpen)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 transition-all shadow-md"
                      title="Switch to another dataset from history"
                    >
                      <History className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="hidden md:inline">History ({datasetHistory.length})</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    {historyOpen && (
                      <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 space-y-1">
                        <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider border-b border-slate-800 mb-1">
                          Dataset History
                        </div>
                        {datasetHistory.map(item => (
                          <button
                            key={item.id}
                            onClick={() => {
                              if (onSelectFromHistory) onSelectFromHistory(item);
                              setHistoryOpen(false);
                            }}
                            className="w-full text-left p-2 rounded-lg hover:bg-slate-800/80 flex items-center justify-between transition-colors text-xs group"
                          >
                            <div className="truncate flex-1 pr-2">
                              <p className="font-medium text-slate-200 truncate group-hover:text-cyan-300">{item.name}</p>
                              <p className="text-[10px] text-slate-500">{item.rows} rows • {item.columns} cols</p>
                            </div>
                            {item.dataset?.filename === datasetInfo?.filename && (
                              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Active</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. DELETE ACTIVE DATASET */}
                <button
                  onClick={clearDataset}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all flex items-center gap-1.5 shadow-sm hover:shadow-rose-500/20"
                  title="Remove this dataset from workspace"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </div>
            </div>

            {/* SAMPLES ACCORDION / DRAWER */}
            <AnimatePresence>
              {samplesOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Load Sample Dataset
                    </h4>
                    <button 
                      onClick={() => setSamplesOpen(false)}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      Close
                    </button>
                  </div>
                  <SampleDatasets onSampleUpload={(dataInfo) => {
                    setDatasetInfo(dataInfo)
                    setSamplesOpen(false)
                    if (onDatasetLoaded) onDatasetLoaded(dataInfo)
                  }} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* TAB CONTENTS */}
            {activeTab === 'pro' && (
              <ErrorBoundary>
                <ProAnalysis
                  datasetInfo={datasetInfo}
                  proSummaryProp={datasetInfo?.pro_summary}
                  proPresetsProp={datasetInfo?.pro_presets?.presets || datasetInfo?.pro_presets}
                />
              </ErrorBoundary>
            )}
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
      ) : (
        /* When NO dataset is loaded: Show the main upload dropzone + sample datasets */
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-8 border border-slate-800 shadow-2xl text-center"
          >
            <div
              className={`border-2 border-dashed rounded-2xl p-8 transition-all ${
                dragActive 
                  ? 'border-cyan-400 bg-cyan-500/10' 
                  : 'border-slate-700/80 hover:border-slate-600 bg-slate-900/40'
              }`}
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
                      <h3 className="text-2xl font-bold text-white mb-2 font-outfit">
                        Upload Your Dataset
                      </h3>
                      <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
                        Drag and drop your CSV, Excel, PDF Bank Statement, or HTML table here to unlock automated analytics
                      </p>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white px-8 py-3.5 rounded-xl font-medium text-sm transition-all shadow-lg shadow-indigo-500/25 inline-flex items-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Browse & Add Dataset</span>
                    </motion.button>

                    <div className="flex flex-wrap justify-center gap-6 text-xs font-medium text-slate-400 pt-3">
                      <div className="flex items-center space-x-1.5">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        <span>CSV / TSV</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        <span>Excel (.xlsx, .xls)</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Lock className="w-4 h-4 text-amber-400" />
                        <span>PDF Bank Statements</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <SampleDatasets onSampleUpload={(dataInfo) => {
            setDatasetInfo(dataInfo)
            if (onDatasetLoaded) onDatasetLoaded(dataInfo)
          }} />
        </div>
      )}

      {/* Password Modal for Protected PDFs / Excels */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card max-w-md w-full p-6 rounded-2xl border border-indigo-500/30 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-outfit">Password Protected Document</h3>
                  <p className="text-xs text-slate-400">Enter password to decrypt and analyze data</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setPasswordModalOpen(false)
                  setPendingFile(null)
                  setPasswordInput('')
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs font-medium">
                {passwordError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Document Password</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && passwordInput.trim() && pendingFile) {
                    uploadFile(pendingFile, passwordInput.trim())
                  }
                }}
                placeholder="Enter document password..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                autoFocus
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Bank statements and password protected spreadsheets require authorization to decrypt tabular data.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => {
                  setPasswordModalOpen(false)
                  setPendingFile(null)
                  setPasswordInput('')
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (passwordInput.trim() && pendingFile) {
                    uploadFile(pendingFile, passwordInput.trim())
                  }
                }}
                disabled={!passwordInput.trim() || isLoading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white text-xs font-semibold hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 flex items-center space-x-2 shadow-lg shadow-indigo-500/20"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                <span>Unlock & Load</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default DataDashboard
