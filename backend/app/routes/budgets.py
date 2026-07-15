from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from backend.app.database import get_database
from backend.app.models.budget import Budget, BudgetCreate, BudgetResponse
from backend.app.models.savings_goal import SavingsGoal, SavingsGoalCreate, SavingsGoalUpdate
from backend.app.middlewares.auth_middleware import get_current_user

router = APIRouter(prefix="/budgets", tags=["Budgets & Savings"])

@router.get("", response_model=List[BudgetResponse])
async def list_budgets(
    period: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    current_month = period or datetime.utcnow().strftime("%Y-%m")
    
    cursor = db.budgets.find({"user_id": user_id, "period": current_month})
    budgets = await cursor.to_list(length=100)
    
    # Calculate spending dynamically for each budget category
    response = []
    for b in budgets:
        cat_id = b.get("category_id")
        
        # Calculate current spend in this month/category
        match_query = {
            "user_id": user_id,
            "type": "expense",
            "is_deleted": False,
            "date": {
                "$gte": datetime.strptime(f"{current_month}-01", "%Y-%m-%d"),
                "$lt": datetime.utcnow() + timedelta(days=31)
            }
        }
        
        category_detail = None
        if cat_id:
            match_query["category_id"] = cat_id
            cat = await db.categories.find_one({"_id": cat_id})
            if cat:
                category_detail = {
                    "id": str(cat["_id"]),
                    "name": cat["name"],
                    "icon": cat["icon"],
                    "color": cat["color"]
                }
                
        pipeline = [
            {"$match": match_query},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        
        cursor_agg = db.expenses.aggregate(pipeline)
        result = await cursor_agg.to_list(length=1)
        spent = result[0]["total"] if result else 0.0
        
        # Sync spent in DB for quick indices lookups
        await db.budgets.update_one({"_id": b["_id"]}, {"$set": {"current_spend": spent}})
        
        response.append(BudgetResponse(
            id=str(b["_id"]),
            user_id=str(user_id),
            category_id=str(cat_id) if cat_id else None,
            category_detail=category_detail,
            limit_amount=b["limit_amount"],
            current_spend=spent,
            period=b["period"],
            alert_threshold=b.get("alert_threshold", 0.80),
            created_at=b["created_at"]
        ))
        
    return response


@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
async def set_budget(
    budget_data: BudgetCreate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    category_id = None
    category_detail = None
    if budget_data.category_id:
        try:
            category_id = ObjectId(budget_data.category_id)
            cat = await db.categories.find_one({"_id": category_id})
            if not cat:
                raise HTTPException(status_code=404, detail="Category not found")
            category_detail = {
                "id": str(cat["_id"]),
                "name": cat["name"],
                "icon": cat["icon"],
                "color": cat["color"]
            }
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid Category ID format")
            
    # Check if budget already exists for this category and period, then update it
    existing = await db.budgets.find_one({
        "user_id": user_id,
        "category_id": category_id,
        "period": budget_data.period
    })
    
    if existing:
        await db.budgets.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "limit_amount": budget_data.limit_amount,
                "alert_threshold": budget_data.alert_threshold or 0.80,
                "updated_at": datetime.utcnow()
            }}
        )
        b_doc = await db.budgets.find_one({"_id": existing["_id"]})
    else:
        new_budget = Budget(
            user_id=user_id,
            category_id=category_id,
            limit_amount=budget_data.limit_amount,
            period=budget_data.period,
            alert_threshold=budget_data.alert_threshold or 0.80
        )
        b_dict = new_budget.to_mongo()
        result = await db.budgets.insert_one(b_dict)
        b_doc = b_dict
        b_doc["_id"] = result.inserted_id

    # If this is category specific, also update the master category default budget ceiling
    if category_id:
        await db.categories.update_one(
            {"_id": category_id, "user_id": user_id},
            {"$set": {"budget_limit": budget_data.limit_amount}}
        )

    return BudgetResponse(
        id=str(b_doc["_id"]),
        user_id=str(user_id),
        category_id=str(category_id) if category_id else None,
        category_detail=category_detail,
        limit_amount=b_doc["limit_amount"],
        current_spend=b_doc.get("current_spend", 0.0),
        period=b_doc["period"],
        alert_threshold=b_doc.get("alert_threshold", 0.80),
        created_at=b_doc["created_at"]
    )

# Savings Goal Endpoints
@router.get("/goals", response_model=List[SavingsGoal])
async def list_savings_goals(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["_id"]
    cursor = db.savings_goals.find({"user_id": user_id})
    goals = await cursor.to_list(length=100)
    return goals

@router.post("/goals", response_model=SavingsGoal, status_code=status.HTTP_201_CREATED)
async def create_savings_goal(
    goal_data: SavingsGoalCreate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    new_goal = SavingsGoal(
        user_id=user_id,
        name=goal_data.name,
        target_amount=goal_data.target_amount,
        current_amount=goal_data.current_amount or 0.0,
        target_date=goal_data.target_date,
        is_completed=(goal_data.current_amount or 0.0) >= goal_data.target_amount
    )
    
    goal_dict = new_goal.to_mongo()
    result = await db.savings_goals.insert_one(goal_dict)
    goal_dict["_id"] = result.inserted_id
    
    # Notify goal created
    await db.notifications.insert_one({
        "user_id": user_id,
        "title": "Savings Goal Created",
        "message": f"Goal '{goal_data.name}' with a target of ${goal_data.target_amount:.2f} is active.",
        "type": "savings_goal",
        "is_read": False,
        "created_at": datetime.utcnow()
    })
    
    return goal_dict

@router.put("/goals/{goal_id}", response_model=SavingsGoal)
async def update_savings_goal(
    goal_id: str,
    goal_data: SavingsGoalUpdate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    try:
        obj_id = ObjectId(goal_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Goal ID format")
        
    goal = await db.savings_goals.find_one({"_id": obj_id, "user_id": user_id})
    if not goal:
        raise HTTPException(status_code=404, detail="Savings goal not found")
        
    update_dict = {}
    if goal_data.name is not None:
        update_dict["name"] = goal_data.name
    if goal_data.target_amount is not None:
        update_dict["target_amount"] = goal_data.target_amount
    if goal_data.current_amount is not None:
        update_dict["current_amount"] = goal_data.current_amount
    if goal_data.target_date is not None:
        update_dict["target_date"] = goal_data.target_date
    if goal_data.is_completed is not None:
        update_dict["is_completed"] = goal_data.is_completed
        
    # Recalculate is_completed if amount/target changed
    tgt = update_dict.get("target_amount", goal["target_amount"])
    curr = update_dict.get("current_amount", goal["current_amount"])
    if curr >= tgt:
        update_dict["is_completed"] = True
        
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.savings_goals.update_one({"_id": obj_id}, {"$set": update_dict})
    
    # Check if newly completed to alert user
    if curr >= tgt and not goal.get("is_completed", False):
        await db.notifications.insert_one({
            "user_id": user_id,
            "title": "Savings Goal Completed! 🎉",
            "message": f"Congratulations! You reached your savings target of ${tgt:.2f} for '{update_dict.get('name', goal['name'])}'.",
            "type": "savings_goal",
            "is_read": False,
            "created_at": datetime.utcnow()
        })
        
    updated = await db.savings_goals.find_one({"_id": obj_id})
    return updated

@router.delete("/goals/{goal_id}")
async def delete_savings_goal(
    goal_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    try:
        obj_id = ObjectId(goal_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Goal ID format")
        
    result = await db.savings_goals.delete_one({"_id": obj_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Savings goal not found")
        
    return {"message": "Savings goal deleted successfully"}
