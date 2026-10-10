import React from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff } from 'lucide-react'

const VoiceButton = ({ isListening, onClick, disabled = false }) => {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className={`relative p-4 rounded-full transition-all duration-300 shadow-xl ${
        isListening
          ? 'bg-rose-500 shadow-rose-500/40'
          : disabled
          ? 'bg-slate-700 cursor-not-allowed opacity-50'
          : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 shadow-cyan-500/25'
      }`}
    >
      {isListening && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-rose-400"
          animate={{
            scale: [1, 1.6, 1],
            opacity: [0.8, 0, 0.8]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      <div className={`absolute inset-0 rounded-full blur-xl transition-all ${
        isListening ? 'bg-rose-500/40' : 'bg-cyan-500/30'
      }`} />

      <div className="relative z-10 flex items-center justify-center">
        {isListening ? (
          <MicOff className="w-5 h-5 text-white animate-pulse" />
        ) : (
          <Mic className="w-5 h-5 text-white" />
        )}
      </div>
    </motion.button>
  )
}

export default VoiceButton
