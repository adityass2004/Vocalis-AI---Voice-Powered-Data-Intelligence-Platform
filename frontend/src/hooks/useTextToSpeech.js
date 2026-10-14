import { useState, useRef, useCallback } from 'react'

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '')

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState('')
  const audioRef = useRef(null)
  const synthRef = useRef(null)
  const audioContextRef = useRef(null)
  const gainNodeRef = useRef(null)

  const stopSpeaking = useCallback(() => {
    // Stop local HTML5 Audio element
    if (audioRef.current) {
      try {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      } catch (e) {}
      audioRef.current = null
    }
    // Stop browser speech synthesis if active
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
      } catch (e) {}
      synthRef.current = null
    }
    setIsSpeaking(false)
  }, [])

  const preloadAudio = useCallback((url) => {
    if (!url) return
    try {
      const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`
      const audio = new Audio()
      audio.preload = 'auto'
      audio.src = fullUrl
    } catch (e) {}
  }, [])

  const fallbackBrowserSpeech = useCallback((text, lang, speed, volumeMultiplier = 1.0) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setError('Text-to-speech is not supported on this device')
      setIsSpeaking(false)
      return
    }

    try {
      window.speechSynthesis.cancel()
      const cleanText = text.replace(/[*_#`~[\]]/g, '').slice(0, 800)
      const utterance = new SpeechSynthesisUtterance(cleanText)
      utterance.rate = speed || 0.95
      utterance.pitch = 1.0
      utterance.volume = 1.0

      const voices = window.speechSynthesis.getVoices()
      const targetLang = (lang || 'en').toLowerCase()
      const matchedVoice = voices.find(v => v.lang.toLowerCase().startsWith(targetLang))

      if (matchedVoice) {
        utterance.voice = matchedVoice
        utterance.lang = matchedVoice.lang
      } else {
        utterance.lang = lang || 'en'
      }

      utterance.onend = () => {
        setIsSpeaking(false)
        synthRef.current = null
      }
      utterance.onerror = () => {
        setIsSpeaking(false)
        synthRef.current = null
      }

      synthRef.current = utterance
      window.speechSynthesis.speak(utterance)
    } catch (e) {
      setError('Speech synthesis failed')
      setIsSpeaking(false)
    }
  }, [])

  const playAudioFile = useCallback(async (url, text, lang, speed, volumeMultiplier) => {
    try {
      const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`
      const audio = new Audio(fullUrl)
      audio.crossOrigin = 'anonymous'
      audio.volume = 1.0

      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext
        if (AudioContextClass) {
          const ctx = audioContextRef.current || new AudioContextClass()
          audioContextRef.current = ctx
          if (ctx.state === 'suspended') {
            await ctx.resume()
          }
          const source = ctx.createMediaElementSource(audio)
          const gainNode = ctx.createGain()
          gainNode.gain.value = Math.max(0.5, Math.min(2.5, (volumeMultiplier || 1.25) * 1.35))
          source.connect(gainNode)
          gainNode.connect(ctx.destination)
          gainNodeRef.current = gainNode
        }
      } catch (webaudioErr) {
        // Direct audio output fallback
      }

      audioRef.current = audio

      audio.onended = () => {
        setIsSpeaking(false)
        audioRef.current = null
      }
      audio.onerror = () => {
        fallbackBrowserSpeech(text, lang, speed, volumeMultiplier)
      }

      await audio.play()
      return true
    } catch (err) {
      console.warn('Instant direct audio playback failed, falling back:', err)
      return false
    }
  }, [fallbackBrowserSpeech])

  const speak = useCallback(async (text, options = {}) => {
    if (!text || !text.trim()) return

    stopSpeaking()
    setError('')
    setIsSpeaking(true)

    const lang = options.lang || 'en'
    const speed = options.speed || 1.0
    const voice = options.voice || null
    const volumeMultiplier = typeof options.volume === 'number' ? options.volume : 1.25

    // 1. INSTANT PLAYBACK: If audio was already preprocessed by the backend, play it immediately!
    if (options.audioUrl) {
      const played = await playAudioFile(options.audioUrl, text, lang, speed, volumeMultiplier)
      if (played) return
    }

    // 2. Fallback to generating on backend if not preprocessed
    try {
      const res = await fetch(`${API_BASE}/api/ai/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          lang,
          voice,
          speed
        })
      })

      const data = await res.json()
      if (data.success && data.audio_url) {
        const played = await playAudioFile(data.audio_url, text, lang, speed, volumeMultiplier)
        if (played) return
      }
    } catch (err) {
      console.warn('Backend neural TTS failed, falling back to client speech:', err)
    }

    // 3. Fallback: Native browser offline SpeechSynthesis
    fallbackBrowserSpeech(text, lang, speed, volumeMultiplier)
  }, [stopSpeaking, playAudioFile, fallbackBrowserSpeech])

  const synthesizeAudio = useCallback(async (text, options = {}) => {
    if (!text || !text.trim()) return null
    try {
      const res = await fetch(`${API_BASE}/api/ai/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          lang: options.lang || 'en',
          voice: options.voice || null,
          speed: options.speed || 1.0
        })
      })
      const data = await res.json()
      if (data.success && data.audio_url) {
        preloadAudio(data.audio_url)
        return data.audio_url
      }
    } catch (e) {
      console.warn('Pre-synthesis failed:', e)
    }
    return null
  }, [preloadAudio])

  const setVolumeBoost = useCallback((vol) => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = Math.max(0.1, Math.min(2.5, vol * 1.35))
    }
  }, [])

  const pauseSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause()
    }
  }, [])

  const resumeSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play()
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume()
    }
  }, [])

  return {
    isSpeaking,
    error,
    speak,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    setVolumeBoost,
    preloadAudio,
    synthesizeAudio
  }
}
