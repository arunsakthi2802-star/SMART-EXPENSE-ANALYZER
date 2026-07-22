import asyncio
import os
import sys

# Ensure backend can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from backend.app.database import get_database, connect_to_mongo
from backend.app.services.auth_service import get_password_hash
from bson import ObjectId

async def create_user():
    await connect_to_mongo()
    db = get_database()
    
    email = "test@budgetiq.com"
    password = "Test@1234"
    hashed_password = get_password_hash(password)
    
    existing = await db.users.find_one({"email": email})
    
    if existing:
        print("Test user already exists. Updating credentials and cleaning up old test data...")
        user_id = existing["_id"]
        # Force update password and verification
        await db.users.update_one(
            {"_id": user_id},
            {"$set": {
                "password_hash": hashed_password,
                "is_verified": True,
                "updated_at": datetime.utcnow()
            }}
        )
        await db.categories.delete_many({"user_id": user_id})
        await db.incomes.delete_many({"user_id": user_id})
        await db.expenses.delete_many({"user_id": user_id})
        await db.budgets.delete_many({"user_id": user_id})
        await db.savings_goals.delete_many({"user_id": user_id})
    else:
        user_doc = {
            "email": email,
            "full_name": "Test User",
            "name": "Test User",
            "role": "user",
            "is_verified": True,
            "password_hash": hashed_password,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        res = await db.users.insert_one(user_doc)
        user_id = res.inserted_id
        print("Test user created successfully!")

    print("Populating test data with real dates for the test user...")
    now = datetime.utcnow()
    current_month_str = now.strftime("%Y-%m")
    
    # 1. Create categories
    cat_food = await db.categories.insert_one({
        "user_id": user_id, "name": "Food & Dining", "type": "expense", "color": "#EF4444", "icon": "Coffee",
        "created_at": now, "updated_at": now
    })
    cat_salary = await db.categories.insert_one({
        "user_id": user_id, "name": "Salary", "type": "income", "color": "#10B981", "icon": "DollarSign",
        "created_at": now, "updated_at": now
    })
    cat_transport = await db.categories.insert_one({
        "user_id": user_id, "name": "Transport", "type": "expense", "color": "#F59E0B", "icon": "Car",
        "created_at": now, "updated_at": now
    })
    cat_entertainment = await db.categories.insert_one({
        "user_id": user_id, "name": "Entertainment", "type": "expense", "color": "#8B5CF6", "icon": "Film",
        "created_at": now, "updated_at": now
    })

    # 2. Incomes
    await db.incomes.insert_many([
        {
            "user_id": user_id, "type": "income", "amount": 5000.0, "date": now - timedelta(days=5),
            "category_id": cat_salary.inserted_id, "description": "Monthly Salary",
            "payment_method": "Bank Transfer", "merchant_name": "Tech Corp", "is_deleted": False,
            "created_at": now, "updated_at": now, "tags": [], "recurring_rule": "monthly", "priority": "medium",
            "location": "", "receipt_url": ""
        }
    ])
    
    # 3. Expenses
    await db.expenses.insert_many([
        {
            "user_id": user_id, "type": "expense", "amount": 15.5, "date": now,
            "category_id": cat_food.inserted_id, "description": "Lunch",
            "payment_method": "Card", "merchant_name": "Cafe Mocha", "is_deleted": False,
            "created_at": now, "updated_at": now, "tags": ["lunch"], "recurring_rule": "none", "priority": "medium",
            "location": "", "receipt_url": ""
        },
        {
            "user_id": user_id, "type": "expense", "amount": 45.0, "date": now - timedelta(days=1),
            "category_id": cat_transport.inserted_id, "description": "Gas",
            "payment_method": "Card", "merchant_name": "Shell", "is_deleted": False,
            "created_at": now, "updated_at": now, "tags": ["gas"], "recurring_rule": "none", "priority": "high",
            "location": "", "receipt_url": ""
        },
        {
            "user_id": user_id, "type": "expense", "amount": 120.0, "date": now - timedelta(days=2),
            "category_id": cat_entertainment.inserted_id, "description": "Concert Tickets",
            "payment_method": "Card", "merchant_name": "Ticketmaster", "is_deleted": False,
            "created_at": now, "updated_at": now, "tags": ["fun"], "recurring_rule": "none", "priority": "low",
            "location": "", "receipt_url": ""
        }
    ])

    # 4. Budgets
    await db.budgets.insert_many([
        {
            "user_id": user_id, "category_id": None, "limit_amount": 3000.0, 
            "current_spend": 180.5, "period": current_month_str, "alert_threshold": 0.8,
            "created_at": now, "updated_at": now
        },
        {
            "user_id": user_id, "category_id": cat_food.inserted_id, "limit_amount": 500.0, 
            "current_spend": 15.5, "period": current_month_str, "alert_threshold": 0.8,
            "created_at": now, "updated_at": now
        }
    ])

    # 5. Savings Goals
    await db.savings_goals.insert_one({
        "user_id": user_id, "name": "New Laptop", "target_amount": 1500.0,
        "current_amount": 400.0, "target_date": now + timedelta(days=90),
        "created_at": now, "updated_at": now
    })

    print("Test data populated successfully!")

if __name__ == "__main__":
    asyncio.run(create_user())
