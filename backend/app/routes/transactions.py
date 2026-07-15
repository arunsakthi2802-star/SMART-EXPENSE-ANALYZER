import csv
import re
from datetime import datetime, timedelta
from io import StringIO
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from bson import ObjectId
from backend.app.database import get_database
from backend.app.models.transaction import (
    Transaction, TransactionCreate, TransactionResponse, BulkDeleteRequest
)
from backend.app.services.ai_service import AIService
from backend.app.middlewares.auth_middleware import get_current_user
from backend.app.services.cloudinary_service import CloudinaryService

router = APIRouter(prefix="/transactions", tags=["Transactions"])

async def check_budget_alerts(user_id: ObjectId, category_id: ObjectId, new_expense_amount: float):
    """
    Checks if this new transaction breaches the category budget limit or overall budget limit.
    """
    db = get_database()
    current_month = datetime.utcnow().strftime("%Y-%m")
    
    # 1. Fetch category limit
    category = await db.categories.find_one({"_id": category_id})
    if not category:
        return
        
    budget = await db.budgets.find_one({
        "user_id": user_id,
        "category_id": category_id,
        "period": current_month
    })
    
    # If no category specific budget, check overall budget limit (where category_id is None)
    if not budget:
        budget = await db.budgets.find_one({
            "user_id": user_id,
            "category_id": None,
            "period": current_month
        })
        
    if not budget:
        return
        
    limit = budget.get("limit_amount", 0)
    if limit <= 0:
        return
        
    # Calculate current spend in this month/category
    match_query = {
        "user_id": user_id,
        "type": "expense",
        "is_deleted": False,
        "date": {
            "$gte": datetime.strptime(f"{current_month}-01", "%Y-%m-%d"),
            # approximate end of month limit
            "$lt": datetime.utcnow() + timedelta(days=31)
        }
    }
    
    if budget.get("category_id"):
        match_query["category_id"] = category_id
        
    pipeline = [
        {"$match": match_query},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    cursor = db.expenses.aggregate(pipeline)
    result = await cursor.to_list(length=1)
    
    current_total = result[0]["total"] if result else 0.0
    new_total = current_total + new_expense_amount
    
    # Update current spend in budgets table for quick lookup
    await db.budgets.update_one({"_id": budget["_id"]}, {"$set": {"current_spend": new_total}})
    
    # Check threshold triggers
    alert_threshold = budget.get("alert_threshold", 0.80)
    
    if new_total >= limit:
        await db.notifications.insert_one({
            "user_id": user_id,
            "title": f"Budget Exceeded: {category['name'] if budget.get('category_id') else 'Monthly'}",
            "message": f"You have exceeded your monthly budget limit of ${limit:.2f}. Total spent: ${new_total:.2f}.",
            "type": "budget_exceeded",
            "is_read": False,
            "created_at": datetime.utcnow()
        })
    elif new_total >= (limit * alert_threshold):
        await db.notifications.insert_one({
            "user_id": user_id,
            "title": f"Budget Alert: {category['name'] if budget.get('category_id') else 'Monthly'}",
            "message": f"You have reached {int(alert_threshold * 100)}% of your monthly budget of ${limit:.2f}. Total spent: ${new_total:.2f}.",
            "type": "budget_exceeded",
            "is_read": False,
            "created_at": datetime.utcnow()
        })


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    tx_data: TransactionCreate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    # Resolve category
    category_id = None
    category = None
    
    # 1. Try resolving by ObjectId
    try:
        category_id = ObjectId(tx_data.category_id)
        category = await db.categories.find_one({
            "_id": category_id,
            "$or": [{"user_id": None}, {"user_id": user_id}]
        })
    except Exception:
        pass
        
    # 2. Try resolving by Name fallback if ID was invalid or category not found by ID
    if not category:
        category = await db.categories.find_one({
            "name": {"$regex": f"^{tx_data.category_id}$", "$options": "i"},
            "$or": [{"user_id": None}, {"user_id": user_id}]
        })
        if category:
            category_id = category["_id"]
            
    # 3. Create a custom category if it's still not found, or fallback to default
    if not category:
        cat_name = tx_data.category_id if tx_data.category_id and tx_data.category_id.lower() != "undefined" else "Other"
        category = await db.categories.find_one({
            "name": {"$regex": f"^{cat_name}$", "$options": "i"},
            "$or": [{"user_id": None}, {"user_id": user_id}]
        })
        
        if not category:
            cat_insert = await db.categories.insert_one({
                "name": cat_name,
                "type": tx_data.type,
                "icon": "Tag",
                "color": "#1E3B8A",
                "user_id": user_id,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
            category_id = cat_insert.inserted_id
            category = await db.categories.find_one({"_id": category_id})
        else:
            category_id = category["_id"]
        
    # Anomaly Detection & AI analysis for Expenses
    if tx_data.type == "expense":
        # Fetch historical expenses for anomaly scoring baseline
        cursor = db.expenses.find({"user_id": user_id, "is_deleted": False})
        hist_list = await cursor.to_list(length=100)
        
        anomaly_report = AIService.detect_anomalies(
            new_amount=tx_data.amount,
            category_name=category["name"],
            historical_expenses=hist_list
        )
        
        if anomaly_report["is_anomaly"]:
            await db.notifications.insert_one({
                "user_id": user_id,
                "title": f"Anomaly Detected: {category['name']}",
                "message": anomaly_report["reason"],
                "type": "security_alert",
                "is_read": False,
                "created_at": datetime.utcnow()
            })

    # Prepare document
    new_tx = Transaction(
        user_id=user_id,
        type=tx_data.type,
        amount=tx_data.amount,
        date=tx_data.date or datetime.utcnow(),
        category_id=category_id,
        description=tx_data.description or "",
        tags=tx_data.tags or [],
        payment_method=tx_data.payment_method or "Cash",
        merchant_name=tx_data.merchant_name or "",
        location=tx_data.location or "",
        receipt_url=tx_data.receipt_url or "",
        recurring_rule=tx_data.recurring_rule or "none",
        priority=tx_data.priority or "medium",
        is_deleted=False
    )
    
    collection = db.incomes if tx_data.type == "income" else db.expenses
    tx_dict = new_tx.to_mongo()
    result = await collection.insert_one(tx_dict)
    tx_dict["_id"] = str(result.inserted_id)
    
    # Run Budget warning validation triggers asynchronously/inline
    if tx_data.type == "expense":
        await check_budget_alerts(user_id, category_id, tx_data.amount)
        
    # Fetch details for UI format response
    tx_dict["category_detail"] = {
        "id": str(category["_id"]),
        "name": category["name"],
        "icon": category["icon"],
        "color": category["color"],
        "type": category["type"]
    }
    
    return TransactionResponse(
        id=tx_dict["_id"],
        user_id=str(user_id),
        type=tx_dict["type"],
        amount=tx_dict["amount"],
        date=tx_dict["date"],
        category_id=str(category_id),
        category_detail=tx_dict["category_detail"],
        description=tx_dict["description"],
        tags=tx_dict["tags"],
        payment_method=tx_dict["payment_method"],
        merchant_name=tx_dict["merchant_name"],
        location=tx_dict["location"],
        receipt_url=tx_dict["receipt_url"],
        recurring_rule=tx_dict["recurring_rule"],
        priority=tx_dict["priority"],
        created_at=tx_dict["created_at"],
        updated_at=tx_dict["updated_at"]
    )

@router.get("", response_model=List[TransactionResponse])
async def list_transactions(
    type: Optional[str] = Query(None, description="'income' or 'expense'"),
    category_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    tags: Optional[str] = Query(None, description="Comma separated tags"),
    merchant_name: Optional[str] = None,
    payment_method: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    search: Optional[str] = Query(None, description="Search description or merchant"),
    skip: int = 0,
    limit: int = 50,
    sort_by: str = "date",
    sort_order: int = -1,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    query = {"user_id": user_id, "is_deleted": False}
    
    if category_id:
        try:
            query["category_id"] = ObjectId(category_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid Category ID format")
            
    if start_date or end_date:
        query["date"] = {}
        if start_date:
            query["date"]["$gte"] = start_date
        if end_date:
            if end_date.hour == 0 and end_date.minute == 0 and end_date.second == 0:
                end_date = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)
            query["date"]["$lte"] = end_date
            
    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
        if tag_list:
            query["tags"] = {"$in": tag_list}
            
    if merchant_name:
        escaped_merchant = re.escape(merchant_name)
        query["merchant_name"] = {"$regex": escaped_merchant, "$options": "i"}
        
    if payment_method:
        query["payment_method"] = payment_method
        
    if min_amount or max_amount:
        query["amount"] = {}
        if min_amount is not None:
            query["amount"]["$gte"] = min_amount
        if max_amount is not None:
            query["amount"]["$lte"] = max_amount
            
    if search:
        escaped_search = re.escape(search)
        query["$or"] = [
            {"description": {"$regex": escaped_search, "$options": "i"}},
            {"merchant_name": {"$regex": escaped_search, "$options": "i"}},
            {"tags": {"$regex": escaped_search, "$options": "i"}}
        ]

    # Combine queries on multiple tables if no type specified
    transactions = []
    
    if type in (None, "income"):
        cursor = db.incomes.find(query)
        incomes = await cursor.to_list(length=1000)
        transactions.extend(incomes)
        
    if type in (None, "expense"):
        cursor = db.expenses.find(query)
        expenses = await cursor.to_list(length=1000)
        transactions.extend(expenses)
        
    # Sort
    reverse = sort_order == -1
    transactions.sort(key=lambda x: x.get(sort_by, datetime.utcnow()), reverse=reverse)
    
    # Paginate
    paginated_transactions = transactions[skip : skip + limit]
    
    # Populate Category Detail
    response_list = []
    for tx in paginated_transactions:
        cat_id = tx.get("category_id")
        cat = await db.categories.find_one({"_id": cat_id})
        category_detail = None
        if cat:
            category_detail = {
                "id": str(cat["_id"]),
                "name": cat["name"],
                "icon": cat["icon"],
                "color": cat["color"],
                "type": cat["type"]
            }
            
        response_list.append(TransactionResponse(
            id=str(tx["_id"]),
            user_id=str(user_id),
            type=tx["type"],
            amount=tx["amount"],
            date=tx["date"],
            category_id=str(cat_id),
            category_detail=category_detail,
            description=tx.get("description", ""),
            tags=tx.get("tags", []),
            payment_method=tx.get("payment_method", "Cash"),
            merchant_name=tx.get("merchant_name", ""),
            location=tx.get("location", ""),
            receipt_url=tx.get("receipt_url", ""),
            recurring_rule=tx.get("recurring_rule", "none"),
            priority=tx.get("priority", "medium"),
            created_at=tx["created_at"],
            updated_at=tx["updated_at"]
        ))
        
    return response_list

@router.get("/{tx_type}/{tx_id}", response_model=TransactionResponse)
async def get_transaction(
    tx_type: str,
    tx_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    if tx_type not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="Invalid transaction type")
        
    try:
        obj_id = ObjectId(tx_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Transaction ID format")
        
    collection = db.incomes if tx_type == "income" else db.expenses
    tx = await collection.find_one({"_id": obj_id, "user_id": user_id, "is_deleted": False})
    
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    cat = await db.categories.find_one({"_id": tx["category_id"]})
    category_detail = None
    if cat:
        category_detail = {
            "id": str(cat["_id"]),
            "name": cat["name"],
            "icon": cat["icon"],
            "color": cat["color"],
            "type": cat["type"]
        }
        
    return TransactionResponse(
        id=str(tx["_id"]),
        user_id=str(user_id),
        type=tx["type"],
        amount=tx["amount"],
        date=tx["date"],
        category_id=str(tx["category_id"]),
        category_detail=category_detail,
        description=tx.get("description", ""),
        tags=tx.get("tags", []),
        payment_method=tx.get("payment_method", "Cash"),
        merchant_name=tx.get("merchant_name", ""),
        location=tx.get("location", ""),
        receipt_url=tx.get("receipt_url", ""),
        recurring_rule=tx.get("recurring_rule", "none"),
        priority=tx.get("priority", "medium"),
        created_at=tx["created_at"],
        updated_at=tx["updated_at"]
    )

@router.put("/{tx_type}/{tx_id}", response_model=TransactionResponse)
async def update_transaction(
    tx_type: str,
    tx_id: str,
    tx_data: TransactionCreate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    if tx_type not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="Invalid transaction type")
        
    try:
        obj_id = ObjectId(tx_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Transaction ID format")
        
    collection = db.incomes if tx_type == "income" else db.expenses
    tx = await collection.find_one({"_id": obj_id, "user_id": user_id, "is_deleted": False})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    # Resolve category
    category_id = None
    category = None
    
    # 1. Try resolving by ObjectId
    try:
        category_id = ObjectId(tx_data.category_id)
        category = await db.categories.find_one({
            "_id": category_id,
            "$or": [{"user_id": None}, {"user_id": user_id}]
        })
    except Exception:
        pass
        
    # 2. Try resolving by Name fallback if ID was invalid or category not found by ID
    if not category:
        category = await db.categories.find_one({
            "name": {"$regex": f"^{tx_data.category_id}$", "$options": "i"},
            "$or": [{"user_id": None}, {"user_id": user_id}]
        })
        if category:
            category_id = category["_id"]
            
    # 3. Create a custom category if it's still not found, or fallback to default
    if not category:
        cat_name = tx_data.category_id if tx_data.category_id and tx_data.category_id.lower() != "undefined" else "Other"
        category = await db.categories.find_one({
            "name": {"$regex": f"^{cat_name}$", "$options": "i"},
            "$or": [{"user_id": None}, {"user_id": user_id}]
        })
        
        if not category:
            cat_insert = await db.categories.insert_one({
                "name": cat_name,
                "type": tx_type,
                "icon": "Tag",
                "color": "#1E3B8A",
                "user_id": user_id,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
            category_id = cat_insert.inserted_id
            category = await db.categories.find_one({"_id": category_id})
        else:
            category_id = category["_id"]
        
    update_dict = {
        "amount": tx_data.amount,
        "date": tx_data.date or tx["date"],
        "category_id": category_id,
        "description": tx_data.description or "",
        "tags": tx_data.tags or [],
        "payment_method": tx_data.payment_method or "Cash",
        "merchant_name": tx_data.merchant_name or "",
        "location": tx_data.location or "",
        "receipt_url": tx_data.receipt_url or "",
        "recurring_rule": tx_data.recurring_rule or "none",
        "priority": tx_data.priority or "medium",
        "updated_at": datetime.utcnow()
    }
    
    await collection.update_one({"_id": obj_id}, {"$set": update_dict})
    
    if tx_type == "expense":
        await check_budget_alerts(user_id, category_id, tx_data.amount - tx["amount"])
        
    updated_tx = await collection.find_one({"_id": obj_id})
    category_detail = {
        "id": str(category["_id"]),
        "name": category["name"],
        "icon": category["icon"],
        "color": category["color"],
        "type": category["type"]
    }
    
    return TransactionResponse(
        id=str(updated_tx["_id"]),
        user_id=str(user_id),
        type=updated_tx["type"],
        amount=updated_tx["amount"],
        date=updated_tx["date"],
        category_id=str(category_id),
        category_detail=category_detail,
        description=updated_tx.get("description", ""),
        tags=updated_tx.get("tags", []),
        payment_method=updated_tx.get("payment_method", "Cash"),
        merchant_name=updated_tx.get("merchant_name", ""),
        location=updated_tx.get("location", ""),
        receipt_url=updated_tx.get("receipt_url", ""),
        recurring_rule=updated_tx.get("recurring_rule", "none"),
        priority=updated_tx.get("priority", "medium"),
        created_at=updated_tx["created_at"],
        updated_at=updated_tx["updated_at"]
    )

@router.delete("/{tx_type}/{tx_id}")
async def delete_transaction(
    tx_type: str,
    tx_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    if tx_type not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="Invalid transaction type")
        
    try:
        obj_id = ObjectId(tx_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Transaction ID format")
        
    collection = db.incomes if tx_type == "income" else db.expenses
    result = await collection.update_one(
        {"_id": obj_id, "user_id": user_id},
        {"$set": {"is_deleted": True, "updated_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    return {"message": "Transaction soft-deleted successfully"}

@router.post("/bulk-delete")
async def bulk_delete_transactions(
    request: BulkDeleteRequest,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    object_ids = []
    for tx_id in request.ids:
        try:
            object_ids.append(ObjectId(tx_id))
        except Exception:
            continue
            
    if not object_ids:
        raise HTTPException(status_code=400, detail="No valid IDs provided")
        
    await db.expenses.update_many(
        {"_id": {"$in": object_ids}, "user_id": user_id},
        {"$set": {"is_deleted": True, "updated_at": datetime.utcnow()}}
    )
    
    await db.incomes.update_many(
        {"_id": {"$in": object_ids}, "user_id": user_id},
        {"$set": {"is_deleted": True, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": f"Successfully deleted transactions."}

@router.post("/duplicate/{tx_type}/{tx_id}", response_model=TransactionResponse)
async def duplicate_transaction(
    tx_type: str,
    tx_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    if tx_type not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="Invalid transaction type")
        
    try:
        obj_id = ObjectId(tx_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Transaction ID format")
        
    collection = db.incomes if tx_type == "income" else db.expenses
    tx = await collection.find_one({"_id": obj_id, "user_id": user_id, "is_deleted": False})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    # Duplicate transaction details with new timestamp
    new_tx = Transaction(
        user_id=user_id,
        type=tx["type"],
        amount=tx["amount"],
        date=datetime.utcnow(),
        category_id=tx["category_id"],
        description=f"{tx.get('description', '')} (Copy)",
        tags=tx.get("tags", []),
        payment_method=tx.get("payment_method", "Cash"),
        merchant_name=tx.get("merchant_name", ""),
        location=tx.get("location", ""),
        receipt_url=tx.get("receipt_url", ""),
        recurring_rule=tx.get("recurring_rule", "none"),
        priority=tx.get("priority", "medium")
    )
    
    tx_dict = new_tx.to_mongo()
    result = await collection.insert_one(tx_dict)
    tx_dict["_id"] = str(result.inserted_id)
    
    if tx_type == "expense":
        await check_budget_alerts(user_id, tx["category_id"], tx["amount"])
        
    cat = await db.categories.find_one({"_id": tx["category_id"]})
    category_detail = {
        "id": str(cat["_id"]),
        "name": cat["name"],
        "icon": cat["icon"],
        "color": cat["color"],
        "type": cat["type"]
    } if cat else None
    
    return TransactionResponse(
        id=tx_dict["_id"],
        user_id=str(user_id),
        type=tx_dict["type"],
        amount=tx_dict["amount"],
        date=tx_dict["date"],
        category_id=str(tx["category_id"]),
        category_detail=category_detail,
        description=tx_dict["description"],
        tags=tx_dict["tags"],
        payment_method=tx_dict["payment_method"],
        merchant_name=tx_dict["merchant_name"],
        location=tx_dict["location"],
        receipt_url=tx_dict["receipt_url"],
        recurring_rule=tx_dict["recurring_rule"],
        priority=tx_dict["priority"],
        created_at=tx_dict["created_at"],
        updated_at=tx_dict["updated_at"]
    )

@router.post("/upload-receipt")
async def upload_receipt(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    # Validate content type
    if not file.content_type.startswith(("image/", "application/pdf")):
        raise HTTPException(status_code=400, detail="Receipt must be an image or PDF document")
        
    try:
        url = CloudinaryService.upload_receipt(file)
        analysis = AIService.analyze_receipt(file.filename)
        return {"receipt_url": url, "analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

@router.post("/import")
async def import_csv(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    # Read file contents
    content = await file.read()
    decoded = content.decode("utf-8")
    csv_reader = csv.DictReader(StringIO(decoded))
    
    imported_count = 0
    
    for row in csv_reader:
        try:
            tx_type = row.get("type", "expense").lower()
            amount = float(row.get("amount", 0))
            date_str = row.get("date", "")
            category_name = row.get("category", "").strip()
            description = row.get("description", "").strip()
            payment_method = row.get("payment_method", "Cash").strip()
            merchant_name = row.get("merchant_name", "").strip()
            
            if not date_str or amount <= 0 or tx_type not in ("income", "expense"):
                continue
                
            tx_date = datetime.strptime(date_str, "%Y-%m-%d")
            
            # Resolve category ID by name, creating a custom one if not found
            cat = await db.categories.find_one({
                "name": {"$regex": f"^{category_name}$", "$options": "i"},
                "$or": [{"user_id": None}, {"user_id": user_id}]
            })
            
            if not cat:
                # Dynamically create Custom Category for user
                cat_insert = await db.categories.insert_one({
                    "name": category_name,
                    "type": tx_type,
                    "icon": "Tag",
                    "color": "#1E3B8A",
                    "user_id": user_id,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                })
                category_id = cat_insert.inserted_id
            else:
                category_id = cat["_id"]
                
            new_tx = Transaction(
                user_id=user_id,
                type=tx_type,
                amount=amount,
                date=tx_date,
                category_id=category_id,
                description=description,
                payment_method=payment_method,
                merchant_name=merchant_name,
                recurring_rule="none",
                priority="medium"
            )
            
            collection = db.incomes if tx_type == "income" else db.expenses
            await collection.insert_one(new_tx.to_mongo())
            imported_count += 1
            
        except Exception:
            continue
            
    return {"message": f"Successfully imported {imported_count} transactions"}

@router.get("/export")
async def export_csv(
    type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    query = {"user_id": user_id, "is_deleted": False}
    transactions = []
    
    if type in (None, "income"):
        cursor = db.incomes.find(query)
        incomes = await cursor.to_list(length=10000)
        transactions.extend(incomes)
        
    if type in (None, "expense"):
        cursor = db.expenses.find(query)
        expenses = await cursor.to_list(length=10000)
        transactions.extend(expenses)
        
    # Sort by date
    transactions.sort(key=lambda x: x.get("date", datetime.utcnow()))
    
    # Create CSV in memory
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["date", "type", "category", "merchant_name", "description", "payment_method", "amount"])
    
    for tx in transactions:
        cat = await db.categories.find_one({"_id": tx["category_id"]})
        category_name = cat["name"] if cat else "N/A"
        date_str = tx["date"].strftime("%Y-%m-%d") if isinstance(tx["date"], datetime) else str(tx["date"])[:10]
        
        writer.writerow([
            date_str,
            tx["type"],
            category_name,
            tx.get("merchant_name", ""),
            tx.get("description", ""),
            tx.get("payment_method", "Cash"),
            tx["amount"]
        ])
        
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions_export.csv"}
    )
