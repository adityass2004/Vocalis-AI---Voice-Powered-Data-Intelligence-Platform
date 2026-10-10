import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, MessageSquare, Database, Wifi, WifiOff, AlertTriangle, Sparkles, Cpu, Settings, Key, Check, X, Loader2 } from 'lucide-react'

const Header = ({ currentView, setCurrentView, connectionStatus, datasetLoaded, apiKeyConfigured }) => {
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveResult, setSaveResult] = useState(null)

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return
    setIsSaving(true)
    setSaveResult(null)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ai/set-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey.trim() })
      })
      const data = await response.json()
      if (data.success) {
        setSaveResult({ type: 'success', message: 'API key saved successfully!' })
        setApiKey('')
        setTimeout(() => { setSaveResult(null); setShowSettings(false) }, 1500)
      } else {
        setSaveResult({ type: 'error', message: data.error || 'Failed to save API key' })
      }
    } catch (error) {
      setSaveResult({ type: 'error', message: 'Cannot connect to backend. Is it running?' })
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-emerald-400" />
      case 'connecting':
        return <Activity className="w-4 h-4 text-amber-400 animate-pulse" />
      case 'error':
        return <WifiOff className="w-4 h-4 text-rose-400" />
      default:
        return <AlertTriangle className="w-4 h-4 text-slate-400" />
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Online'
      case 'connecting':
        return 'Connecting...'
      case 'error':
        return 'Offline'
      default:
        return 'Standby'
    }
  }

  return (
    <header className="glass border-b border-indigo-500/10 sticky top-0 z-50 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <motion.div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => setCurrentView('assistant')}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative">
              <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 via-cyan-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Cpu className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-cyan-400 rounded-full animate-ping opacity-75"></div>
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-cyan-400 rounded-full"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold font-outfit tracking-tight text-white">Vocalis</h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" /> AI
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Voice Data Intelligence</p>
            </div>
          </motion.div>

          <motion.div
            className="flex items-center space-x-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <button
              onClick={() => setCurrentView('assistant')}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-all duration-300 ${
                currentView === 'assistant'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Voice Assistant</span>
            </button>
            <button
              onClick={() => setCurrentView('data')}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-all duration-300 ${
                currentView === 'data'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Data Explorer</span>
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="hidden md:flex items-center gap-2"
          >
            <div className="glass-card rounded-full px-4 py-1.5 flex items-center gap-4 text-xs font-medium border border-slate-700/50">
              <div className="flex items-center gap-1.5">
                {getStatusIcon()}
                <span className={
                  connectionStatus === 'connected' ? 'text-emerald-400' :
                  connectionStatus === 'connecting' ? 'text-amber-400' :
                  'text-rose-400'
                }>{getStatusText()}</span>
              </div>
              <div className="w-px h-3 bg-slate-700"></div>
              <div className="flex items-center gap-1.5">
                <Key className={`w-3.5 h-3.5 ${apiKeyConfigured ? 'text-emerald-400' : 'text-rose-400'}`} />
                <span className={apiKeyConfigured ? 'text-emerald-300' : 'text-rose-300'}>
                  {apiKeyConfigured ? 'API Key Set' : 'No API Key'}
                </span>
              </div>
              <div className="w-px h-3 bg-slate-700"></div>
              <div className="flex items-center gap-1.5">
                <Database className={`w-3.5 h-3.5 ${datasetLoaded ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span className={datasetLoaded ? 'text-cyan-300' : 'text-slate-400'}>
                  {datasetLoaded ? 'Dataset Loaded' : 'No Data'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowSettings(true)}
              className={`p-2.5 rounded-xl transition-all border ${
                apiKeyConfigured
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800/80 border-transparent hover:border-slate-700'
                  : 'text-amber-400 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 animate-pulse'
              }`}
              title="Settings — Configure API Key"
            >
              <Settings className="w-4 h-4" />
            </button>
          </motion.div>

          <div className="md:hidden flex items-center gap-2">
            {getStatusIcon()}
            <div className={`w-2.5 h-2.5 rounded-full ${datasetLoaded ? 'bg-cyan-400' : 'bg-slate-600'}`}></div>
            <button
              onClick={() => setShowSettings(true)}
              className={`p-2 rounded-lg transition-all ${
                apiKeyConfigured
                  ? 'text-slate-400 hover:text-white'
                  : 'text-amber-400 animate-pulse'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md glass-card rounded-2xl p-6 border border-slate-700/80 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <Key className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white font-outfit">API Configuration</h3>
                    <p className="text-xs text-slate-400">Set your Gemini API key to enable AI features</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Gemini API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveApiKey() }}
                    placeholder="Paste your Gemini API key here..."
                    className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Get your API key from{' '}
                    <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">
                      Google AI Studio
                    </a>
                  </p>
                </div>

                {saveResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border ${
                      saveResult.type === 'success'
                        ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
                        : 'text-rose-300 bg-rose-500/10 border-rose-500/20'
                    }`}
                  >
                    {saveResult.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    {saveResult.message}
                  </motion.div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveApiKey}
                  disabled={!apiKey.trim() || isSaving}
                  className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4" />
                  )}
                  {isSaving ? 'Saving...' : 'Save API Key'}
                </motion.button>

                <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                  <div className={`w-2 h-2 rounded-full ${apiKeyConfigured ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                  {apiKeyConfigured
                    ? 'API key is currently configured and active'
                    : 'No API key configured — AI features are disabled'
                  }
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

export default Header

