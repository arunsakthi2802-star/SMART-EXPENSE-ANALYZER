from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from backend.app.database import get_database
from backend.app.middlewares.auth_middleware import get_current_user
from backend.app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["Reports Export"])

@router.get("/export")
async def export_report(
    format: str = Query("pdf", description="'pdf' or 'excel'"),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    query = {"user_id": user_id, "is_deleted": False}
    
    if start_date or end_date:
        query["date"] = {}
        if start_date:
            query["date"]["$gte"] = start_date
        if end_date:
            if end_date.hour == 0 and end_date.minute == 0 and end_date.second == 0:
                end_date = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)
            query["date"]["$lte"] = end_date
            
    # Fetch Incomes and Expenses
    incomes = await db.incomes.find(query).to_list(length=5000)
    expenses = await db.expenses.find(query).to_list(length=5000)
    
    # Merge and populate category names
    transactions = []
    
    for i in incomes:
        cat = await db.categories.find_one({"_id": i["category_id"]})
        i["category_name"] = cat["name"] if cat else "N/A"
        transactions.append(i)
        
    for e in expenses:
        cat = await db.categories.find_one({"_id": e["category_id"]})
        e["category_name"] = cat["name"] if cat else "N/A"
        transactions.append(e)
        
    if not transactions:
        raise HTTPException(
            status_code=404,
            detail="No transactions found for the specified period to export."
        )
        
    # Sort
    transactions.sort(key=lambda x: x.get("date", datetime.utcnow()), reverse=True)
    
    # Calculate AI insights for report
    from backend.app.services.ai_service import AIService
    current_month = datetime.utcnow().strftime("%Y-%m")
    budgets_cursor = db.budgets.find({"user_id": user_id, "period": current_month})
    budgets = await budgets_cursor.to_list(length=100)
    
    formatted_inc = [{"amount": t["amount"], "category_name": t.get("category_name", "Other")} for t in transactions if t["type"] == "income"]
    formatted_exp = [{"amount": t["amount"], "priority": t.get("priority", "medium"), "category_name": t.get("category_name", "Other")} for t in transactions if t["type"] == "expense"]
    
    ai_insights = AIService.calculate_health_score(formatted_inc, formatted_exp, budgets)
    
    user_name = current_user.get("name", "User")
    period_str = "Custom Period"
    if start_date and end_date:
        period_str = f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"
    elif start_date:
        period_str = f"Since {start_date.strftime('%Y-%m-%d')}"
    elif end_date:
        period_str = f"Before {end_date.strftime('%Y-%m-%d')}"
        
    if format.lower() == "pdf":
        file_stream = ReportService.generate_pdf_report(transactions, user_name, period_str, ai_insights)
        filename = f"financial_statement_{datetime.utcnow().strftime('%Y%m%d')}.pdf"
        media_type = "application/pdf"
    elif format.lower() == "excel":
        file_stream = ReportService.generate_excel_report(transactions, user_name)
        filename = f"financial_statement_{datetime.utcnow().strftime('%Y%m%d')}.xlsx"
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:
        raise HTTPException(status_code=400, detail="Invalid format type. Must be 'pdf' or 'excel'.")
        
    return StreamingResponse(
        file_stream,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
