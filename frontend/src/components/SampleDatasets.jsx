import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Database } from 'lucide-react'

const sampleFiles = [
  {
    name: 'Sales Data',
    file: 'sales_data.csv',
    description: 'Sample sales transactions with products, revenue, and discounts.'
  },
  {
    name: 'Employee Data',
    file: 'employee_data.csv',
    description: 'Employee records with department, salary, and performance.'
  },
  {
    name: 'Web Traffic Data',
    file: 'web_traffic_data.csv',
    description: 'Website analytics including visitors, bounce rate, and conversions.'
  }
]

const SampleDatasets = ({ onSampleUpload }) => {
  const [loadingFile, setLoadingFile] = useState(null)

  const loadSampleDataset = async (sample) => {
    setLoadingFile(sample.file)

    try {

      const response = await fetch(`/sample_datasets/${sample.file}`)

      if (!response.ok) {
        throw new Error(`Failed to load ${sample.file}`)
      }

      const csvText = await response.text()

      const blob = new Blob([csvText], { type: 'text/csv' })
      const file = new File([blob], sample.file, { type: 'text/csv' })

      const formData = new FormData()
      formData.append('file', file)

      const uploadResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/data/upload`, {
        method: 'POST',
        body: formData
      })

      const data = await uploadResponse.json()

      if (data.success) {

        onSampleUpload(data)
      } else {
        throw new Error(data.error || 'Upload failed')
      }

    } catch (error) {
      console.error('Sample upload error:', error)
      alert(`Failed to load ${sample.name}. Please try again.`)
    } finally {
      setLoadingFile(null)
    }
  }

  return (
    <div className="mt-10">
      <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Database className="w-4 h-4 text-cyan-400" />
        Or explore pre-loaded demo datasets
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sampleFiles.map((sample) => (
          <motion.button
            key={sample.file}
            onClick={() => loadSampleDataset(sample)}
            disabled={loadingFile === sample.file}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative text-left glass-card p-4 rounded-xl border border-white/10 hover:border-indigo-500/40 hover:bg-slate-800/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors">{sample.name}</div>
              {loadingFile === sample.file ? (
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              ) : (
                <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-cyan-500/20 group-hover:text-cyan-300 transition-colors">
                  <Database className="w-4 h-4" />
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs leading-relaxed mb-3">{sample.description}</p>
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900/60 text-slate-400 border border-slate-700/50">
              {sample.file}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

export default SampleDatasets
