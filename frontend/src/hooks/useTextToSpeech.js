import { useState, useRef, useCallback } from 'react'

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState('')
  const synthRef = useRef(null)

  const isSupported = 'speechSynthesis' in window

  const speak = useCallback(async (text, options = {}) => {
    if (!isSupported) {
      setError('Text-to-speech not supported in this browser')
      return
    }

    if (!text) return

    if (synthRef.current) {
      window.speechSynthesis.cancel()
    }

    const utterance = new SpeechSynthesisUtterance(text)

    utterance.rate = options.rate || 0.9
    utterance.pitch = options.pitch || 1
    utterance.volume = options.volume || 0.8
    utterance.lang = options.lang || 'en-US'

    utterance.onstart = () => {
      setIsSpeaking(true)
      setError('')
    }

    utterance.onend = () => {
      setIsSpeaking(false)
      synthRef.current = null
    }

    utterance.onerror = (event) => {
      setError(`Speech synthesis error: ${event.error}`)
      setIsSpeaking(false)
      synthRef.current = null
    }

    synthRef.current = utterance

    try {
      window.speechSynthesis.speak(utterance)
    } catch (error) {
      setError('Failed to start text-to-speech')
      setIsSpeaking(false)
    }
  }, [isSupported])

  const stopSpeaking = useCallback(() => {
    if (isSupported && synthRef.current) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      synthRef.current = null
    }
  }, [isSupported])

  const pauseSpeaking = useCallback(() => {
    if (isSupported && isSpeaking) {
      window.speechSynthesis.pause()
    }
  }, [isSupported, isSpeaking])

  const resumeSpeaking = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.resume()
    }
  }, [isSupported])

  const getVoices = useCallback(() => {
    if (isSupported) {
      return window.speechSynthesis.getVoices()
    }
    return []
  }, [isSupported])

  return {
    speak,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    getVoices,
    isSpeaking,
    error,
    isSupported
  }
}
