from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
from pydantic import BaseModel

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True)
    password_hash = Column(String(128))
    email = Column(String, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    processing_history = relationship("ProcessingHistory", back_populates="user", cascade="all, delete-orphan")

class ProcessingHistory(Base):
    __tablename__ = "history"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    original_filename = Column(String(255))
    processed_filename = Column(String(255))
    effect_type = Column(String(50))
    parameters = Column(JSON)
    processed_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="processing_history")

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    username: str
    access_token: str
    token_type: str = "bearer"