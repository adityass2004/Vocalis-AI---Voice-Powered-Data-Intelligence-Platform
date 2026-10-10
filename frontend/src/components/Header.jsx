import React from 'react'
import { motion } from 'framer-motion'
import { Activity, MessageSquare, Database, Wifi, WifiOff, AlertTriangle, Sparkles, Cpu } from 'lucide-react'

const Header = ({ currentView, setCurrentView, connectionStatus, datasetLoaded }) => {
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
            className="hidden md:flex items-center"
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
                <Database className={`w-3.5 h-3.5 ${datasetLoaded ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span className={datasetLoaded ? 'text-cyan-300' : 'text-slate-400'}>
                  {datasetLoaded ? 'Dataset Loaded' : 'No Data'}
                </span>
              </div>
            </div>
          </motion.div>

          <div className="md:hidden flex items-center gap-2">
            {getStatusIcon()}
            <div className={`w-2.5 h-2.5 rounded-full ${datasetLoaded ? 'bg-cyan-400' : 'bg-slate-600'}`}></div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
