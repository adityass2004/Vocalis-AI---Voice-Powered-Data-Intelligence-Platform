import os
import uuid
from gtts import gTTS
import pygame
from io import BytesIO
import tempfile
from typing import Optional

class TTSService :
    def __init__ (self ,static_dir :str ='static'):
        self .static_dir =static_dir
        pygame .mixer .init ()

    def generate_speech (self ,text :str ,lang :str ='en')->Optional [str ]:
        """Generate speech from text and return audio file path"""
        try :

            tts =gTTS (text =text ,lang =lang ,slow =False )

            filename =f"speech_{uuid.uuid4().hex[:8]}.mp3"
            filepath =os .path .join (self .static_dir ,filename )

            tts .save (filepath )

            return filename

        except Exception as e :
            print (f"TTS Error: {str(e)}")
            return None

    def play_audio (self ,audio_path :str )->bool :
        """Play audio file using pygame"""
        try :
            full_path =os .path .join (self .static_dir ,audio_path )
            if os .path .exists (full_path ):
                pygame .mixer .music .load (full_path )
                pygame .mixer .music .play ()
                return True
            return False
        except Exception as e :
            print (f"Audio playback error: {str(e)}")
            return False

    def cleanup_old_files (self ,max_age_hours :int =24 ):
        """Clean up old audio files to save disk space"""
        try :
            import time
            current_time =time .time ()

            for filename in os .listdir (self .static_dir ):
                if filename .endswith ('.mp3')or filename .endswith ('.wav'):
                    filepath =os .path .join (self .static_dir ,filename )
                    file_age =current_time -os .path .getctime (filepath )

                    if file_age >max_age_hours *3600 :
                        os .remove (filepath )

        except Exception as e :
            print (f"Cleanup error: {str(e)}")
