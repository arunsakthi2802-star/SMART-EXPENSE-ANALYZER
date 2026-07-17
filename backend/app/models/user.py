from datetime import datetime
from typing import Optional
import re
from pydantic import EmailStr, Field, BaseModel, field_validator
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

    @field_validator('name')
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Name cannot be empty')
        if len(v) < 2:
            raise ValueError('Name must be at least 2 characters')
        return v

    @field_validator('password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        return v

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
