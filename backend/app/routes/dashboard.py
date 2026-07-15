from datetime import datetime, time
from typing import Dict, Any
from fastapi import APIRouter, Depends
from bson import ObjectId
from backend.app.database import get_database
from backend.app.middlewares.auth_middleware import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("", response_model=Dict[str, Any])
async def get_dashboard_summary(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["_id"]
    
    # Time constants
    now = datetime.utcnow()
    today_start = datetime.combine(now.date(), time.min)
    today_end = datetime.combine(now.date(), time.max)
    
    current_month_str = now.strftime("%Y-%m")
    month_start = datetime.strptime(f"{current_month_str}-01", "%Y-%m-%d")
    
    # 1. Calculate Balances
    # Total Income (all time)
    cursor_all_income = db.incomes.aggregate([
        {"$match": {"user_id": user_id, "is_deleted": False}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ])
    all_income_res = await cursor_all_income.to_list(length=1)
    total_income_all = all_income_res[0]["total"] if all_income_res else 0.0
    
    # Total Expense (all time)
    cursor_all_expense = db.expenses.aggregate([
        {"$match": {"user_id": user_id, "is_deleted": False}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ])
    all_expense_res = await cursor_all_expense.to_list(length=1)
    total_expense_all = all_expense_res[0]["total"] if all_expense_res else 0.0
    
    net_balance = total_income_all - total_expense_all
    
    # 2. Today's metrics
    cursor_today_income = db.incomes.aggregate([
        {"$match": {"user_id": user_id, "is_deleted": False, "date": {"$gte": today_start, "$lte": today_end}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ])
    today_income_res = await cursor_today_income.to_list(length=1)
    today_income = today_income_res[0]["total"] if today_income_res else 0.0
    
    cursor_today_expense = db.expenses.aggregate([
        {"$match": {"user_id": user_id, "is_deleted": False, "date": {"$gte": today_start, "$lte": today_end}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ])
    today_expense_res = await cursor_today_expense.to_list(length=1)
    today_expense = today_expense_res[0]["total"] if today_expense_res else 0.0
    
    # 3. Monthly metrics
    cursor_month_income = db.incomes.aggregate([
        {"$match": {"user_id": user_id, "is_deleted": False, "date": {"$gte": month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ])
    month_income_res = await cursor_month_income.to_list(length=1)
    monthly_income = month_income_res[0]["total"] if month_income_res else 0.0
    
    cursor_month_expense = db.expenses.aggregate([
        {"$match": {"user_id": user_id, "is_deleted": False, "date": {"$gte": month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ])
    month_expense_res = await cursor_month_expense.to_list(length=1)
    monthly_expense = month_expense_res[0]["total"] if month_expense_res else 0.0
    
    # 4. Budget remaining
    # Find overall budget limit for current month
    overall_budget = await db.budgets.find_one({
        "user_id": user_id,
        "category_id": None,
        "period": current_month_str
    })
    
    budget_limit = overall_budget["limit_amount"] if overall_budget else 0.0
    budget_remaining = max(0.0, budget_limit - monthly_expense) if budget_limit > 0 else 0.0
    
    # 5. Top category breakdowns
    cursor_cat_expense = db.expenses.aggregate([
        {"$match": {"user_id": user_id, "is_deleted": False, "date": {"$gte": month_start}}},
        {"$group": {"_id": "$category_id", "total": {"$sum": "$amount"}}},
        {"$sort": {"total": -1}}
    ])
    cat_expense_res = await cursor_cat_expense.to_list(length=5)
    
    top_categories = []
    for item in cat_expense_res:
        cat = await db.categories.find_one({"_id": item["_id"]})
        if cat:
            top_categories.append({
                "category_name": cat["name"],
                "color": cat["color"],
                "icon": cat["icon"],
                "amount": item["total"]
            })
            
    # 6. Recent transactions (Limit 6)
    recent_transactions = []
    # Incomes
    cursor_rec_inc = db.incomes.find({"user_id": user_id, "is_deleted": False}).sort("date", -1).limit(6)
    rec_incomes = await cursor_rec_inc.to_list(length=6)
    # Expenses
    cursor_rec_exp = db.expenses.find({"user_id": user_id, "is_deleted": False}).sort("date", -1).limit(6)
    rec_expenses = await cursor_rec_exp.to_list(length=6)
    
    raw_recent = rec_incomes + rec_expenses
    raw_recent.sort(key=lambda x: x.get("date", now), reverse=True)
    
    for tx in raw_recent[:6]:
        cat = await db.categories.find_one({"_id": tx["category_id"]})
        recent_transactions.append({
            "id": str(tx["_id"]),
            "type": tx["type"],
            "amount": tx["amount"],
            "date": tx["date"].strftime("%Y-%m-%d"),
            "category_name": cat["name"] if cat else "N/A",
            "color": cat["color"] if cat else "#9CA3AF",
            "description": tx.get("description") or tx.get("merchant_name") or "Transaction"
        })
        
    # 7. Savings progress (overall goals milestone)
    cursor_goals = db.savings_goals.find({"user_id": user_id})
    goals = await cursor_goals.to_list(length=5)
    total_saved_goals = sum(g.get("current_amount", 0.0) for g in goals)
    
    # 8. Financial Health Score
    # Fetch budgets to score compliance
    cursor_b = db.budgets.find({"user_id": user_id, "period": current_month_str})
    budgets_list = await cursor_b.to_list(length=50)
    
    # Dynamic calculation using our AI module
    from backend.app.services.ai_service import AIService
    # Format list
    hist_inc = []
    for i in rec_incomes:
        cat = await db.categories.find_one({"_id": i["category_id"]})
        hist_inc.append({
            "amount": i["amount"],
            "category_name": cat["name"] if cat else "Other"
        })
        
    hist_exp = []
    for e in rec_expenses:
        cat = await db.categories.find_one({"_id": e["category_id"]})
        hist_exp.append({
            "amount": e["amount"],
            "priority": e.get("priority", "medium"),
            "category_name": cat["name"] if cat else "Other"
        })
        
    health_data = AIService.calculate_health_score(
        incomes=hist_inc if hist_inc else [{"amount": monthly_income}],
        expenses=hist_exp if hist_exp else [{"amount": monthly_expense, "priority": "medium"}],
        budgets=budgets_list
    )
    
    return {
        "net_balance": net_balance,
        "today_income": today_income,
        "today_expense": today_expense,
        "monthly_income": monthly_income,
        "monthly_expense": monthly_expense,
        "budget_limit": budget_limit,
        "budget_remaining": budget_remaining,
        "total_saved_goals": total_saved_goals,
        "top_categories": top_categories,
        "recent_transactions": recent_transactions,
        "health_score": health_data["score"],
        "health_grade": "Excellent" if health_data["score"] >= 80 else "Good" if health_data["score"] >= 60 else "Fair" if health_data["score"] >= 40 else "Needs Attention"
    }
