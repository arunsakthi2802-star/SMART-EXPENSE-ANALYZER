from datetime import datetime
from typing import Optional
from pydantic import Field, BaseModel, field_validator
from backend.app.models.base import MongoBaseModel, PyObjectId

class SavingsGoal(MongoBaseModel):
    user_id: PyObjectId
    name: str
    target_amount: float
    current_amount: float = 0.0
    target_date: datetime
    is_completed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator('target_amount')
    @classmethod
    def target_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError('Target amount must be positive')
        return v

    @field_validator('current_amount')
    @classmethod
    def current_must_be_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError('Current amount cannot be negative')
        return v

class SavingsGoalCreate(BaseModel):
    name: str
    target_amount: float
    current_amount: Optional[float] = 0.0
    target_date: datetime

class SavingsGoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    target_date: Optional[datetime] = None
    is_completed: Optional[bool] = None
