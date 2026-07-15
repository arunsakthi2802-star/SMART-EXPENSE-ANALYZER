from datetime import datetime
from typing import Optional
from pydantic import Field, BaseModel
from backend.app.models.base import MongoBaseModel, PyObjectId

class UserSettings(MongoBaseModel):
    user_id: PyObjectId
    currency: str = "USD"  # "USD", "EUR", "INR", "GBP", etc.
    theme: str = "dark"  # "dark" or "light"
    language: str = "en"
    email_notifications: bool = True
    budget_alerts: bool = True
    weekly_summaries: bool = True
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class SettingsUpdate(BaseModel):
    currency: Optional[str] = None
    theme: Optional[str] = None
    language: Optional[str] = None
    email_notifications: Optional[bool] = None
    budget_alerts: Optional[bool] = None
    weekly_summaries: Optional[bool] = None
