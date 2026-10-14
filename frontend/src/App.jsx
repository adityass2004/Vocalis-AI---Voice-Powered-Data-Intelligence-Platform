import React, { useState, useEffect, useCallback } from 'react'
import Header from './components/Header'
import AssistantUI from './components/AssistantUI'
import DataDashboard from './components/DataDashboard'

const STORAGE_ACTIVE_KEY = 'vocalis_active_dataset'
const STORAGE_HISTORY_KEY = 'vocalis_dataset_history'

const App = () => {
  const [currentView, setCurrentView] = useState('assistant')
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [datasetLoaded, setDatasetLoaded] = useState(false)
  const [currentDataset, setCurrentDataset] = useState(null)
  const [datasetHistory, setDatasetHistory] = useState([])
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false)

  // 1. Rehydrate active dataset & dataset history from localStorage on load
  useEffect(() => {
    try {
      const savedActive = localStorage.getItem(STORAGE_ACTIVE_KEY)
      if (savedActive) {
        const parsed = JSON.parse(savedActive)
        if (parsed && (parsed.columns?.length || parsed.total_rows || parsed.shape)) {
          setCurrentDataset(parsed)
          setDatasetLoaded(true)
        }
      }

      const savedHistory = localStorage.getItem(STORAGE_HISTORY_KEY)
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory)
        if (Array.isArray(parsedHistory)) {
          setDatasetHistory(parsedHistory)
        }
      }
    } catch (e) {
      console.warn('Failed to rehydrate dataset from localStorage:', e)
    }
  }, [])

  // 2. Health check & status polling
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ai/status`)
        if (response.ok) {
          const data = await response.json()
          setConnectionStatus('connected')
          setApiKeyConfigured(data.api_key_configured || false)
        } else {
          setConnectionStatus('error')
        }
      } catch (error) {
        setConnectionStatus('error')
      }
    }

    checkConnection()
    const interval = setInterval(checkConnection, 30000)
    return () => clearInterval(interval)
  }, [])

  // 3. Handle dataset loaded (upload or sample)
  const handleDatasetLoaded = useCallback((data) => {
    if (!data) return
    setCurrentDataset(data)
    setDatasetLoaded(true)

    try {
      localStorage.setItem(STORAGE_ACTIVE_KEY, JSON.stringify(data))

      // Build history item
      const rows = data.shape?.[0] || data.total_rows || data.rows || 0
      const cols = data.shape?.[1] || data.total_columns || data.columns?.length || 0
      const filename = data.filename || data.file || 'Dataset'
      const cleanName = filename.replace(/^[a-f0-9]{8}_/, '')

      const historyItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: cleanName,
        filename: data.filename,
        rows,
        columns: cols,
        brief: data.brief_summary || '',
        loadedAt: new Date().toISOString(),
        dataset: data
      }

      setDatasetHistory(prev => {
        const filtered = prev.filter(item => item.name !== cleanName)
        const updated = [historyItem, ...filtered].slice(0, 15) // keep up to 15 datasets
        localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(updated))
        return updated
      })
    } catch (err) {
      console.warn('Failed to persist dataset to localStorage:', err)
    }
  }, [])

  // 4. Handle selecting a dataset from history
  const handleSelectFromHistory = useCallback(async (item) => {
    if (!item?.dataset) return
    setCurrentDataset(item.dataset)
    setDatasetLoaded(true)
    try {
      localStorage.setItem(STORAGE_ACTIVE_KEY, JSON.stringify(item.dataset))
      if (item.filename) {
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/data/select-history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: item.filename })
        }).catch(() => {})
      }
    } catch (e) {
      console.warn(e)
    }
  }, [])

  // 5. Handle deleting active dataset
  const handleDeleteDataset = useCallback(async () => {
    setCurrentDataset(null)
    setDatasetLoaded(false)
    try {
      localStorage.removeItem(STORAGE_ACTIVE_KEY)
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/data/clear`, {
        method: 'POST'
      }).catch(() => {})
    } catch (e) {
      console.warn(e)
    }
  }, [])

  // 6. Handle deleting a single history item
  const handleDeleteHistoryItem = useCallback((id) => {
    setDatasetHistory(prev => {
      const updated = prev.filter(item => item.id !== id)
      try {
        localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(updated))
      } catch (e) {}
      return updated
    })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-10 opacity-50">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/10 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-blue-400/10 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-purple-400/10 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>
      </div>

      <div className="relative z-10">
        <Header
          currentView={currentView}
          setCurrentView={setCurrentView}
          connectionStatus={connectionStatus}
          datasetLoaded={datasetLoaded}
          apiKeyConfigured={apiKeyConfigured}
        />

        <main className="container mx-auto px-4 py-6 md:py-8">
          {/* CRITICAL: Keep both views mounted in DOM with CSS block/hidden so tab shift NEVER resets dataset or chat */}
          <div className={currentView === 'assistant' ? 'block' : 'hidden'}>
            <AssistantUI 
              currentDataset={currentDataset} 
              onDatasetLoaded={handleDatasetLoaded}
              onNavigateToDashboard={() => setCurrentView('dashboard')}
            />
          </div>

          <div className={currentView === 'dashboard' ? 'block' : 'hidden'}>
            <DataDashboard
              currentDataset={currentDataset}
              datasetHistory={datasetHistory}
              onDatasetLoaded={handleDatasetLoaded}
              onSelectFromHistory={handleSelectFromHistory}
              onDeleteDataset={handleDeleteDataset}
              onDeleteHistoryItem={handleDeleteHistoryItem}
            />
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
