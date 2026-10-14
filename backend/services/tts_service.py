"""
Local Neural Text-to-Speech (TTS) Service
Uses on-device Kokoro-ONNX (82M parameter neural TTS) as primary engine
with offline pyttsx3 fallback. ZERO live external APIs (no gTTS).
Outputs peak-normalized 16-bit PCM WAV for loud, crystal-clear playback.
"""

import os
import re
import uuid
import time
import logging
from typing import Optional
import numpy as np
import soundfile as sf

logger = logging.getLogger(__name__)

# Map common language codes to Kokoro supported language codes & voices
# Kokoro supports: en-us, en-gb, es, fr-fr, hi, it, pt-br, ja, zh
KOKORO_LANG_MAP = {
    'en': {'lang': 'en-us', 'voice': 'af_bella'},
    'en-US': {'lang': 'en-us', 'voice': 'af_bella'},
    'en-GB': {'lang': 'en-gb', 'voice': 'bf_emma'},
    'es': {'lang': 'es', 'voice': 'ef_dora'},
    'es-ES': {'lang': 'es', 'voice': 'ef_dora'},
    'fr': {'lang': 'fr-fr', 'voice': 'ff_siwis'},
    'fr-FR': {'lang': 'fr-fr', 'voice': 'ff_siwis'},
    'hi': {'lang': 'hi', 'voice': 'hf_alpha'},
    'it': {'lang': 'it', 'voice': 'if_sara'},
    'pt': {'lang': 'pt-br', 'voice': 'pf_dora'},
    'ja': {'lang': 'ja', 'voice': 'jf_teona'},
    'zh': {'lang': 'zh', 'voice': 'zf_xiaobei'},
}


class TTSService:
    def __init__(self, static_dir: str = 'static'):
        self.static_dir = os.path.abspath(static_dir)
        os.makedirs(self.static_dir, exist_ok=True)
        self.kokoro = None
        self._init_kokoro()

    def _init_kokoro(self):
        """Initialize Kokoro-ONNX model if weights are available"""
        try:
            from kokoro_onnx import Kokoro
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            model_path = os.path.join(backend_dir, 'models', 'kokoro-v0_19.onnx')
            voices_path = os.path.join(backend_dir, 'models', 'voices-v1.0.bin')

            if not os.path.exists(voices_path):
                voices_path = os.path.join(backend_dir, 'models', 'voices.json')

            if os.path.exists(model_path) and os.path.exists(voices_path):
                self.kokoro = Kokoro(model_path, voices_path)
                logger.info(f"Kokoro-ONNX neural TTS initialized successfully with {model_path}")
            else:
                logger.warning(f"Kokoro weights not found at {model_path}. Will use offline fallback.")
        except Exception as e:
            logger.warning(f"Failed to initialize Kokoro-ONNX: {e}. Falling back to pyttsx3.")
            self.kokoro = None

    def _strip_markdown(self, text: str) -> str:
        """Strip markdown syntax, emojis, code blocks, and symbols for natural speech"""
        if not text:
            return ""

        # Remove code blocks
        clean = re.sub(r'```[\s\S]*?```', ' [code omitted] ', text)
        clean = re.sub(r'`[^`]+`', '', clean)

        # Remove markdown tables
        clean = re.sub(r'\|[^\n]+\|', ' ', clean)
        clean = re.sub(r'[-:|]{3,}', ' ', clean)

        # Remove headers, bold, italics, strikethrough
        clean = re.sub(r'#{1,6}\s*', '', clean)
        clean = re.sub(r'(\*\*|__)(.*?)\1', r'\2', clean)
        clean = re.sub(r'(\*|_)(.*?)\1', r'\2', clean)
        clean = re.sub(r'~~(.*?)~~', r'\1', clean)

        # Remove links: [text](url) -> text
        clean = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', clean)

        # Remove bullet points and numbered list markers
        clean = re.sub(r'^\s*[-*+]\s+', '', clean, flags=re.MULTILINE)
        clean = re.sub(r'^\s*\d+\.\s+', '', clean, flags=re.MULTILINE)

        # Remove emojis and excessive symbols
        clean = re.sub(r'[:;=8][\-o\*\']?[\)\]\(\[dDpP/\:\}\{@\|\\]', '', clean)
        clean = re.sub(r'[\U00010000-\U0010ffff]', '', clean)

        # Normalize whitespace
        clean = re.sub(r'\s+', ' ', clean).strip()

        # Limit to reasonable length for TTS (first 1000 chars)
        if len(clean) > 1000:
            last_period = clean[:1000].rfind('.')
            if last_period > 300:
                clean = clean[:last_period + 1]
            else:
                clean = clean[:1000]

        return clean

    def generate_speech(self, text: str, lang: str = 'en') -> Optional[str]:
        """
        Generate high-quality speech from text using local Kokoro-ONNX
        with automatic peak-normalization and offline pyttsx3 fallback.
        Returns the filename (e.g., 'speech_abc123.wav') inside static_dir.
        """
        clean_text = self._strip_markdown(text)
        if not clean_text:
            return None

        filename = f"speech_{uuid.uuid4().hex[:8]}.wav"
        filepath = os.path.join(self.static_dir, filename)

        # 1. Try local Kokoro-ONNX Neural Model
        if self.kokoro:
            try:
                lang_code = lang.split('-')[0].lower() if '-' in lang else lang.lower()
                cfg = KOKORO_LANG_MAP.get(lang) or KOKORO_LANG_MAP.get(lang_code, {'lang': 'en-us', 'voice': 'af_bella'})

                samples, sample_rate = self.kokoro.create(
                    clean_text,
                    voice=cfg['voice'],
                    speed=1.0,
                    lang=cfg['lang']
                )

                # Peak-normalize audio to 0.99 for maximum clarity and audibility
                samples = np.array(samples, dtype=np.float32)
                max_val = np.max(np.abs(samples))
                if max_val > 0.001:
                    samples = (samples / max_val) * 0.98

                # Write standard 16-bit PCM WAV (browser native compatibility)
                sf.write(filepath, samples, sample_rate, subtype='PCM_16')
                logger.info(f"Kokoro generated {filename} ({len(samples)} samples, {sample_rate}Hz)")
                return filename

            except Exception as e:
                logger.warning(f"Kokoro TTS generation failed: {e}. Falling back to pyttsx3.")

        # 2. Offline pyttsx3 Fallback (SAPI5 on Windows)
        try:
            import pyttsx3
            engine = pyttsx3.init()
            engine.setProperty('rate', 175)
            engine.setProperty('volume', 1.0)
            engine.save_to_file(clean_text, filepath)
            engine.runAndWait()
            engine.stop()

            if os.path.exists(filepath) and os.path.getsize(filepath) > 100:
                logger.info(f"pyttsx3 generated {filename}")
                return filename
        except Exception as e:
            logger.error(f"pyttsx3 TTS generation error: {e}")

        return None

    def play_audio(self, audio_path: str) -> bool:
        """Verify audio file exists for frontend playback"""
        full_path = os.path.join(self.static_dir, audio_path)
        return os.path.exists(full_path)

    def cleanup_old_files(self, max_age_hours: int = 24):
        """Clean up audio files older than max_age_hours"""
        try:
            current_time = time.time()
            for filename in os.listdir(self.static_dir):
                if filename.startswith('speech_') and (filename.endswith('.wav') or filename.endswith('.mp3')):
                    filepath = os.path.join(self.static_dir, filename)
                    if os.path.isfile(filepath):
                        file_age = current_time - os.path.getctime(filepath)
                        if file_age > max_age_hours * 3600:
                            os.remove(filepath)
        except Exception as e:
            logger.warning(f"Cleanup error: {e}")
