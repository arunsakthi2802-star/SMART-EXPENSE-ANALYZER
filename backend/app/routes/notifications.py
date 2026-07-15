from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from backend.app.database import get_database
from backend.app.models.notification import NotificationResponse
from backend.app.middlewares.auth_middleware import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationResponse])
async def list_notifications(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["_id"]
    
    cursor = db.notifications.find({"user_id": user_id}).sort("created_at", -1)
    notifications = await cursor.to_list(length=100)
    
    response = []
    for n in notifications:
        response.append(NotificationResponse(
            id=str(n["_id"]),
            user_id=str(user_id),
            title=n["title"],
            message=n["message"],
            type=n["type"],
            is_read=n.get("is_read", False),
            created_at=n["created_at"]
        ))
        
    return response

@router.put("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    try:
        obj_id = ObjectId(notification_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Notification ID format")
        
    result = await db.notifications.update_one(
        {"_id": obj_id, "user_id": user_id},
        {"$set": {"is_read": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    return {"message": "Notification marked as read"}

@router.put("/read-all")
async def mark_all_notifications_as_read(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["_id"]
    
    await db.notifications.update_many(
        {"user_id": user_id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    return {"message": "All notifications marked as read"}

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    try:
        obj_id = ObjectId(notification_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Notification ID format")
        
    result = await db.notifications.delete_one({"_id": obj_id, "user_id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    return {"message": "Notification deleted successfully"}

@router.delete("/clear-read")
async def clear_all_read_notifications(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["_id"]
    
    result = await db.notifications.delete_many({"user_id": user_id, "is_read": True})
    return {"message": f"Deleted {result.deleted_count} read notifications"}
