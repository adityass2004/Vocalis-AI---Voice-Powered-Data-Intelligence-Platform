import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Mic, Send, Volume2, VolumeX, Loader2, Pause, Play, StopCircle, 
  Sparkles, Cpu, Bot, Globe, CheckCircle2, ShieldCheck, Languages,
  Zap, Compass, SlidersHorizontal, Upload, Paperclip, FileText, PlusCircle
} from 'lucide-react'
import VoiceButton from './VoiceButton'
import ChatHistory from './ChatHistory'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useTextToSpeech } from '../hooks/useTextToSpeech'

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English (US / Global)' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'zh', name: 'Chinese (Mandarin / 中文)' },
  { code: 'it', name: 'Italian (Italiano)' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'ko', name: 'Korean (한국어)' }
]

const TRANSCRIBER_MODELS = [
  { id: 'turbo', name: 'Whisper Large-V3 Turbo', desc: 'Flagship State-of-the-Art (Maximum Accuracy)', badge: 'SOTA' },
  { id: 'small', name: 'Whisper Small', desc: 'High-Precision Deep Vocabulary', badge: 'Accurate' },
  { id: 'base', name: 'Whisper Base', desc: 'Fast & Multilingual (Balanced)', badge: 'Balanced' },
  { id: 'tiny', name: 'Whisper Tiny', desc: 'Ultra-Low Latency', badge: 'Fastest' }
]

const AssistantUI = ({ currentDataset, onDatasetLoaded, onNavigateToDashboard }) => {
  const genId = () => (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const [messages, setMessages] = useState([
    {
      id: genId(),
      type: 'assistant',
      content: "Hello! I'm Vocalis, your AI data intelligence assistant powered by Google Gemini 2.5 Pro and OpenAI Whisper Large-V3 Turbo on local CUDA. All speech recognition and neural voice synthesis run 100% locally on your machine. You can upload any dataset using the '+ Add Dataset' button below, or speak in any language to begin analysis.",
      language: 'en',
      audioUrl: null,
      timestamp: new Date().toISOString()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingData, setIsUploadingData] = useState(false)
  const [assistantStatus, setAssistantStatus] = useState('ready')
  const [isTTSEnabled, setIsTTSEnabled] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [transcriberModel, setTranscriberModel] = useState('turbo')
  const [sttTask, setSttTask] = useState('transcribe') // 'transcribe' or 'translate'
  const [activeAudioId, setActiveAudioId] = useState(null)
  const lastAnnouncedDatasetKey = useRef(null)
  const preprocessedIdsRef = useRef(new Set())
  
  const chatContainerRef = useRef(null)
  const inputRef = useRef(null)
  const chatFileInputRef = useRef(null)

  const { 
    isListening, 
    isTranscribing,
    transcript, 
    interimTranscript,
    detectedLanguage,
    usedModel,
    error: speechError,
    startListening, 
    stopListening, 
    resetTranscript 
  } = useSpeechRecognition()

  const { 
    speak, 
    isSpeaking, 
    stopSpeaking, 
    pauseSpeaking, 
    resumeSpeaking, 
    preloadAudio, 
    synthesizeAudio 
  } = useTextToSpeech()

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  // Pre-synthesize any messages that don't have an audioUrl yet so they are always ready to play immediately
  useEffect(() => {
    messages.forEach((msg) => {
      if (
        msg.type === 'assistant' && 
        !msg.audioUrl && 
        !msg.isError && 
        msg.content && 
        !preprocessedIdsRef.current.has(msg.id)
      ) {
        preprocessedIdsRef.current.add(msg.id)
        const targetLang = msg.language || selectedLanguage || 'en'
        synthesizeAudio(msg.content, { lang: targetLang })
          .then((url) => {
            if (url) {
              setMessages((prev) =>
                prev.map((m) => (m.id === msg.id ? { ...m, audioUrl: url } : m))
              )
            }
          })
          .catch(() => {})
      }
    })
  }, [messages, selectedLanguage, synthesizeAudio])

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
      content += "\n\nAsk me about specific variables, correlations, statistical distributions, or trends in your selected language."

      const datasetInfo = {
        id: genId(),
        type: 'assistant',
        content,
        language: selectedLanguage,
        audioUrl: null,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, datasetInfo])
      lastAnnouncedDatasetKey.current = key
    } else if (!currentDataset) {
      lastAnnouncedDatasetKey.current = null
    }
  }, [currentDataset, selectedLanguage])

  useEffect(() => {
    if (transcript && !isLoading) {
      setInputText(transcript)
    }
  }, [transcript, isLoading])

  useEffect(() => {
    if (isLoading) {
      setAssistantStatus('processing')
    } else if (isTranscribing) {
      setAssistantStatus('transcribing')
    } else if (isListening) {
      setAssistantStatus('listening')
    } else if (isSpeaking && isPaused) {
      setAssistantStatus('paused')
    } else if (isSpeaking) {
      setAssistantStatus('speaking')
    } else {
      setAssistantStatus('ready')
    }
  }, [isListening, isTranscribing, isLoading, isSpeaking, isPaused])

  // Direct Data Adder in AI Chat
  const handleChatFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (e.target) e.target.value = ''

    setIsUploadingData(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/data/upload`, {
        method: 'POST',
        body: formData
      })
      const data = await response.json()

      if (data.success) {
        if (onDatasetLoaded) {
          onDatasetLoaded(data)
        }
        const cleanName = file.name.replace(/^[a-f0-9]{8}_/, '')
        const rows = data.shape?.[0] || data.total_rows || 0
        const cols = data.shape?.[1] || data.total_columns || 0

        const confirmMsg = {
          id: genId(),
          type: 'assistant',
          content: `📁 **Dataset Attached**: \`${cleanName}\` loaded successfully (${rows} records, ${cols} columns)!\n\nI have parsed all variables, correlations, and KPIs. You can now ask questions about this dataset in voice or text!`,
          language: selectedLanguage,
          audioUrl: null,
          timestamp: new Date().toISOString()
        }
        setMessages(prev => [...prev, confirmMsg])
      } else {
        alert(data.error || 'Failed to upload dataset')
      }
    } catch (err) {
      console.error('Chat data upload error:', err)
      alert('Error uploading dataset: ' + err.message)
    } finally {
      setIsUploadingData(false)
    }
  }

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
      detectedLanguage: detectedLanguage || selectedLanguage,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)
    resetTranscript()

    try {
      const targetLang = selectedLanguage || 'en'
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages.slice(-10),
          language: targetLang,
          generate_audio: true, // Pre-generate speech immediately on backend
          timestamp: userMessage.timestamp,
          dataContext: currentDataset
        })
      })

      const data = await response.json()

      if (data.success) {
        const assistantMessageId = genId()
        const assistantMessage = {
          id: assistantMessageId,
          type: 'assistant',
          content: data.response,
          language: targetLang,
          audioUrl: data.audio_url || null,
          timestamp: new Date().toISOString()
        }

        if (data.audio_url) {
          preloadAudio(data.audio_url)
        }

        setMessages(prev => [...prev, assistantMessage])

        // If voice auto-play is turned on, play the already synthesized audio immediately
        if (isTTSEnabled && !isMuted) {
          stopSpeaking()
          setActiveAudioId(assistantMessageId)
          speak(data.response, { lang: targetLang, audioUrl: data.audio_url })
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
      startListening(selectedLanguage, sttTask, transcriberModel)
    }
  }

  const handleSpeakMessage = (content, lang, msgId, audioUrl) => {
    if (activeAudioId === msgId && isSpeaking) {
      stopSpeaking()
      setActiveAudioId(null)
    } else {
      stopSpeaking()
      setActiveAudioId(msgId)
      // Plays immediately with 0 delay because audioUrl is already preprocessed
      speak(content, { lang: lang || selectedLanguage || 'en', audioUrl })
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
    stopSpeaking()
    setActiveAudioId(null)
    setMessages([{
      id: genId(),
      type: 'assistant',
      content: "Chat cleared! How can I assist with your data analysis?",
      language: selectedLanguage,
      audioUrl: null,
      timestamp: new Date().toISOString()
    }])
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-0 md:px-2">
      {/* Hidden file input for direct chat data upload */}
      <input
        ref={chatFileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.pdf,.tsv,.html,.htm,.txt"
        onChange={handleChatFileUpload}
        className="hidden"
      />

      {/* Top Multilingual, Model & Data Adder Control Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 glass-card rounded-2xl border border-slate-800"
      >
        <div className="flex items-center space-x-3">
          <motion.div 
            className={`w-8 h-8 rounded-full flex items-center justify-center border ${
              assistantStatus === 'ready' ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' :
              assistantStatus === 'listening' ? 'border-red-500 text-red-400 bg-red-500/10 animate-pulse' :
              assistantStatus === 'transcribing' ? 'border-amber-500 text-amber-400 bg-amber-500/10 animate-spin' :
              assistantStatus === 'processing' ? 'border-indigo-400 text-indigo-400 bg-indigo-500/10 animate-spin' :
              assistantStatus === 'speaking' ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10 animate-pulse' :
              'border-cyan-400 text-cyan-400 bg-cyan-500/10'
            }`}
          >
            <Bot className="w-4 h-4" />
          </motion.div>
          <div>
            <span className="text-xs font-semibold text-slate-200 block">
              {assistantStatus === 'ready' && 'Ready • Local Voice & Gemini 2.5 Pro'}
              {assistantStatus === 'listening' && (
                <span className="text-rose-400 inline-flex items-center gap-1.5 font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                  Live Transcribing ({sttTask === 'translate' ? 'Translating to EN' : 'Speaking'})...
                </span>
              )}
              {assistantStatus === 'transcribing' && `Refining with Whisper ${transcriberModel.toUpperCase()} (CUDA)...`}
              {assistantStatus === 'processing' && 'Generating & Pre-Synthesizing Voice...'}
              {assistantStatus === 'speaking' && 'Speaking in Target Language...'}
              {assistantStatus === 'paused' && 'Voice Paused'}
            </span>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3 h-3" /> 100% Local Voice • Zero External Voice APIs
              </span>
            </div>
          </div>
        </div>

        {/* Controls: Data Adder, Model, Task, Output Language, Auto-play */}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {/* DATA ADDER BUTTON IN CHAT HEADER */}
          <button
            onClick={() => chatFileInputRef.current?.click()}
            disabled={isUploadingData}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-indigo-500/20"
            title="Upload and analyze a dataset directly in this chat"
          >
            {isUploadingData ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <PlusCircle className="w-3.5 h-3.5" />
            )}
            <span>+ Add Dataset</span>
          </button>

          {/* Transcriber Model Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-200">
            <Cpu className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <span className="text-slate-400 text-[11px] hidden sm:inline">Transcriber:</span>
            <select
              value={transcriberModel}
              onChange={(e) => setTranscriberModel(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer pr-1 font-medium"
              title="Select local Whisper model tier"
            >
              {TRANSCRIBER_MODELS.map(m => (
                <option key={m.id} value={m.id} className="bg-slate-900 text-slate-100">
                  {m.name} ({m.badge})
                </option>
              ))}
            </select>
          </div>

          {/* STT Task: Transcribe vs Translate */}
          <button
            onClick={() => setSttTask(sttTask === 'transcribe' ? 'translate' : 'transcribe')}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all ${
              sttTask === 'translate'
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Toggle between transcribing spoken language as-is or directly translating to English"
          >
            <Globe className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[11px]">
              {sttTask === 'translate' ? 'Translate to EN' : 'Transcribe Spoken'}
            </span>
          </button>

          {/* Output Language Selector (Strictly Enforced) */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-cyan-500/40 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 shadow-sm shadow-cyan-500/10">
            <Languages className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span className="text-cyan-300 text-[11px] font-semibold hidden sm:inline">Output:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-transparent text-slate-100 text-xs focus:outline-none cursor-pointer pr-1 font-medium"
              title="Target output language for text response and voice synthesis"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-100">
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* TTS Auto-play Toggle */}
          <button
            onClick={() => setIsTTSEnabled(!isTTSEnabled)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all ${
              isTTSEnabled 
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' 
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title={isTTSEnabled ? "Voice auto-play enabled" : "Voice auto-play muted"}
          >
            {isTTSEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isTTSEnabled ? 'Auto-Play' : 'Muted'}</span>
          </button>
        </div>
      </motion.div>

      {/* Main Chat Box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-2xl p-4 md:p-6 mb-6 min-h-[55vh] max-h-[70vh] flex flex-col border border-slate-800 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-300">Vocalis Multilingual Intelligence</span>
            {currentDataset && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                Active Data: {currentDataset.filename?.replace(/^[a-f0-9]{8}_/, '') || 'Loaded'}
              </span>
            )}
          </div>
          <button
            onClick={clearChat}
            className="text-xs font-medium text-slate-400 hover:text-white transition-colors px-2.5 py-1 rounded-lg hover:bg-slate-800/80 border border-transparent hover:border-slate-700"
          >
            Clear History
          </button>
        </div>

        {/* Messages */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-4 mb-3 pr-1">
          <ChatHistory 
            messages={messages} 
            isLoading={isLoading} 
            onSpeak={handleSpeakMessage}
            isSpeaking={isSpeaking}
            activeAudioId={activeAudioId}
          />
        </div>

        {/* Active Speech Bar */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-cyan-950/40 border border-cyan-800/40 mb-3"
            >
              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span className="text-xs text-cyan-200 font-medium">Neural Voice Playing (100% Volume Boosted)</span>
              </div>
              <div className="flex items-center space-x-1">
                {isPaused ? (
                  <button
                    onClick={() => { resumeSpeaking(); setIsPaused(false); }}
                    className="p-1 rounded text-cyan-300 hover:bg-cyan-900/50"
                    title="Resume"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => { pauseSpeaking(); setIsPaused(true); }}
                    className="p-1 rounded text-cyan-300 hover:bg-cyan-900/50"
                    title="Pause"
                  >
                    <Pause className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => { stopSpeaking(); setIsPaused(false); setActiveAudioId(null); }}
                  className="p-1 rounded text-red-400 hover:bg-red-950/50"
                  title="Stop"
                >
                  <StopCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Bar with Direct Data Adder Attachment Button */}
        <div className="relative pt-2 border-t border-slate-800/80">
          {speechError && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-2 p-2.5 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs flex items-center justify-between shadow-lg"
            >
              <div className="flex items-center space-x-2">
                <span className="text-sm">⚠️</span>
                <span>{speechError}</span>
              </div>
              <button
                type="button"
                onClick={resetTranscript}
                className="ml-3 px-2 py-0.5 rounded text-[11px] bg-rose-900/60 hover:bg-rose-800 text-rose-200 transition-colors"
              >
                Dismiss
              </button>
            </motion.div>
          )}

          {/* Live Transcription Real-time Waveform Preview Banner */}
          {isListening && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-2 p-3 rounded-2xl bg-slate-900/95 border border-cyan-500/40 text-cyan-200 text-xs shadow-xl shadow-cyan-950/40 backdrop-blur-md flex items-center justify-between gap-3"
            >
              <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                <div className="flex items-center space-x-0.5 px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 flex-shrink-0">
                  <span className="w-1.5 h-3 bg-rose-500 rounded-full animate-[pulse_0.6s_ease-in-out_infinite]" />
                  <span className="w-1.5 h-5 bg-rose-400 rounded-full animate-[pulse_0.4s_ease-in-out_infinite]" />
                  <span className="w-1.5 h-2.5 bg-rose-500 rounded-full animate-[pulse_0.7s_ease-in-out_infinite]" />
                  <span className="w-1.5 h-4 bg-rose-400 rounded-full animate-[pulse_0.5s_ease-in-out_infinite]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-rose-400">
                    <span>Live Transcribing</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-cyan-400 font-normal lowercase">{selectedLanguage}</span>
                  </div>
                  <p className="text-slate-100 font-mono text-xs truncate mt-0.5">
                    {transcript ? `"${transcript}"` : "Listening... Speak in any language..."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleVoiceToggle}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px] transition-all shadow-md shadow-rose-600/30 flex items-center gap-1 flex-shrink-0"
              >
                Done Speaking
              </button>
            </motion.div>
          )}

          {/* Whisper Refinement Banner */}
          {isTranscribing && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-2 p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-700/60 text-indigo-200 text-xs flex items-center justify-between shadow-lg"
            >
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Refining precision with Whisper {transcriberModel.toUpperCase()} on CUDA...</span>
              </div>
            </motion.div>
          )}

          <div className="flex items-end space-x-2">
            {/* Attachment Button for Quick Dataset Upload */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => chatFileInputRef.current?.click()}
              disabled={isLoading || isUploadingData}
              className="p-3 rounded-xl border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 transition-all flex items-center justify-center shadow-md flex-shrink-0"
              title="Add / Upload Dataset (CSV, Excel, PDF Statement, TSV)"
            >
              {isUploadingData ? (
                <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
              ) : (
                <Paperclip className="w-5 h-5 text-cyan-400" />
              )}
            </motion.button>

            <VoiceButton
              isListening={isListening}
              isTranscribing={isTranscribing}
              onToggle={handleVoiceToggle}
              disabled={isLoading}
              title={`Click to speak in any language (Using Whisper ${transcriberModel.toUpperCase()} on CUDA)`}
            />

            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={
                  isListening
                    ? "Listening... Speak in any language..."
                    : isTranscribing
                    ? "Transcribing with Whisper Large-V3 Turbo on CUDA..."
                    : `Ask in any language or click paperclip to attach dataset... (Output: ${SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || selectedLanguage})`
                }
                disabled={isLoading}
                rows={1}
                className="w-full bg-slate-900/90 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 border border-slate-700/80 resize-none transition-all duration-200"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={sendMessage}
              disabled={!inputText.trim() || isLoading}
              className="bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all shadow-lg shadow-cyan-600/20 flex items-center justify-center"
              title="Send message"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default AssistantUI
