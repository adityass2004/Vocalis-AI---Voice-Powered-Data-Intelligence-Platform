import React from 'react'
import { motion } from 'framer-motion'
import { Loader2, Mic, Volume2, Brain } from 'lucide-react'

const StatusVisualizer = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'listening':
        return {
          icon: <Mic className="w-8 h-8 text-white" />,
          text: 'Listening...',
          color: 'border-red-400',
          bgColor: 'bg-red-500/20',
          animation: 'pulse'
        }
      case 'processing':
        return {
          icon: <Loader2 className="w-8 h-8 text-white animate-spin" />,
          text: 'Processing...',
          color: 'border-yellow-400',
          bgColor: 'bg-yellow-500/20',
          animation: 'bounce'
        }
      case 'speaking':
        return {
          icon: <Volume2 className="w-8 h-8 text-white" />,
          text: 'Speaking...',
          color: 'border-blue-400',
          bgColor: 'bg-blue-500/20',
          animation: 'pulse'
        }
      default:
        return {
          icon: <Brain className="w-8 h-8 text-white" />,
          text: 'Ready to chat',
          color: 'border-primary',
          bgColor: 'bg-primary/20',
          animation: 'none'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className="flex justify-center mb-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >

        <div className="relative inline-flex">
          <motion.div
            className={`w-20 h-20 rounded-full border-2 ${config.color} ${config.bgColor} flex items-center justify-center backdrop-blur-sm`}
            animate={config.animation === 'pulse' ? {
              scale: [1, 1.05, 1],
              boxShadow: [
                '0 0 0 0 rgba(var(--primary-rgb), 0.4)',
                '0 0 0 10px rgba(var(--primary-rgb), 0)',
                '0 0 0 0 rgba(var(--primary-rgb), 0)'
              ]
            } : config.animation === 'bounce' ? {
              y: [0, -5, 0]
            } : {}}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {config.icon}
          </motion.div>

          {status === 'listening' && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-red-400/50"
                animate={{
                  scale: [1, 1.5],
                  opacity: [0.5, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-red-400/30"
                animate={{
                  scale: [1, 2],
                  opacity: [0.3, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: 0.5,
                  ease: "easeOut"
                }}
              />
            </>
          )}
        </div>

        <motion.p
          key={status}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-gray-300 font-medium"
        >
          {config.text}
        </motion.p>

        {status === 'processing' && (
          <div className="flex justify-center space-x-1 mt-2">
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                className="w-2 h-2 bg-yellow-400 rounded-full"
                animate={{
                  y: [0, -8, 0],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: index * 0.2
                }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default StatusVisualizer
