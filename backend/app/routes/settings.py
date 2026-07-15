import json
from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import JSONResponse
from bson import ObjectId
from backend.app.database import get_database
from backend.app.models.settings import UserSettings, SettingsUpdate
from backend.app.middlewares.auth_middleware import get_current_user

router = APIRouter(prefix="/settings", tags=["User Settings"])

@router.get("", response_model=UserSettings)
async def get_settings(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["_id"]
    
    settings = await db.settings.find_one({"user_id": user_id})
    if not settings:
        # Fallback creation
        default_settings = {
            "user_id": user_id,
            "currency": "USD",
            "theme": "dark",
            "language": "en",
            "email_notifications": True,
            "budget_alerts": True,
            "weekly_summaries": True,
            "updated_at": datetime.utcnow()
        }
        result = await db.settings.insert_one(default_settings)
        default_settings["_id"] = result.inserted_id
        settings = default_settings
        
    return UserSettings(
        id=str(settings["_id"]),
        user_id=str(user_id),
        currency=settings.get("currency", "USD"),
        theme=settings.get("theme", "dark"),
        language=settings.get("language", "en"),
        email_notifications=settings.get("email_notifications", True),
        budget_alerts=settings.get("budget_alerts", True),
        weekly_summaries=settings.get("weekly_summaries", True),
        updated_at=settings["updated_at"]
    )

@router.put("", response_model=UserSettings)
async def update_settings(
    settings_data: SettingsUpdate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    update_dict = {}
    for field, val in settings_data.model_dump(exclude_none=True).items():
        update_dict[field] = val
        
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields provided for updates")
        
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.settings.update_one(
        {"user_id": user_id},
        {"$set": update_dict},
        upsert=True
    )
    
    updated = await db.settings.find_one({"user_id": user_id})
    return UserSettings(
        id=str(updated["_id"]),
        user_id=str(user_id),
        currency=updated.get("currency", "USD"),
        theme=updated.get("theme", "dark"),
        language=updated.get("language", "en"),
        email_notifications=updated.get("email_notifications", True),
        budget_alerts=updated.get("budget_alerts", True),
        weekly_summaries=updated.get("weekly_summaries", True),
        updated_at=updated["updated_at"]
    )

@router.get("/backup")
async def export_data_backup(current_user: dict = Depends(get_current_user)):
    """
    Backs up all transactions, budgets, savings goals, categories, and settings in JSON format.
    """
    db = get_database()
    user_id = current_user["_id"]
    
    # 1. Fetch Categories
    categories = await db.categories.find({"user_id": user_id}).to_list(length=1000)
    for c in categories:
        c["_id"] = str(c["_id"])
        c["user_id"] = str(c["user_id"])
        c["created_at"] = c["created_at"].isoformat()
        c["updated_at"] = c["updated_at"].isoformat()
        
    # 2. Fetch Incomes
    incomes = await db.incomes.find({"user_id": user_id, "is_deleted": False}).to_list(length=10000)
    for i in incomes:
        i["_id"] = str(i["_id"])
        i["user_id"] = str(i["user_id"])
        i["category_id"] = str(i["category_id"])
        i["date"] = i["date"].isoformat()
        i["created_at"] = i["created_at"].isoformat()
        i["updated_at"] = i["updated_at"].isoformat()
        
    # 3. Fetch Expenses
    expenses = await db.expenses.find({"user_id": user_id, "is_deleted": False}).to_list(length=10000)
    for e in expenses:
        e["_id"] = str(e["_id"])
        e["user_id"] = str(e["user_id"])
        e["category_id"] = str(e["category_id"])
        e["date"] = e["date"].isoformat()
        e["created_at"] = e["created_at"].isoformat()
        e["updated_at"] = e["updated_at"].isoformat()
        
    # 4. Fetch Budgets
    budgets = await db.budgets.find({"user_id": user_id}).to_list(length=1000)
    for b in budgets:
        b["_id"] = str(b["_id"])
        b["user_id"] = str(b["user_id"])
        if b.get("category_id"):
            b["category_id"] = str(b["category_id"])
        b["created_at"] = b["created_at"].isoformat()
        b["updated_at"] = b["updated_at"].isoformat()
        
    # 5. Fetch Savings Goals
    goals = await db.savings_goals.find({"user_id": user_id}).to_list(length=1000)
    for g in goals:
        g["_id"] = str(g["_id"])
        g["user_id"] = str(g["user_id"])
        g["target_date"] = g["target_date"].isoformat()
        g["created_at"] = g["created_at"].isoformat()
        g["updated_at"] = g["updated_at"].isoformat()

    backup_payload = {
        "categories": categories,
        "incomes": incomes,
        "expenses": expenses,
        "budgets": budgets,
        "savings_goals": goals,
        "backup_date": datetime.utcnow().isoformat()
    }
    
    headers = {"Content-Disposition": "attachment; filename=smart_expense_backup.json"}
    return JSONResponse(content=backup_payload, headers=headers)

@router.post("/restore")
async def restore_data_backup(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    try:
        content = await file.read()
        backup = json.loads(content.decode("utf-8"))
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid JSON backup file format")
        
    # Purge current user records to overwrite
    await db.categories.delete_many({"user_id": user_id})
    await db.incomes.delete_many({"user_id": user_id})
    await db.expenses.delete_many({"user_id": user_id})
    await db.budgets.delete_many({"user_id": user_id})
    await db.savings_goals.delete_many({"user_id": user_id})
    
    # 1. Restore Categories
    cat_mapping = {}  # Map old category IDs to new category IDs
    for c in backup.get("categories", []):
        old_id = c["_id"]
        c_dict = {
            "name": c["name"],
            "type": c["type"],
            "icon": c["icon"],
            "color": c["color"],
            "user_id": user_id,
            "budget_limit": c.get("budget_limit"),
            "created_at": datetime.fromisoformat(c["created_at"]),
            "updated_at": datetime.fromisoformat(c["updated_at"])
        }
        res = await db.categories.insert_one(c_dict)
        cat_mapping[old_id] = res.inserted_id
        
    # Helper to resolve Category ID
    async def get_new_category_id(old_cat_id_str: str) -> ObjectId:
        if old_cat_id_str in cat_mapping:
            return cat_mapping[old_cat_id_str]
        # Check global system categories just in case
        try:
            return ObjectId(old_cat_id_str)
        except Exception:
            # Return any default fallback
            fallback = await db.categories.find_one({"user_id": None})
            return fallback["_id"] if fallback else ObjectId()

    # 2. Restore Incomes
    for i in backup.get("incomes", []):
        cat_id = await get_new_category_id(i["category_id"])
        await db.incomes.insert_one({
            "user_id": user_id,
            "type": "income",
            "amount": i["amount"],
            "date": datetime.fromisoformat(i["date"]),
            "category_id": cat_id,
            "description": i.get("description", ""),
            "tags": i.get("tags", []),
            "payment_method": i.get("payment_method", "Cash"),
            "merchant_name": i.get("merchant_name", ""),
            "location": i.get("location", ""),
            "is_deleted": False,
            "created_at": datetime.fromisoformat(i["created_at"]),
            "updated_at": datetime.fromisoformat(i["updated_at"])
        })
        
    # 3. Restore Expenses
    for e in backup.get("expenses", []):
        cat_id = await get_new_category_id(e["category_id"])
        await db.expenses.insert_one({
            "user_id": user_id,
            "type": "expense",
            "amount": e["amount"],
            "date": datetime.fromisoformat(e["date"]),
            "category_id": cat_id,
            "description": e.get("description", ""),
            "tags": e.get("tags", []),
            "payment_method": e.get("payment_method", "Cash"),
            "merchant_name": e.get("merchant_name", ""),
            "location": e.get("location", ""),
            "receipt_url": e.get("receipt_url", ""),
            "recurring_rule": e.get("recurring_rule", "none"),
            "priority": e.get("priority", "medium"),
            "is_deleted": False,
            "created_at": datetime.fromisoformat(e["created_at"]),
            "updated_at": datetime.fromisoformat(e["updated_at"])
        })
        
    # 4. Restore Budgets
    for b in backup.get("budgets", []):
        cat_id = None
        if b.get("category_id"):
            cat_id = await get_new_category_id(b["category_id"])
            
        await db.budgets.insert_one({
            "user_id": user_id,
            "category_id": cat_id,
            "limit_amount": b["limit_amount"],
            "period": b["period"],
            "alert_threshold": b.get("alert_threshold", 0.80),
            "current_spend": b.get("current_spend", 0.0),
            "created_at": datetime.fromisoformat(b["created_at"]),
            "updated_at": datetime.fromisoformat(b["updated_at"])
        })
        
    # 5. Restore Savings Goals
    for g in backup.get("savings_goals", []):
        await db.savings_goals.insert_one({
            "user_id": user_id,
            "name": g["name"],
            "target_amount": g["target_amount"],
            "current_amount": g["current_amount"],
            "target_date": datetime.fromisoformat(g["target_date"]),
            "is_completed": g.get("is_completed", False),
            "created_at": datetime.fromisoformat(g["created_at"]),
            "updated_at": datetime.fromisoformat(g["updated_at"])
        })
        
    return {"message": "Data backup restored successfully."}

@router.delete("/account")
async def delete_user_account(current_user: dict = Depends(get_current_user)):
    """
    Soft-deletes the user's account and labels records as deleted.
    """
    db = get_database()
    user_id = current_user["_id"]
    
    # 1. Soft delete user profile
    await db.users.update_one(
        {"_id": user_id},
        {"$set": {"is_deleted": True, "updated_at": datetime.utcnow()}}
    )
    
    # 2. Mark transactions soft deleted
    await db.expenses.update_many({"user_id": user_id}, {"$set": {"is_deleted": True}})
    await db.incomes.update_many({"user_id": user_id}, {"$set": {"is_deleted": True}})
    
    return {"message": "Account has been successfully deleted."}
