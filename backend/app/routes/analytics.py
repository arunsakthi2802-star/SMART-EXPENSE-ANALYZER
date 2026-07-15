from datetime import datetime, timedelta
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, Query
from bson import ObjectId
import pandas as pd
import numpy as np
from backend.app.database import get_database
from backend.app.middlewares.auth_middleware import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("", response_model=Dict[str, Any])
async def get_analytics_metrics(
    days: int = Query(90, description="Number of days of data to analyze"),
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # 1. Fetch Incomes and Expenses
    incomes_cursor = db.incomes.find({"user_id": user_id, "is_deleted": False, "date": {"$gte": start_date}})
    incomes = await incomes_cursor.to_list(length=10000)
    
    expenses_cursor = db.expenses.find({"user_id": user_id, "is_deleted": False, "date": {"$gte": start_date}})
    expenses = await expenses_cursor.to_list(length=10000)
    
    # Convert to DataFrames
    df_inc = pd.DataFrame(incomes) if incomes else pd.DataFrame(columns=["amount", "date", "category_id"])
    df_exp = pd.DataFrame(expenses) if expenses else pd.DataFrame(columns=["amount", "date", "category_id", "priority", "payment_method"])
    
    # Check if empty
    if not df_exp.empty:
        df_exp['date'] = pd.to_datetime(df_exp['date'])
    if not df_inc.empty:
        df_inc['date'] = pd.to_datetime(df_inc['date'])
        
    # Standard values
    avg_spending = 0.0
    highest_spend = 0.0
    lowest_spend = 0.0
    
    if not df_exp.empty:
        avg_spending = float(df_exp['amount'].mean())
        highest_spend = float(df_exp['amount'].max())
        lowest_spend = float(df_exp['amount'].min())
        
    # 2. Time Trend (grouped by month or week depending on timeframe)
    # We will build monthly intervals for the last 6 months
    trend_data = []
    for i in range(5, -1, -1):
        target_date = datetime.utcnow() - timedelta(days=i*30)
        month_label = target_date.strftime("%b %Y")
        
        m_start = datetime(target_date.year, target_date.month, 1)
        if target_date.month == 12:
            m_end = datetime(target_date.year + 1, 1, 1)
        else:
            m_end = datetime(target_date.year, target_date.month + 1, 1)
            
        m_inc = sum(t["amount"] for t in incomes if m_start <= t["date"] < m_end)
        m_exp = sum(t["amount"] for t in expenses if m_start <= t["date"] < m_end)
        
        trend_data.append({
            "label": month_label,
            "income": m_inc,
            "expense": m_exp,
            "savings": m_inc - m_exp
        })
        
    # 3. Category distribution (Expenses)
    category_split = {}
    for e in expenses:
        cat_id = str(e["category_id"])
        if cat_id not in category_split:
            cat = await db.categories.find_one({"_id": e["category_id"]})
            cat_name = cat["name"] if cat else "N/A"
            cat_color = cat["color"] if cat else "#6B7280"
            category_split[cat_id] = {"name": cat_name, "color": cat_color, "value": 0.0}
        category_split[cat_id]["value"] += e["amount"]
        
    expense_distribution = list(category_split.values())
    expense_distribution.sort(key=lambda x: x["value"], reverse=True)
    
    # 4. Cash Flow cumulative values
    cumulative_cashflow = []
    running_balance = 0.0
    # Group combined transactions by date and trace cumulative growth
    all_txs = []
    for i in incomes:
        all_txs.append({"date": i["date"], "amount": i["amount"]})
    for e in expenses:
        all_txs.append({"date": e["date"], "amount": -e["amount"]})
        
    all_txs.sort(key=lambda x: x["date"])
    
    # Bucket by day/week
    df_txs = pd.DataFrame(all_txs)
    if not df_txs.empty:
        df_txs['date'] = pd.to_datetime(df_txs['date']).dt.date
        daily_flow = df_txs.groupby('date')['amount'].sum().reset_index()
        for idx, row in daily_flow.iterrows():
            running_balance += row['amount']
            cumulative_cashflow.append({
                "date": row['date'].strftime("%Y-%m-%d"),
                "balance": float(running_balance)
            })
            
    # 5. Peak spending days of week (0=Monday, 6=Sunday)
    weekday_frequency = [0.0] * 7
    weekday_labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    
    if not df_exp.empty:
        df_exp['weekday'] = df_exp['date'].dt.weekday
        weekday_group = df_exp.groupby('weekday')['amount'].sum()
        for day_idx in range(7):
            if day_idx in weekday_group.index:
                weekday_frequency[day_idx] = float(weekday_group[day_idx])
                
    peak_spending_days = [{"day": label, "amount": amt} for label, amt in zip(weekday_labels, weekday_frequency)]
    
    # 6. Payment method usage distribution
    payment_method_distribution = []
    if not df_exp.empty:
        pm_group = df_exp.groupby('payment_method')['amount'].sum()
        for pm, amt in pm_group.items():
            payment_method_distribution.append({
                "method": pm,
                "amount": float(amt)
            })

    return {
        "summary": {
            "average_spending": round(avg_spending, 2),
            "highest_spending": round(highest_spend, 2),
            "lowest_spending": round(lowest_spend, 2),
            "total_income": sum(i["amount"] for i in incomes),
            "total_expense": sum(e["amount"] for e in expenses)
        },
        "trends": trend_data,
        "expense_distribution": expense_distribution,
        "cumulative_cashflow": cumulative_cashflow[-30:],  # last 30 entries
        "peak_spending_days": peak_spending_days,
        "payment_method_distribution": payment_method_distribution
    }
