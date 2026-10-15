import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Database } from 'lucide-react'

const sampleData = {
  'sales_data.csv': `Product,Category,Revenue,Units_Sold,Discount,Region,Month
Laptop Pro,Electronics,1299.99,45,5,North,January
Wireless Mouse,Electronics,29.99,230,10,South,January
Office Chair,Furniture,449.99,67,15,East,February
Desk Lamp,Lighting,79.99,120,0,West,February
Mechanical Keyboard,Electronics,149.99,89,8,North,March
Standing Desk,Furniture,599.99,34,20,South,March
Monitor 27in,Electronics,399.99,56,12,East,April
Webcam HD,Electronics,89.99,145,5,West,April
Filing Cabinet,Furniture,199.99,23,0,North,May
LED Panel,Lighting,129.99,78,10,South,May
Tablet Pro,Electronics,799.99,62,7,East,June
Bookshelf,Furniture,249.99,41,15,West,June`,

  'employee_data.csv': `Name,Department,Salary,Performance_Score,Years_Experience,Age,City
Alice Johnson,Engineering,95000,4.5,8,32,San Francisco
Bob Smith,Marketing,72000,3.8,5,28,New York
Carol Williams,Engineering,105000,4.8,12,38,Seattle
David Brown,Sales,68000,3.5,3,25,Chicago
Eve Davis,Engineering,98000,4.2,7,30,San Francisco
Frank Miller,Marketing,78000,4.0,6,33,New York
Grace Wilson,Sales,71000,3.9,4,27,Chicago
Henry Taylor,Engineering,112000,4.9,15,42,Seattle
Ivy Anderson,Marketing,65000,3.2,2,24,New York
Jack Thomas,Sales,82000,4.3,9,35,Chicago`,

  'web_traffic_data.csv': `Date,Page,Visitors,Bounce_Rate,Avg_Session_Duration,Conversions,Source
2024-01-01,Homepage,1245,35.2,4.5,23,Organic
2024-01-01,Products,890,42.1,3.2,15,Paid
2024-01-02,Homepage,1320,33.8,4.8,28,Organic
2024-01-02,Blog,567,28.5,6.1,8,Social
2024-01-03,Homepage,1189,36.7,4.2,21,Organic
2024-01-03,Products,945,40.3,3.5,18,Paid
2024-01-04,Blog,623,26.9,6.5,10,Social
2024-01-04,Homepage,1402,32.1,5.0,31,Organic
2024-01-05,Products,1078,38.9,3.8,22,Paid
2024-01-05,Blog,712,25.4,7.2,12,Social`
}

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
      const csvText = sampleData[sample.file]
      if (!csvText) {
        throw new Error(`Sample data not found for ${sample.file}`)
      }

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

