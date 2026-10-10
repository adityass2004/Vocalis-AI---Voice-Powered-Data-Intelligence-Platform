import React from 'react'
import { motion } from 'framer-motion'
import { Wifi, WifiOff, Database, MessageSquare } from 'lucide-react'

const StatusBar = ({ connectionStatus, datasetLoaded, currentView }) => {
  const statusItems = [
    {
      icon: connectionStatus === 'connected' ? Wifi : WifiOff,
      text: connectionStatus === 'connected' ? 'AI System Active' : 'Offline',
      color: connectionStatus === 'connected' ? 'text-emerald-400' : 'text-rose-400',
      bg: connectionStatus === 'connected' ? 'bg-emerald-500/20' : 'bg-rose-500/20'
    },
    {
      icon: Database,
      text: datasetLoaded ? 'Dataset Loaded' : 'No Dataset',
      color: datasetLoaded ? 'text-cyan-400' : 'text-slate-500',
      bg: datasetLoaded ? 'bg-cyan-500/20' : 'bg-slate-800'
    },
    {
      icon: MessageSquare,
      text: `${currentView === 'assistant' ? 'Voice AI' : 'Data Analytics'} Mode`,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/20'
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
    >
      <div className="pointer-events-auto glass-card rounded-full px-5 py-2.5 flex items-center space-x-5 border border-white/10 shadow-2xl backdrop-blur-xl bg-slate-950/80">
        {statusItems.map((item, index) => {
          const Icon = item.icon
          return (
            <div key={index} className="flex items-center space-x-2">
              <span className={`p-1 rounded-full ${item.bg}`}>
                <Icon className={`w-3.5 h-3.5 ${item.color}`} />
              </span>
              <span className={`text-xs font-medium font-mono ${item.color}`}>{item.text}</span>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

export default StatusBar
