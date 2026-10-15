import { useState, useRef, useCallback } from 'react'

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '')

const BCP47_MAP = {
  'en': 'en-US',
  'hi': 'hi-IN',
  'es': 'es-ES',
  'fr': 'fr-FR',
  'de': 'de-DE',
  'ja': 'ja-JP',
  'zh': 'zh-CN',
  'it': 'it-IT',
  'pt': 'pt-BR',
  'ru': 'ru-RU',
  'ar': 'ar-SA',
  'ko': 'ko-KR'
}

export const useSpeechRecognition = (options = {}) => {
  const [isListening, setIsListening] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [detectedLanguage, setDetectedLanguage] = useState(null)
  const [usedModel, setUsedModel] = useState('turbo')
  const [error, setError] = useState('')

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const recognitionRef = useRef(null)
  const isListeningRef = useRef(false)
  const liveTranscriptRef = useRef('')

  const hasBrowserSpeech = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
  const hasMediaDevices = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  const stopListening = useCallback(() => {
    isListeningRef.current = false
    setIsListening(false)
    setInterimTranscript('')

    // Stop real-time browser speech recognition
    if (recognitionRef.current) {
      try { 
        recognitionRef.current.stop() 
      } catch (e) {}
    }

    // Stop audio recording to trigger high-precision Whisper refinement
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch (e) {
        console.warn('Error stopping MediaRecorder:', e)
      }
    } else if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(t => t.stop())
      } catch (e) {}
      streamRef.current = null
    }
  }, [])

  const startListening = useCallback(async (lang = 'auto', task = 'transcribe', model = 'turbo') => {
    setTranscript('')
    setInterimTranscript('')
    setError('')
    setDetectedLanguage(null)
    setUsedModel(model)
    liveTranscriptRef.current = ''
    isListeningRef.current = true
    setIsListening(true)

    let browserSpeechStarted = false

    // 1. START LIVE REAL-TIME BROWSER SPEECH RECOGNITION (instant word-by-word interim streaming)
    if (hasBrowserSpeech) {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.maxAlternatives = 1

        const targetLang = (lang && lang !== 'auto') 
          ? (BCP47_MAP[lang] || lang) 
          : (typeof navigator !== 'undefined' ? navigator.language : 'en-US')
        recognition.lang = targetLang

        recognition.onresult = (event) => {
          let finalStr = ''
          let interimStr = ''

          for (let i = 0; i < event.results.length; ++i) {
            const item = event.results[i]
            if (item.isFinal) {
              finalStr += item[0].transcript + ' '
            } else {
              interimStr += item[0].transcript
            }
          }

          const fullLive = (finalStr + interimStr).trim()
          if (fullLive) {
            liveTranscriptRef.current = fullLive
            setTranscript(fullLive)
            setInterimTranscript(interimStr.trim())
          }
        }

        recognition.onerror = (event) => {
          if (event.error === 'no-speech') {
            return // Ignore harmless silence pauses
          }
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setError('Microphone permission denied for voice recognition.')
            isListeningRef.current = false
            setIsListening(false)
          } else {
            console.warn('SpeechRecognition notice:', event.error)
          }
        }

        recognition.onend = () => {
          // Keep listening alive if user hasn't explicitly stopped
          if (isListeningRef.current && recognitionRef.current) {
            try {
              recognition.start()
            } catch (e) {}
          }
        }

        recognitionRef.current = recognition
        recognition.start()
        browserSpeechStarted = true
      } catch (err) {
        console.warn('Live SpeechRecognition start error:', err)
      }
    }

    // 2. START PARALLEL MEDIARECORDER (captures audio for local Whisper Large-V3 Turbo refinement on stop)
    if (hasMediaDevices && typeof MediaRecorder !== 'undefined') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream

        let mimeType = ''
        const candidates = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
          'audio/mp4',
          'audio/wav'
        ]
        for (const c of candidates) {
          if (MediaRecorder.isTypeSupported(c)) {
            mimeType = c
            break
          }
        }

        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
        mediaRecorderRef.current = recorder
        audioChunksRef.current = []

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        recorder.onstop = async () => {
          // Release microphone hardware once recording stops
          if (streamRef.current) {
            try {
              streamRef.current.getTracks().forEach(t => t.stop())
            } catch (e) {}
            streamRef.current = null
          }

          const actualType = recorder.mimeType || mimeType || 'audio/webm'
          const audioBlob = new Blob(audioChunksRef.current, { type: actualType })
          
          if (audioBlob.size < 100) {
            setIsTranscribing(false)
            return
          }

          setIsTranscribing(true)
          try {
            const ext = actualType.includes('ogg') ? 'ogg' :
                        actualType.includes('mp4') ? 'mp4' :
                        actualType.includes('wav') ? 'wav' : 'webm'

            const formData = new FormData()
            formData.append('audio', audioBlob, `recording.${ext}`)
            if (lang && lang !== 'auto') {
              formData.append('language', lang)
            }
            if (task) {
              formData.append('task', task)
            }
            if (model) {
              formData.append('model', model)
            }

            const res = await fetch(`${API_BASE}/api/ai/transcribe`, {
              method: 'POST',
              body: formData
            })
            const data = await res.json()

            // If Whisper returns refined high-accuracy text, update transcript
            if (data.success && data.text) {
              setTranscript(data.text)
              liveTranscriptRef.current = data.text
              if (data.detected_language) setDetectedLanguage(data.detected_language)
              if (data.model) setUsedModel(data.model)
            } else if (!data.success && !liveTranscriptRef.current) {
              throw new Error(data.error || 'Transcription failed')
            }
          } catch (err) {
            console.warn('Whisper refinement issue:', err)
            // If live transcript was already captured by browser speech, do not overwrite with error
            if (!liveTranscriptRef.current) {
              setError(err.message || 'Speech transcription failed')
            }
          } finally {
            setIsTranscribing(false)
          }
        }

        recorder.start(250)
        return
      } catch (micErr) {
        console.warn('Microphone access issue for MediaRecorder:', micErr)
        if (micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError') {
          setError('Microphone permission denied. Please allow microphone access in your browser.')
          isListeningRef.current = false
          setIsListening(false)
          return
        }
      }
    }

    if (!browserSpeechStarted && !hasMediaDevices) {
      setError('Speech recognition and microphone access are not supported in this browser.')
      isListeningRef.current = false
      setIsListening(false)
    }
  }, [hasBrowserSpeech, hasMediaDevices])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setError('')
    setDetectedLanguage(null)
    liveTranscriptRef.current = ''
  }, [])

  return {
    isListening,
    isTranscribing,
    transcript,
    interimTranscript,
    detectedLanguage,
    usedModel,
    error,
    startListening,
    stopListening,
    resetTranscript,
    hasSupport: hasMediaDevices || hasBrowserSpeech
  }
}
