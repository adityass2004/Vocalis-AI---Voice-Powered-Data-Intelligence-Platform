import React from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff, Loader2 } from 'lucide-react'

const VoiceButton = ({ 
  isListening, 
  isTranscribing = false, 
  onToggle, 
  onClick, 
  disabled = false, 
  title = "Voice Input" 
}) => {
  const handleClick = onToggle || onClick
  const isDisabled = disabled || isTranscribing

  return (
    <motion.button
      type="button"
      whileHover={{ scale: isDisabled ? 1 : 1.05 }}
      whileTap={{ scale: isDisabled ? 1 : 0.95 }}
      onClick={handleClick}
      disabled={isDisabled}
      title={title}
      className={`relative p-4 rounded-full transition-all duration-300 shadow-xl flex-shrink-0 ${
        isListening
          ? 'bg-rose-500 shadow-rose-500/40 text-white'
          : isTranscribing
          ? 'bg-amber-600 shadow-amber-500/40 text-white cursor-wait'
          : isDisabled
          ? 'bg-slate-700 cursor-not-allowed opacity-50 text-slate-400'
          : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 shadow-cyan-500/25 text-white'
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
        isListening ? 'bg-rose-500/40' : isTranscribing ? 'bg-amber-500/30' : 'bg-cyan-500/30'
      }`} />

      <div className="relative z-10 flex items-center justify-center">
        {isTranscribing ? (
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        ) : isListening ? (
          <MicOff className="w-5 h-5 text-white animate-pulse" />
        ) : (
          <Mic className="w-5 h-5 text-white" />
        )}
      </div>
    </motion.button>
  )
}

export default VoiceButton
