from datetime import datetime
from typing import Optional
from pydantic import EmailStr, Field, BaseModel
from backend.app.models.base import MongoBaseModel, PyObjectId

class User(MongoBaseModel):
    name: str
    email: EmailStr
    password_hash: str
    role: str = "user"  # "user", "business", "admin"
    is_verified: bool = False
    profile_picture: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_deleted: bool = False

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "user"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    is_verified: bool
    profile_picture: Optional[str] = None
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[str] = None
    role: Optional[str] = None

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    profile_picture: Optional[str] = None

class ChangePassword(BaseModel):
    current_password: str
    new_password: str
