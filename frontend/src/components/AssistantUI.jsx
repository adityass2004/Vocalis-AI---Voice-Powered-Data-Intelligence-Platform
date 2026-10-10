import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Send, Volume2, VolumeX, Loader2, Pause, Play, StopCircle, Sparkles, Cpu, Bot } from 'lucide-react'
import VoiceButton from './VoiceButton'
import ChatHistory from './ChatHistory'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useTextToSpeech } from '../hooks/useTextToSpeech'

const AssistantUI = ({ currentDataset }) => {
  const genId = () => (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const [messages, setMessages] = useState([
    {
      id: genId(),
      type: 'assistant',
      content: "Hello! I'm Vocalis, your AI data intelligence assistant. Ask me questions about your dataset using voice or text, and I'll generate instant analysis, insights, and statistical trends.",
      timestamp: new Date().toISOString()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [assistantStatus, setAssistantStatus] = useState('ready')
  const [isTTSEnabled, setIsTTSEnabled] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const lastAnnouncedDatasetKey = useRef(null)
  
  const chatContainerRef = useRef(null)
  const inputRef = useRef(null)

  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript 
  } = useSpeechRecognition()

  const { speak, isSpeaking, stopSpeaking, pauseSpeaking, resumeSpeaking } = useTextToSpeech()

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (currentDataset && currentDataset.success) {
      const rows = currentDataset.shape?.[0] || currentDataset.total_rows
      const cols = currentDataset.shape?.[1] || currentDataset.total_columns
      const key = `${rows}|${cols}|${currentDataset.brief_summary || ''}`

      if (lastAnnouncedDatasetKey.current === key) return

      let content = `Dataset loaded successfully! `
      if (currentDataset.brief_summary) {
        content += `${currentDataset.brief_summary}. `
      }
      content += `Contains ${rows} records and ${cols} columns.`
      content += "\n\nAsk me about specific variables, correlations, statistical distributions, or trends."

      const datasetInfo = {
        id: genId(),
        type: 'assistant',
        content,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, datasetInfo])
      lastAnnouncedDatasetKey.current = key
    } else if (!currentDataset) {
      lastAnnouncedDatasetKey.current = null
    }
  }, [currentDataset])

  useEffect(() => {
    if (transcript && !isLoading) {
      setInputText(transcript)
    }
  }, [transcript, isLoading])

  useEffect(() => {
    if (isLoading) {
      setAssistantStatus('processing')
    } else if (isListening) {
      setAssistantStatus('listening')
    } else if (isSpeaking && isPaused) {
      setAssistantStatus('paused')
    } else if (isSpeaking) {
      setAssistantStatus('speaking')
    } else {
      setAssistantStatus('ready')
    }
  }, [isListening, isLoading, isSpeaking, isPaused])

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return

    stopSpeaking()
    if (isListening) {
      stopListening()
    }
    setIsPaused(false)

    const userMessage = {
      id: genId(),
      type: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)
    resetTranscript()

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages.slice(-10),
          timestamp: userMessage.timestamp,
          dataContext: currentDataset
        })
      })

      const data = await response.json()

      if (data.success) {
        const assistantMessage = {
          id: genId(),
          type: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString()
        }

        setMessages(prev => [...prev, assistantMessage])

        if (isTTSEnabled && !isMuted) {
          stopSpeaking()
          speak(data.response)
        }
      } else {
        throw new Error(data.error || 'Failed to get response')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage = {
        id: genId(),
        type: 'assistant',
        content: "I'm having trouble connecting to the intelligence server right now. Please verify your backend connection.",
        timestamp: new Date().toISOString(),
        isError: true
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [inputText])

  const clearChat = () => {
    setMessages([{
      id: genId(),
      type: 'assistant',
      content: "Chat cleared! How can I assist with your data analysis?",
      timestamp: new Date().toISOString()
    }])
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-0 md:px-2">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Natural Voice & Conversational Intelligence
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-white font-outfit tracking-tight">
          Vocalis AI <span className="text-gradient-cyan">Assistant</span>
        </h2>
        <p className="text-slate-400 text-sm mt-1 max-w-lg mx-auto">Voice-interactive data exploration powered by Gemini Flash models</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center mb-6"
      >
        <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-full shadow-lg">
          <motion.div
            className={`w-9 h-9 rounded-full border-2 flex items-center justify-center ${
              assistantStatus === 'ready' ? 'border-indigo-500 text-indigo-400' : 
              assistantStatus === 'listening' ? 'border-rose-500 text-rose-400' :
              assistantStatus === 'processing' ? 'border-amber-400 text-amber-400' :
              'border-cyan-400 text-cyan-400'
            }`}
            animate={assistantStatus !== 'ready' && assistantStatus !== 'paused' ? { 
              scale: [1, 1.1, 1],
              borderColor: assistantStatus === 'listening' ? ['#f43f5e', '#e11d48', '#f43f5e'] :
                          assistantStatus === 'processing' ? ['#fbbf24', '#d97706', '#fbbf24'] :
                          ['#22d3ee', '#0284c7', '#22d3ee']
            } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Bot className="w-4 h-4" />
          </motion.div>
          <span className="text-xs font-semibold text-slate-300">
            {assistantStatus === 'ready' && 'Ready for Voice or Text'}
            {assistantStatus === 'listening' && 'Listening to speech...'}
            {assistantStatus === 'processing' && 'Analyzing data context...'}
            {assistantStatus === 'speaking' && 'Speaking answer...'}
            {assistantStatus === 'paused' && 'Audio Paused'}
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-2xl p-4 md:p-6 mb-6 min-h-[55vh] max-h-[70vh] flex flex-col border border-slate-800 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-300">Vocalis Core Intelligence</span>
          </div>
          <button
            onClick={clearChat}
            className="text-xs font-medium text-slate-400 hover:text-white transition-colors px-2.5 py-1 rounded-lg hover:bg-slate-800/80 border border-transparent hover:border-slate-700"
          >
            Clear History
          </button>
        </div>

        <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-4 mb-3 pr-1">
          <ChatHistory messages={messages} isLoading={isLoading} />
        </div>

        <div className="flex items-center gap-2 md:gap-3 sticky bottom-0 pt-2 bg-transparent">
          <VoiceButton
            isListening={isListening}
            onClick={handleVoiceToggle}
            disabled={isLoading}
          />
          
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your dataset or talk..."
              className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all min-h-[44px] max-h-[160px] overflow-auto"
              rows={1}
              disabled={isLoading}
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={sendMessage}
            disabled={!inputText.trim() || isLoading}
            className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white p-3 rounded-xl shadow-lg transition-all"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </motion.button>

          <div className="hidden sm:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => { setIsMuted(!isMuted); stopSpeaking() }}
              className={`p-2 rounded-lg transition-all ${isMuted ? 'text-slate-500' : 'text-cyan-400'}`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => { pauseSpeaking(); setIsPaused(true) }}
              className={`p-2 rounded-lg transition-all ${isSpeaking && !isPaused ? 'text-indigo-400' : 'text-slate-600'}`}
              disabled={!isSpeaking || isPaused}
              title="Pause"
            >
              <Pause className="w-4 h-4" />
            </button>
            <button
              onClick={() => { resumeSpeaking(); setIsPaused(false) }}
              className={`p-2 rounded-lg transition-all ${isSpeaking && isPaused ? 'text-indigo-400' : 'text-slate-600'}`}
              disabled={!isSpeaking || !isPaused}
              title="Resume"
            >
              <Play className="w-4 h-4" />
            </button>
            <button
              onClick={() => { stopSpeaking(); setIsPaused(false) }}
              className="p-2 rounded-lg transition-all text-slate-500 hover:text-slate-300"
              disabled={!isSpeaking}
              title="Stop"
            >
              <StopCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default AssistantUI
