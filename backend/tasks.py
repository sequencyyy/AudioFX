from celery import Celery
from pydub import AudioSegment
import os
import logging
import redis
import subprocess
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import ProcessingHistory
from db import SessionLocal


DATABASE_URL = "postgresql://postgres:postgres@db:5432/audio"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

celery_app = Celery(
    "tasks", 
    broker="redis://redis:6379/0", 
    backend="redis://redis:6379/0" 
)
celery_app.conf.broker_connection_retry_on_startup = True

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

PROCESSED_DIR = "original"
IR_DIR = "impulses"  
os.makedirs(IR_DIR, exist_ok=True)
redis_client = redis.StrictRedis(host="redis", port=6379, decode_responses=True)

@celery_app.task(bind=True)
def speedup_audio(self, file_path: str, speed: float, volume:float, user_id: int):
    try:
        parameters = {
            "speed": speed,
            "volume": volume
        }
        output_filename = f"{os.path.basename(file_path).split('.mp3')[0]}_speedup.mp3"
        output_path = os.path.join(PROCESSED_DIR, output_filename)

        subprocess.run([
            "ffmpeg", "-y", "-i", file_path,
            "-af", f"atempo={speed}, volume={volume}",
            "-b:a", '320k', "-ar", '44100', output_path
        ], check=True)

        redis_client.set(f"{user_id}:{output_filename}", output_path)
        db = SessionLocal()
        history_entry = ProcessingHistory(
            user_id=user_id,
            original_filename=os.path.basename(file_path),
            processed_filename=output_filename,
            effect_type="speedup",
            parameters=parameters
        )
        db.add(history_entry)
        db.commit()
        db.close()
        return output_path
    except Exception as e:
        raise Exception(f"Error processing file: {e}")

@celery_app.task(bind=True)
def slowed_reverb_audio(self, file_path: str, speed: float, reverb_amount: float, volume:float, user_id: int):
    try:
        parameters = {
            "speed": speed,
            "reverb_amount": reverb_amount,
            "volume": volume
        }
        output_filename = f"{os.path.basename(file_path).split('.mp3')[0]}_slowed_reverb.mp3"
        output_path = os.path.join(PROCESSED_DIR, output_filename)

        param_reverb = ""

        reverb_amount = int((reverb_amount / 100) * 3000)
        if reverb_amount <= 0:
            param_reverb = f"atempo={speed}, volume={volume}"
        else:
            param_reverb = f"atempo={speed},aecho=0.8:0.88:{reverb_amount}:0.35, volume={volume}"

        
        
        subprocess.run([
            "ffmpeg", "-y",
            "-i", file_path,
            "-af", param_reverb,
            "-b:a", "320k", "-ar", '44100',
            output_path
        ], check=True)

        redis_client.set(f"{user_id}:{output_filename}", output_path)
        db = SessionLocal()
        history_entry = ProcessingHistory(
            user_id=user_id,
            original_filename=os.path.basename(file_path),
            processed_filename=output_filename,
            effect_type="slowed",
            parameters=parameters
        )
        db.add(history_entry)
        db.commit()
        db.close()
        return output_path
    except Exception as e:
        raise Exception(f"Error processing file: {e}")

@celery_app.task(bind=True)
def nightcore_audio(self, file_path: str, speed: float, pitch: float, volume:float, user_id: int):
    try:
        parameters = {
            "speed": speed,
            "pitch": pitch,
            "volume": volume
        }
        output_filename = f"{os.path.basename(file_path).split('.mp3')[0]}_nightcore.mp3"
        output_path = os.path.join(PROCESSED_DIR, output_filename)

        subprocess.run([
            "ffmpeg", "-y", "-i", file_path,
            "-af",  f"rubberband=pitch={pitch},atempo={speed}, volume={volume}",
            "-b:a", '320k', "-ar", '44100', output_path
        ], check=True)

        redis_client.set(f"{user_id}:{output_filename}", output_path)
        db = SessionLocal()
        history_entry = ProcessingHistory(
            user_id=user_id,
            original_filename=os.path.basename(file_path),
            processed_filename=output_filename,
            effect_type="nightcore",
            parameters=parameters
        )
        db.add(history_entry)
        db.commit()
        db.close()
        return output_path
    except Exception as e:
        raise Exception(f"Error processing file: {e}")


@celery_app.task(bind=True)
def alleffects_audio(self, file_path: str, speed: float, pitch: float, reverb_amount: float, volume:float, bass_gain: float, flanger_mix: float,  user_id: int):
    try:
        parameters = {
            "speed": speed,
            "pitch": pitch,
            "reverb_amount": reverb_amount,
            "volume": volume,
            "bass_gain": bass_gain,
            "flanger_mix": flanger_mix
        }
        param_reverb = ""

        reverb_amount = int((reverb_amount / 100) * 3000)
        if reverb_amount <= 0 and flanger_mix <= 0:
            param_reverb = f"rubberband=pitch={pitch}, atempo={speed}, volume={volume}, bass=g={bass_gain}"
        elif reverb_amount > 0 and flanger_mix <= 0:
           param_reverb = f"rubberband=pitch={pitch}, atempo={speed}, aecho=0.8:0.8:{reverb_amount}:0.35, volume={volume}, bass=g={bass_gain}"
        elif reverb_amount <= 0 and flanger_mix > 0:
            param_reverb = f"rubberband=pitch={pitch}, atempo={speed}, flanger=delay=30:depth={flanger_mix}:speed=1, volume={volume}, bass=g={bass_gain}"
        else:
            param_reverb = f"rubberband=pitch={pitch}, atempo={speed}, aecho=0.8:0.8:{reverb_amount}:0.35, flanger=delay=30:depth={flanger_mix}:speed=1, volume={volume}, bass=g={bass_gain}"

        output_filename = f"{os.path.basename(file_path).split('.mp3')[0]}_alleffects.mp3"
        output_path = os.path.join(PROCESSED_DIR, output_filename)

        subprocess.run([
            "ffmpeg", "-y", "-i", file_path,
            "-af",  param_reverb,
            "-b:a", '320k', "-ar", '44100', output_path
        ], check=True)

        redis_client.set(f"{user_id}:{output_filename}", output_path)

        db = SessionLocal()
        history_entry = ProcessingHistory(
            user_id=user_id,
            original_filename=os.path.basename(file_path),
            processed_filename=output_filename,
            effect_type="alleffects",
            parameters=parameters
        )
        db.add(history_entry)
        db.commit()
        db.close()

        return output_path
    except Exception as e:
        raise Exception(f"Error processing file: {e}")


