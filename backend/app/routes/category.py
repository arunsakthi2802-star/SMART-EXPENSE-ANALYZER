from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from backend.app.database import get_database
from backend.app.models.category import Category, CategoryCreate, CategoryResponse
from backend.app.middlewares.auth_middleware import get_current_user

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("", response_model=List[CategoryResponse])
async def list_categories(
    type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    # Query categories that are system-wide (user_id is None) OR created by current user
    query = {
        "$or": [
            {"user_id": None},
            {"user_id": user_id}
        ]
    }
    
    if type:
        query["type"] = type
        
    cursor = db.categories.find(query)
    categories = await cursor.to_list(length=200)
    
    response = []
    for c in categories:
        response.append(CategoryResponse(
            id=str(c["_id"]),
            name=c["name"],
            type=c["type"],
            icon=c["icon"],
            color=c["color"],
            user_id=str(c["user_id"]) if c.get("user_id") else None,
            budget_limit=c.get("budget_limit"),
            created_at=c["created_at"]
        ))
        
    return response

@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_data: CategoryCreate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    # Check if category with the same name and type already exists for this user (or globally)
    existing = await db.categories.find_one({
        "name": {"$regex": f"^{category_data.name}$", "$options": "i"},
        "type": category_data.type,
        "$or": [
            {"user_id": None},
            {"user_id": user_id}
        ]
    })
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name already exists"
        )
        
    new_cat = Category(
        name=category_data.name,
        type=category_data.type,
        icon=category_data.icon,
        color=category_data.color,
        user_id=user_id,
        budget_limit=category_data.budget_limit
    )
    
    cat_dict = new_cat.to_mongo()
    result = await db.categories.insert_one(cat_dict)
    
    # If a budget_limit was set directly, also write or update budget limit for the current month
    if category_data.budget_limit and category_data.budget_limit > 0:
        current_month = datetime.utcnow().strftime("%Y-%m")
        await db.budgets.update_one(
            {"user_id": user_id, "category_id": result.inserted_id, "period": current_month},
            {"$set": {
                "limit_amount": category_data.budget_limit,
                "updated_at": datetime.utcnow()
            }},
            upsert=True
        )

    cat_dict["_id"] = str(result.inserted_id)
    return CategoryResponse(
        id=cat_dict["_id"],
        name=cat_dict["name"],
        type=cat_dict["type"],
        icon=cat_dict["icon"],
        color=cat_dict["color"],
        user_id=str(user_id),
        budget_limit=cat_dict.get("budget_limit"),
        created_at=cat_dict["created_at"]
    )

@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    try:
        obj_id = ObjectId(category_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Category ID format")
        
    cat = await db.categories.find_one({"_id": obj_id})
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
        
    # Security: Verify it belongs to the user and is NOT a global default
    if cat.get("user_id") is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete global default system categories"
        )
        
    if cat["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this category"
        )
        
    # Delete category document
    await db.categories.delete_one({"_id": obj_id})
    
    # Clean up associated transaction links or set to 'Other' if necessary
    # (For simplicity we just delete budgets linked to it)
    await db.budgets.delete_many({"category_id": obj_id, "user_id": user_id})
    
    return {"message": "Category deleted successfully"}
