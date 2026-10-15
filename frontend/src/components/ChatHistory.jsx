import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, User, Clock, Loader2 } from 'lucide-react'

const ChatHistory = ({ messages, isLoading }) => {
  return (
    <AnimatePresence>
      {messages.map((message) => (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div className={`flex items-start space-x-3 max-w-xs lg:max-w-md ${
            message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
          }`}>

            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              message.type === 'user'
                ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                : message.isError
                ? 'bg-red-500'
                : 'bg-gradient-to-br from-primary to-green-400'
            }`}>
              {message.type === 'user' ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>

            <div className={`relative px-4 py-3 rounded-2xl ${
              message.type === 'user'
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                : message.isError
                ? 'bg-red-500/20 border border-red-500/30 text-red-200'
                : 'bg-slate-700/50 border border-white/10 text-white'
            }`}>

              <div className="flex items-center justify-between mb-2">
                <div className="flex space-x-1">
                  {!message.isError && message.type === 'assistant' && (
                    <>
                      <span className="text-yellow-400 text-sm">👍</span>
                      <span className="text-yellow-400 text-sm">👎</span>
                      <span className="text-yellow-400 text-sm">📊</span>
                    </>
                  )}
                </div>
              </div>

              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>

              <div className={`flex items-center mt-2 pt-2 border-t ${
                message.type === 'user'
                  ? 'border-blue-400/20'
                  : message.isError
                  ? 'border-red-400/20'
                  : 'border-white/10'
              }`}>
                <Clock className="w-3 h-3 mr-1 opacity-50" />
                <span className="text-xs opacity-70">
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                {message.type === 'assistant' && !message.isError && (
                  <div className="w-2 h-2 bg-primary rounded-full ml-2"></div>
                )}
              </div>

              <div className={`absolute top-4 w-3 h-3 transform rotate-45 ${
                message.type === 'user'
                  ? 'right-[-6px] bg-blue-600'
                  : 'left-[-6px] bg-slate-700/50 border-l border-t border-white/10'
              }`} />
            </div>
          </div>
        </motion.div>
      ))}

      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-start"
        >
          <div className="flex items-start space-x-3 max-w-xs lg:max-w-md">
            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-primary to-green-400 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-slate-700/50 border border-white/10 px-4 py-3 rounded-2xl">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span className="text-sm text-gray-300">Nova is thinking...</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ChatHistory
