from datetime import datetime
from typing import List, Optional
from pydantic import Field, BaseModel, field_validator
from backend.app.models.base import MongoBaseModel, PyObjectId

class Transaction(MongoBaseModel):
    user_id: PyObjectId
    type: str  # "income" or "expense"
    amount: float
    date: datetime = Field(default_factory=datetime.utcnow)
    category_id: PyObjectId
    description: Optional[str] = ""
    tags: List[str] = Field(default_factory=list)
    payment_method: str = "Cash"  # "Cash", "Card", "UPI", "Bank Transfer"
    merchant_name: Optional[str] = ""
    location: Optional[str] = ""
    receipt_url: Optional[str] = ""
    recurring_rule: str = "none"  # "none", "daily", "weekly", "monthly", "yearly"
    priority: str = "medium"  # "low", "medium", "high" (mainly for expenses)
    is_deleted: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator('amount')
    @classmethod
    def amount_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError('Amount must be positive')
        return v

    @field_validator('type')
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in ('income', 'expense'):
            raise ValueError('Type must be either "income" or "expense"')
        return v

class TransactionCreate(BaseModel):
    type: str
    amount: float
    date: Optional[datetime] = None
    category_id: str
    description: Optional[str] = ""
    tags: Optional[List[str]] = []
    payment_method: Optional[str] = "Cash"
    merchant_name: Optional[str] = ""
    location: Optional[str] = ""
    receipt_url: Optional[str] = ""
    recurring_rule: Optional[str] = "none"
    priority: Optional[str] = "medium"

    @field_validator('amount')
    @classmethod
    def amount_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError('Amount must be positive')
        return v

class TransactionResponse(MongoBaseModel):
    user_id: str
    type: str
    amount: float
    date: datetime
    category_id: str
    category_detail: Optional[dict] = None  # Populated via DB lookup
    description: str
    tags: List[str]
    payment_method: str
    merchant_name: str
    location: str
    receipt_url: str
    recurring_rule: str
    priority: str
    created_at: datetime
    updated_at: datetime

class BulkDeleteRequest(BaseModel):
    ids: List[str]

class TransactionImportRow(BaseModel):
    type: str  # "income" or "expense"
    amount: float
    date: str  # YYYY-MM-DD
    category_name: str
    description: Optional[str] = ""
    payment_method: Optional[str] = "Cash"
    merchant_name: Optional[str] = ""
