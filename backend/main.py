from fastapi import FastAPI, File, UploadFile, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import redis
import os
from uuid import uuid4
from datetime import timedelta
from fastapi.responses import FileResponse
from models import User, ProcessingHistory, UserCreate, UserLogin, UserResponse, Base
from db import SessionLocal, engine
from tasks import speedup_audio, slowed_reverb_audio, nightcore_audio, alleffects_audio
from celery.result import AsyncResult
import logging
import json
from typing import Optional
from fastapi import Depends, HTTPException, status
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean, Integer, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from exceptions import (
    global_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import IntegrityError


app = FastAPI()

app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")



logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

redis_client = redis.StrictRedis(host="redis", port=6379, decode_responses=True)

ORIGINAL_DIR = "original"

PROCESSED_DIR = "original"
os.makedirs(PROCESSED_DIR, exist_ok=True)
os.makedirs(ORIGINAL_DIR, exist_ok=True)

ALGORITHM = "HS256"
SECRET_KEY="nvsu-secret-key"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

Base.metadata.create_all(bind=engine)

class ProcessParams(BaseModel):
    effect_type: str  # "speedup", "slowed", "nightcore", "alleffects"
    speed: Optional[float] = 1.0
    reverb_amount: Optional[float] = 0.0
    pitch: Optional[float] = 1.0
    bass_gain: Optional[float] = 0.0
    flanger_mix: Optional[float] = 0.0
    volume: Optional[float] = 0.8

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.query(User).filter_by(username=username).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

@app.get("/history")
async def get_processing_history(current_user: User = Depends(get_current_user)):
    return {"history": current_user.processing_history}

@app.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter_by(username=user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Пользователь с таким именем уже существует")

    existing_email = db.query(User).filter_by(email=user.email).first()
    if existing_email:
        raise HTTPException(status_code=409, detail="Email уже зарегистрирован")

    hashed_password = pwd_context.hash(user.password)
    new_user = User(username=user.username, email=user.email, password_hash=hashed_password)

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Ошибка при регистрации пользователя")

    access_token = create_access_token(data={"sub": new_user.username})
    return {"username": new_user.username, "access_token": access_token}

@app.post("/login", response_model=UserResponse)
async def login(user:UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter_by(username=user.username).first()
    if not db_user or not pwd_context.verify(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": db_user.username})
    return {"username": db_user.username, "access_token": access_token}

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
    
@app.get("/download/{file_id}")
async def download_processed_file(file_id: str, current_user: User = Depends(get_current_user)):
    user_id = str(current_user.id)
    redis_key = f"{user_id}:{file_id}"
    file_path = redis_client.get(redis_key)
    
    print(f"Looking for key at: {redis_key}")
    print(f"Looking for file at: {file_path}")

    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found or expired")

    return FileResponse(
        path=file_path,
        filename=os.path.basename(file_path),
        media_type="audio/mp3",
    )
@app.get("/history-download-link")
async def history_download_link(filename: str, current_user: User = Depends(get_current_user)):
    user_id = str(current_user.id)
    file_path = os.path.join(PROCESSED_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    token = str(uuid4())
    redis_client.set(f"temp_download:{token}", file_path, ex=3000)

    return {"token": token}
@app.get("/temp-download/{token}")
async def temp_download(token: str):
    file_path = redis_client.get(f"temp_download:{token}")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Invalid or expired download link")
    
    print(f"TOKEN REQUESTED: {token}")
    print(f"FILE PATH FOUND: {file_path}")

    return FileResponse(
        path=file_path,
        filename=os.path.basename(file_path),
        media_type="audio/mp3",
    )

@app.get("/status/{task_id}")
async def get_task_status(task_id: str):
    task = AsyncResult(task_id)
    if task.state == "PENDING":
        return {"status": "pending"}
    elif task.state == "SUCCESS":
        filename = os.path.basename(task.result)
        token = str(uuid4())
        redis_client.set(f"temp_download:{token}", task.result, ex=timedelta(hours=1))
        print(f"TOKEN REQUESTED: {token}")
        print(f"FILE PATH FOUND: {filename}")

        return {
            "status": "success",
            "token": token,
            "filename": filename,
        }
    else:
        return {"status": "failed", "error": str(task.info)}

@app.post("/files/")
async def upload_file(
    current_user: User = Depends(get_current_user),
    file: UploadFile = File(...)
):
    user_id = str(current_user.id)
    file_id = str(file.filename.split('.mp3')[0] + "_" + str(uuid4())[::6])
    file_path = os.path.join(ORIGINAL_DIR, f"{file_id}.mp3")

    with open(file_path, "wb") as f:
        f.write(await file.read())

    redis_key = f"{user_id}:{file_id}"
    redis_client.set(redis_key, file_path, ex=timedelta(hours=1))

    return {"message": "File uploaded successfully", "file_id": file_id, "file_path": file_path}

@app.post("/process")
async def process_audio(
    current_user: User = Depends(get_current_user),
    file_id: str = Query(...),
    params: ProcessParams = Body(...)
):
    user_id = str(current_user.id)
    redis_key = f"{user_id}:{file_id}"
    file_path = redis_client.get(redis_key)

    if not file_path:
        raise HTTPException(status_code=404, detail="File not found")

    if params.effect_type == "speedup":
        task = speedup_audio.delay(file_path, speed=params.speed, volume=params.volume, user_id=user_id)
    elif params.effect_type == "slowed":
        task = slowed_reverb_audio.delay(file_path, speed=params.speed, reverb_amount=params.reverb_amount, volume=params.volume, user_id=user_id)
    elif params.effect_type == "nightcore":
        task = nightcore_audio.delay(file_path, speed=params.speed, pitch=params.pitch, volume=params.volume, user_id=user_id)
    elif params.effect_type == "alleffects":
        task = alleffects_audio.delay(file_path, speed=params.speed, pitch=params.pitch, reverb_amount=params.reverb_amount, volume=params.volume, bass_gain=params.bass_gain, flanger_mix=params.flanger_mix, user_id=user_id)    
    else:
        raise HTTPException(status_code=400, detail="Invalid effect type")

    return {"task_id": task.id}
