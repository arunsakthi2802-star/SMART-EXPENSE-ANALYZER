from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from typing import Dict, Any, List, Optional
from backend.app.database import get_database
from backend.app.middlewares.auth_middleware import get_current_user
from backend.app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["AI Analytics & Predictions"])

@router.get("/predict-category")
async def get_predicted_category(
    description: str,
    merchant: Optional[str] = "",
    tx_type: str = "expense",
    current_user: dict = Depends(get_current_user)
):
    """
    Predicts the category of a transaction based on keywords.
    """
    category_name = AIService.predict_category(description, merchant or "", tx_type)
    
    # Check if this category exists in the system to return its color/icon
    db = get_database()
    cat = await db.categories.find_one({
        "name": {"$regex": f"^{category_name}$", "$options": "i"},
        "$or": [{"user_id": None}, {"user_id": current_user["_id"]}]
    })
    
    if cat:
        return {
            "category_id": str(cat["_id"]),
            "category_name": cat["name"],
            "icon": cat["icon"],
            "color": cat["color"]
        }
        
    return {
        "category_id": None,
        "category_name": category_name,
        "icon": "Tag",
        "color": "#6B7280"
    }


@router.get("/forecast-spending")
async def forecast_next_month_spending(current_user: dict = Depends(get_current_user)):
    """
    Forecasts next month's category spending based on history.
    """
    db = get_database()
    user_id = current_user["_id"]
    
    # Fetch previous 3 months expenses
    three_months_ago = datetime.utcnow() - timedelta(days=90)
    cursor = db.expenses.find({"user_id": user_id, "is_deleted": False, "date": {"$gte": three_months_ago}})
    expenses = await cursor.to_list(length=10000)
    
    # Format with category names for AI engine
    formatted_expenses = []
    for e in expenses:
        cat = await db.categories.find_one({"_id": e["category_id"]})
        formatted_expenses.append({
            "amount": e["amount"],
            "date": e["date"],
            "category_name": cat["name"] if cat else "Other"
        })
        
    predictions = AIService.predict_future_spending(formatted_expenses)
    
    # Map predictions to UI-friendly output containing category configurations
    response = []
    for cat_name, predicted_amt in predictions.items():
        cat = await db.categories.find_one({
            "name": cat_name,
            "$or": [{"user_id": None}, {"user_id": user_id}]
        })
        response.append({
            "category_name": cat_name,
            "predicted_amount": round(predicted_amt, 2),
            "color": cat["color"] if cat else "#6B7280",
            "icon": cat["icon"] if cat else "Tag"
        })
        
    return response

@router.get("/anomalies", response_model=List[Dict[str, Any]])
async def list_spend_anomalies(current_user: dict = Depends(get_current_user)):
    """
    Analyzes user transactions and returns lists of detected anomalies.
    """
    db = get_database()
    user_id = current_user["_id"]
    
    # Fetch historical transactions
    cursor = db.expenses.find({"user_id": user_id, "is_deleted": False}).sort("date", -1)
    expenses = await cursor.to_list(length=500)
    
    anomalies = []
    # Loop over expenses and double check if they breach standard deviations limits
    # We pass the list excluding the transaction itself for validation
    for i, e in enumerate(expenses):
        cat = await db.categories.find_one({"_id": e["category_id"]})
        cat_name = cat["name"] if cat else "Other"
        
        # Historical slice
        history = expenses[i+1:]
        formatted_history = [{"amount": h["amount"], "category_name": h.get("cat_name", "Other")} for h in history]
        # set cat name
        for h in formatted_history:
            h["category_name"] = cat_name
            
        report = AIService.detect_anomalies(e["amount"], cat_name, formatted_history)
        if report["is_anomaly"]:
            anomalies.append({
                "transaction_id": str(e["_id"]),
                "amount": e["amount"],
                "date": e["date"].strftime("%Y-%m-%d"),
                "category_name": cat_name,
                "color": cat["color"] if cat else "#6B7280",
                "merchant_name": e.get("merchant_name", "Unknown Merchant"),
                "reason": report["reason"],
                "confidence": round(report["confidence"] * 100, 1)
            })
            
    return anomalies[:15]  # Limit to top 15 anomalies

@router.get("/health-score")
async def get_financial_health(current_user: dict = Depends(get_current_user)):
    """
    Aggregates user transactions and budgets to return a financial health assessment.
    """
    db = get_database()
    user_id = current_user["_id"]
    current_month = datetime.utcnow().strftime("%Y-%m")
    month_start = datetime.strptime(f"{current_month}-01", "%Y-%m-%d")
    
    # Fetch records
    inc_cursor = db.incomes.find({"user_id": user_id, "is_deleted": False, "date": {"$gte": month_start}})
    incomes = await inc_cursor.to_list(length=1000)
    
    exp_cursor = db.expenses.find({"user_id": user_id, "is_deleted": False, "date": {"$gte": month_start}})
    expenses = await exp_cursor.to_list(length=1000)
    
    budgets_cursor = db.budgets.find({"user_id": user_id, "period": current_month})
    budgets = await budgets_cursor.to_list(length=100)
    
    # Calculate score
    formatted_inc = []
    for i in incomes:
        cat = await db.categories.find_one({"_id": i["category_id"]})
        formatted_inc.append({
            "amount": i["amount"],
            "category_name": cat["name"] if cat else "Other"
        })
        
    formatted_exp = []
    for e in expenses:
        cat = await db.categories.find_one({"_id": e["category_id"]})
        formatted_exp.append({
            "amount": e["amount"],
            "priority": e.get("priority", "medium"),
            "category_name": cat["name"] if cat else "Other"
        })
    
    # If no data this month, grab last 30 days overall
    if not formatted_exp and not formatted_inc:
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        inc_fallback = await db.incomes.find({"user_id": user_id, "is_deleted": False, "date": {"$gte": thirty_days_ago}}).to_list(length=1000)
        exp_fallback = await db.expenses.find({"user_id": user_id, "is_deleted": False, "date": {"$gte": thirty_days_ago}}).to_list(length=1000)
        
        formatted_inc = []
        for i in inc_fallback:
            cat = await db.categories.find_one({"_id": i["category_id"]})
            formatted_inc.append({
                "amount": i["amount"],
                "category_name": cat["name"] if cat else "Other"
            })
            
        formatted_exp = []
        for e in exp_fallback:
            cat = await db.categories.find_one({"_id": e["category_id"]})
            formatted_exp.append({
                "amount": e["amount"],
                "priority": e.get("priority", "medium"),
                "category_name": cat["name"] if cat else "Other"
            })
        
    health_report = AIService.calculate_health_score(formatted_inc, formatted_exp, budgets)
    return health_report
