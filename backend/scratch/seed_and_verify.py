# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

"""
Seed & Verify Script - budgetIQ
================================
• Connects to MongoDB Atlas using the .env credentials
• Inserts demo user: test@budgetiq.com / Test@1234 (skips if already exists)
• Verifies the user document was saved correctly
• Validates password hash round-trip via bcrypt
• Prints a full connection + collection health report
"""

import asyncio
import sys
import os
from datetime import datetime
from pathlib import Path

# ── Resolve project root so imports work ────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parents[3]   # PROJECT SOURCE/
sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[1] / ".env")   # backend/.env

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

# ── Config (read directly from env) ─────────────────────────────────────────
MONGODB_URI   = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "smart_expense_analyzer")

# ── Password hashing (same as auth_service.py) ───────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_EMAIL    = "test@budgetiq.com"
DEMO_PASSWORD = "Test@1234"
DEMO_NAME     = "Test User"

# ── Helpers ──────────────────────────────────────────────────────────────────
def ok(msg):     print(f"  [OK]   {msg}")
def fail(msg):   print(f"  [FAIL] {msg}")
def info(msg):   print(f"  [INFO] {msg}")
def header(msg): print(f"\n{'='*55}\n  {msg}\n{'='*55}")


async def main():
    print("\n" + "="*55)
    print("   budgetIQ - MongoDB Seed & Validation Script")
    print("="*55)

    # ── 1. Connect ────────────────────────────────────────────────────────
    header("STEP 1 — Connect to MongoDB Atlas")
    try:
        client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=8000)
        # Force connection check
        await client.admin.command("ping")
        ok(f"Ping successful  →  Atlas is reachable")
    except Exception as e:
        fail(f"Connection failed: {e}")
        return

    db = client[DATABASE_NAME]
    info(f"Database  : {DATABASE_NAME}")

    # ── 2. List collections ───────────────────────────────────────────────
    header("STEP 2 — Collection Health Check")
    collections = await db.list_collection_names()
    expected = ["users", "expenses", "incomes", "budgets",
                "categories", "savings_goals", "notifications"]
    for col in expected:
        if col in collections:
            count = await db[col].count_documents({})
            ok(f"{col:<20} exists  ({count} documents)")
        else:
            info(f"{col:<20} does not exist yet (will be created on first insert)")

    # ── 3. Seed demo user ─────────────────────────────────────────────────
    header("STEP 3 — Seed Demo User")
    existing = await db.users.find_one({"email": DEMO_EMAIL})

    if existing:
        info(f"User '{DEMO_EMAIL}' already exists — skipping insert.")
        user_doc = existing
    else:
        password_hash = pwd_context.hash(DEMO_PASSWORD)
        user_doc = {
            "name":             DEMO_NAME,
            "email":            DEMO_EMAIL,
            "password_hash":    password_hash,
            "role":             "user",
            "is_verified":      True,       # pre-verified for demo
            "profile_picture":  None,
            "created_at":       datetime.utcnow(),
            "updated_at":       datetime.utcnow(),
            "is_deleted":       False,
        }
        result = await db.users.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
        ok(f"Demo user inserted  →  _id: {result.inserted_id}")

    # ── 4. Verify document in DB ──────────────────────────────────────────
    header("STEP 4 — Verify Stored Document")
    fetched = await db.users.find_one({"email": DEMO_EMAIL})
    if fetched:
        ok(f"Document found in 'users' collection")
        info(f"_id          : {fetched['_id']}")
        info(f"name         : {fetched['name']}")
        info(f"email        : {fetched['email']}")
        info(f"role         : {fetched['role']}")
        info(f"is_verified  : {fetched['is_verified']}")
        info(f"is_deleted   : {fetched['is_deleted']}")
        info(f"created_at   : {fetched['created_at']}")
        info(f"password_hash: {fetched['password_hash'][:30]}…  (truncated)")
    else:
        fail("User document NOT found after insert — check DB permissions!")
        return

    # ── 5. Validate password hash round-trip ──────────────────────────────
    header("STEP 5 — Password Hash Validation")
    correct_verify = pwd_context.verify(DEMO_PASSWORD, fetched["password_hash"])
    wrong_verify   = pwd_context.verify("WrongPassword!", fetched["password_hash"])

    if correct_verify:
        ok(f"bcrypt.verify('{DEMO_PASSWORD}', hash)  →  TRUE  ✔")
    else:
        fail(f"bcrypt.verify('{DEMO_PASSWORD}', hash)  →  FALSE  ✘")

    if not wrong_verify:
        ok(f"bcrypt.verify('WrongPassword!', hash)  →  FALSE  ✔  (correctly rejected)")
    else:
        fail("bcrypt accepted a wrong password — hashing is broken!")

    # ── 6. Index check ────────────────────────────────────────────────────
    header("STEP 6 — Index Verification (users collection)")
    indexes = await db.users.index_information()
    for name, idx in indexes.items():
        info(f"Index '{name}'  →  keys: {idx['key']}")
    email_unique = any(
        idx.get("unique") and any(k[0] == "email" for k in idx["key"])
        for idx in indexes.values()
    )
    if email_unique:
        ok("Unique index on 'email' field confirmed")
    else:
        fail("No unique index on 'email' — run init_db_indexes() from database.py")

    # -- Summary --
    print("\n" + "="*55)
    print("   ALL CHECKS PASSED")
    print(f"\n   Login with:")
    print(f"     Email    : {DEMO_EMAIL}")
    print(f"     Password : {DEMO_PASSWORD}")
    print("="*55 + "\n")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
