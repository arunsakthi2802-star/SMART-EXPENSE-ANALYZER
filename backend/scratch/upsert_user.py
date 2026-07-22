# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

import asyncio
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / ".env")

from motor.motor_asyncio import AsyncIOMotorClient
from backend.app.services.auth_service import get_password_hash
from datetime import datetime

MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME", "smart_expense_analyzer")

TARGET_EMAIL = "arunsakthi2806@gmail.com"
TARGET_PASSWORD = "Abc123.@"

async def main():
    print(f"Connecting to MongoDB...")
    client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=8000)
    db = client[DATABASE_NAME]
    
    normalized_email = TARGET_EMAIL.lower().strip()
    hashed_password = get_password_hash(TARGET_PASSWORD)
    
    # Try to find existing
    existing = await db.users.find_one({"email": normalized_email})
    
    if existing:
        print(f"User {normalized_email} exists. Updating password and verifying...")
        await db.users.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "password_hash": hashed_password,
                "is_verified": True,
                "is_deleted": False,
                "updated_at": datetime.utcnow()
            }}
        )
        print("Update complete.")
    else:
        print(f"User {normalized_email} does not exist. Creating new user...")
        res = await db.users.insert_one({
            "email": normalized_email,
            "name": "Arun",
            "full_name": "Arun",
            "role": "user",
            "is_verified": True,
            "is_deleted": False,
            "password_hash": hashed_password,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        print(f"User created with ID {res.inserted_id}.")
        
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
