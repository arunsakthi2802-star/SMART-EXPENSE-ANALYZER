from datetime import datetime
from typing import Optional
from pydantic import Field, BaseModel
from backend.app.models.base import MongoBaseModel, PyObjectId

class Category(MongoBaseModel):
    name: str
    type: str  # "income" or "expense"
    icon: str  # Lucide icon name, e.g. "ShoppingBag"
    color: str  # Hex color, e.g. "#3B82F6"
    user_id: Optional[PyObjectId] = None  # None for default system categories
    budget_limit: Optional[float] = None  # Optional budget ceiling
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CategoryCreate(BaseModel):
    name: str
    type: str  # "income" or "expense"
    icon: str
    color: str
    budget_limit: Optional[float] = None

class CategoryResponse(MongoBaseModel):
    name: str
    type: str
    icon: str
    color: str
    user_id: Optional[str] = None
    budget_limit: Optional[float] = None
    created_at: datetime
