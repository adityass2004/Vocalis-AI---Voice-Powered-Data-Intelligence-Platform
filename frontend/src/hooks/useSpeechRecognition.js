import { useState, useRef, useCallback } from 'react'

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '')

export const useSpeechRecognition = (options = {}) => {
  const [isListening, setIsListening] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [detectedLanguage, setDetectedLanguage] = useState(null)
  const [usedModel, setUsedModel] = useState('turbo')
  const [error, setError] = useState('')

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const recognitionRef = useRef(null)

  const hasBrowserSpeech = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
  const hasMediaDevices = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (e) {}
    }
    setIsListening(false)
  }, [])

  const startListening = useCallback(async (lang = 'auto', task = 'transcribe', model = 'turbo') => {
    setTranscript('')
    setError('')
    setDetectedLanguage(null)
    setUsedModel(model)

    if (hasMediaDevices) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream

        let mimeType = 'audio/webm'
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus'
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          mimeType = 'audio/ogg;codecs=opus'
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4'
        }

        const recorder = new MediaRecorder(stream, { mimeType })
        mediaRecorderRef.current = recorder
        audioChunksRef.current = []

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
          if (audioBlob.size < 100) {
            setIsTranscribing(false)
            return
          }

          setIsTranscribing(true)
          try {
            const formData = new FormData()
            formData.append('audio', audioBlob, 'recording.webm')
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

            if (data.success && data.text) {
              setTranscript(data.text)
              setDetectedLanguage(data.detected_language)
              if (data.model) setUsedModel(data.model)
            } else if (!data.success) {
              throw new Error(data.error || 'Transcription failed')
            }
          } catch (err) {
            console.warn('Local Whisper transcription issue, falling back:', err)
            setError(err.message || 'Speech transcription failed')
          } finally {
            setIsTranscribing(false)
          }
        }

        recorder.start(250)
        setIsListening(true)
        return
      } catch (micErr) {
        console.warn('Microphone access issue for MediaRecorder:', micErr)
      }
    }

    if (hasBrowserSpeech) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = lang && lang !== 'auto' ? lang : 'en-US'

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onresult = (event) => {
        const current = event.resultIndex
        const transcriptText = event.results[current][0].transcript
        setTranscript(transcriptText)
      }

      recognition.onerror = (event) => {
        setError(`Speech recognition error: ${event.error}`)
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
      recognition.start()
    } else {
      setError('Speech recognition not supported in this browser')
    }
  }, [hasBrowserSpeech, hasMediaDevices])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setError('')
    setDetectedLanguage(null)
  }, [])

  return {
    isListening,
    isTranscribing,
    transcript,
    detectedLanguage,
    usedModel,
    error,
    startListening,
    stopListening,
    resetTranscript,
    hasSupport: hasMediaDevices || hasBrowserSpeech
  }
}
