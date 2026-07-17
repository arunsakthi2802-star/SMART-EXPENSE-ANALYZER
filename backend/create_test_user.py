import asyncio
import os
import sys

# Ensure backend can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from backend.app.database import get_database, connect_to_mongo
from backend.app.services.auth_service import get_password_hash

async def create_user():
    await connect_to_mongo()
    db = get_database()
    
    email = "test@budgetiq.com"
    password = "Test@1234"
    
    existing = await db.users.find_one({"email": email})
    if not existing:
        hashed_password = get_password_hash(password)
        user_doc = {
            "email": email,
            "full_name": "Test User",
            "password_hash": hashed_password,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.users.insert_one(user_doc)
        print("Test user created successfully!")
    else:
        print("Test user already exists.")

if __name__ == "__main__":
    asyncio.run(create_user())
