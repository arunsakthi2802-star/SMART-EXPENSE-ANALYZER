from datetime import datetime
from pydantic import Field, BaseModel
from backend.app.models.base import MongoBaseModel, PyObjectId

class Notification(MongoBaseModel):
    user_id: PyObjectId
    title: str
    message: str
    type: str  # "budget_exceeded", "upcoming_bill", "savings_goal", "low_balance", "security_alert", "info"
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class NotificationResponse(MongoBaseModel):
    user_id: str
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime
