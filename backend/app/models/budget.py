from datetime import datetime
from typing import Optional
from pydantic import Field, BaseModel, field_validator
from backend.app.models.base import MongoBaseModel, PyObjectId

class Budget(MongoBaseModel):
    user_id: PyObjectId
    category_id: Optional[PyObjectId] = None  # None indicates an overall monthly budget
    limit_amount: float
    period: str  # Format: "YYYY-MM" (monthly) or "YYYY-Wnn" (weekly)
    alert_threshold: float = 0.80  # Alert when spending reaches 80% of budget
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator('limit_amount')
    @classmethod
    def limit_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError('Limit must be positive')
        return v

class BudgetCreate(BaseModel):
    category_id: Optional[str] = None
    limit_amount: float
    period: str  # e.g., "2026-07"
    alert_threshold: Optional[float] = 0.80

class BudgetResponse(MongoBaseModel):
    user_id: str
    category_id: Optional[str] = None
    category_detail: Optional[dict] = None
    limit_amount: float
    current_spend: float = 0.0
    period: str
    alert_threshold: float
    created_at: datetime
