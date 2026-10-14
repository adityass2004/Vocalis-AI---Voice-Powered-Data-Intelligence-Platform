"""Local Multilingual Speech-to-Text Service using Faster-Whisper.

Runs entirely locally on device (using CUDA GPU if available, or CPU).
Zero external API calls. Supports 99+ languages with auto-detection.
Supports 4 model tiers:
  - 'turbo': OpenAI Whisper Large-V3-Turbo (Flagship State-of-the-Art, Maximum Accuracy)
  - 'small': Whisper Small (Deep Precision, High Vocabulary)
  - 'base': Whisper Base (Balanced Multilingual)
  - 'tiny': Whisper Tiny (Ultra-Low Latency)
"""

import os
import io
import tempfile
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

SUPPORTED_MODELS = {
    "turbo": {
        "id": "turbo",
        "name": "Whisper Large-V3 Turbo",
        "description": "OpenAI Flagship Large-V3 (Highest Multilingual Accuracy & Technical Jargon)",
        "precision": "Maximum (SOTA)",
        "speed": "Fast (~0.5s on CUDA)"
    },
    "small": {
        "id": "small",
        "name": "Whisper Small",
        "description": "Deep Precision Multilingual (High Vocabulary Accuracy)",
        "precision": "Very High",
        "speed": "Fast (~0.3s on CUDA)"
    },
    "base": {
        "id": "base",
        "name": "Whisper Base",
        "description": "Balanced Multilingual (Lightweight)",
        "precision": "High",
        "speed": "Very Fast (~0.2s)"
    },
    "tiny": {
        "id": "tiny",
        "name": "Whisper Tiny",
        "description": "Ultra-Low Latency",
        "precision": "Standard",
        "speed": "Instant (~0.1s)"
    }
}


class STTService:
    def __init__(self, default_model: str = "turbo"):
        self.default_model = os.getenv("WHISPER_MODEL", default_model)
        self._models: Dict[str, Any] = {}
        self.device = "cpu"
        self.compute_type = "int8"
        self._detect_device()

    def _detect_device(self):
        try:
            import ctranslate2
            cuda_avail = ctranslate2.get_cuda_device_count() > 0
            if cuda_avail:
                self.device = "cuda"
                self.compute_type = "float16"
                logger.info("STT initialized on CUDA device with float16 acceleration.")
            else:
                self.device = "cpu"
                self.compute_type = "int8"
                logger.info("STT initialized on CPU with int8 quantization.")
        except Exception as e:
            logger.warning(f"CUDA check error: {e}, using CPU int8.")
            self.device = "cpu"
            self.compute_type = "int8"

    def _get_model(self, model_size: str = None):
        target_size = model_size or self.default_model
        if target_size not in SUPPORTED_MODELS:
            target_size = "turbo"

        if target_size in self._models:
            return self._models[target_size]

        from faster_whisper import WhisperModel
        logger.info(f"Loading local Faster-Whisper model '{target_size}' on {self.device} ({self.compute_type})...")
        try:
            model = WhisperModel(
                target_size,
                device=self.device,
                compute_type=self.compute_type
            )
            self._models[target_size] = model
            return model
        except Exception as e:
            logger.warning(f"Failed to load Whisper '{target_size}' on {self.device}: {e}. Trying small model.")
            try:
                if "small" in self._models:
                    return self._models["small"]
                model = WhisperModel(
                    "small",
                    device=self.device,
                    compute_type=self.compute_type
                )
                self._models["small"] = model
                return model
            except Exception as e2:
                logger.warning(f"Failed to load small: {e2}. Falling back to base model.")
                if "base" not in self._models:
                    self._models["base"] = WhisperModel("base", device=self.device, compute_type=self.compute_type)
                return self._models["base"]

    def transcribe_audio(
        self, 
        audio_source, 
        language: Optional[str] = None, 
        task: str = "transcribe",
        model_size: Optional[str] = None
    ) -> Dict[str, Any]:
        """Transcribe or translate speech audio using local Faster-Whisper model.

        :param audio_source: filepath string or binary file-like object/bytes
        :param language: ISO language code (e.g. 'en', 'hi', 'es', 'fr', 'ja') or None for auto-detect
        :param task: 'transcribe' (native transcription) or 'translate' (speech-to-text English translation)
        :param model_size: 'turbo', 'small', 'base', or 'tiny'
        :return: Dict containing text, detected_language, confidence, duration, model, device
        """
        temp_path = None
        try:
            if isinstance(audio_source, (bytes, bytearray)):
                with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                    f.write(audio_source)
                    temp_path = f.name
                audio_target = temp_path
            elif hasattr(audio_source, "read"):
                with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                    f.write(audio_source.read())
                    temp_path = f.name
                audio_target = temp_path
            else:
                audio_target = str(audio_source)

            used_model_size = model_size or self.default_model
            model = self._get_model(used_model_size)

            kwargs = {
                "task": task if task in ["transcribe", "translate"] else "transcribe",
                "beam_size": 4 if used_model_size in ["turbo", "small", "base"] else 3,
                "vad_filter": True,
                "vad_parameters": dict(min_silence_duration_ms=450),
            }
            if language and language not in ["auto", "default", "none", ""]:
                kwargs["language"] = language

            segments, info = model.transcribe(audio_target, **kwargs)
            segment_list = list(segments)
            full_text = " ".join(s.text.strip() for s in segment_list if s.text).strip()

            return {
                "success": True,
                "text": full_text,
                "detected_language": info.language,
                "language_probability": round(info.language_probability, 3) if hasattr(info, "language_probability") else 1.0,
                "duration": round(info.duration, 2) if hasattr(info, "duration") else 0.0,
                "device": self.device,
                "model": used_model_size,
                "task": kwargs["task"]
            }
        except Exception as e:
            logger.exception("STT transcription error")
            return {
                "success": False,
                "error": f"Speech transcription failed: {str(e)}"
            }
        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass

    def get_available_models(self) -> Dict[str, Any]:
        """Return available whisper transcriber models and current hardware device."""
        return {
            "default": self.default_model,
            "device": self.device,
            "compute_type": self.compute_type,
            "models": list(SUPPORTED_MODELS.values())
        }
