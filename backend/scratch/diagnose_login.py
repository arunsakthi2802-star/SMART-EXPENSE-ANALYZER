# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

"""
Deep Login Diagnostic Script - budgetIQ
Checks exactly why login fails for test@budgetiq.com
"""

import asyncio
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

MONGODB_URI   = os.getenv("MONGODB_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME", "smart_expense_analyzer")
pwd_context   = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_EMAIL    = "test@budgetiq.com"
DEMO_PASSWORD = "Test@1234"


async def main():
    print("\n" + "="*60)
    print("   budgetIQ - Deep Login Diagnostic")
    print("="*60)

    client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=8000)
    await client.admin.command("ping")
    print("[OK]  Connected to MongoDB Atlas\n")
    db = client[DATABASE_NAME]

    # ── Check 1: Raw lookup by email (no filters) ─────────────────────────
    print("="*60)
    print("  CHECK 1 — Raw find by email (no filter)")
    print("="*60)
    raw = await db.users.find_one({"email": DEMO_EMAIL})
    if raw:
        print(f"  [OK]   Found user with email='{DEMO_EMAIL}'")
        print(f"         _id        : {raw['_id']}")
        print(f"         is_deleted : {raw.get('is_deleted')!r}")
        print(f"         is_verified: {raw.get('is_verified')!r}")
        print(f"         password_hash exists: {'password_hash' in raw}")
    else:
        print(f"  [FAIL] NO user found with email='{DEMO_EMAIL}'")
        # Try case-insensitive
        all_users = await db.users.find({}).to_list(length=100)
        print(f"\n  All emails in users collection:")
        for u in all_users:
            print(f"    - {u.get('email')!r}  (is_deleted={u.get('is_deleted')!r})")

    # ── Check 2: Exact same query as the login route ──────────────────────
    print("\n" + "="*60)
    print("  CHECK 2 — Exact login query (email + is_deleted=False)")
    print("="*60)
    normalized_email = DEMO_EMAIL.lower()
    login_user = await db.users.find_one({"email": normalized_email, "is_deleted": False})
    if login_user:
        print(f"  [OK]   Login query found user '{normalized_email}'")
    else:
        print(f"  [FAIL] Login query returned NONE for '{normalized_email}'")
        # Try without is_deleted filter
        no_filter = await db.users.find_one({"email": normalized_email})
        if no_filter:
            print(f"  [INFO] User exists BUT 'is_deleted' filter blocks it!")
            print(f"         is_deleted value = {no_filter.get('is_deleted')!r}")
            print(f"         (Field might be missing or set to non-False value)")
        else:
            print(f"  [INFO] User does not exist with exact email '{normalized_email}'")

    # ── Check 3: Password hash verify ─────────────────────────────────────
    print("\n" + "="*60)
    print("  CHECK 3 — Password Hash Verification")
    print("="*60)
    user_for_pwd = await db.users.find_one({"email": DEMO_EMAIL})
    if user_for_pwd and "password_hash" in user_for_pwd:
        result = pwd_context.verify(DEMO_PASSWORD, user_for_pwd["password_hash"])
        print(f"  [{'OK' if result else 'FAIL'}]   bcrypt.verify('{DEMO_PASSWORD}', hash) = {result}")
        if not result:
            print(f"         Stored hash: {user_for_pwd['password_hash']}")
    else:
        print(f"  [FAIL] Cannot verify — user or password_hash not found")

    # ── FIX: Patch is_deleted field if missing/wrong ──────────────────────
    print("\n" + "="*60)
    print("  FIX — Ensure is_deleted=False on demo user")
    print("="*60)
    fix_result = await db.users.update_one(
        {"email": DEMO_EMAIL},
        {"$set": {"is_deleted": False, "is_verified": True}}
    )
    if fix_result.matched_count > 0:
        print(f"  [OK]   Patched user: is_deleted=False, is_verified=True")
    else:
        print(f"  [FAIL] No user matched for patch — email not found at all")

    # ── Final Verify after fix ─────────────────────────────────────────────
    print("\n" + "="*60)
    print("  FINAL — Re-run login query after fix")
    print("="*60)
    final = await db.users.find_one({"email": normalized_email, "is_deleted": False})
    if final:
        pwd_ok = pwd_context.verify(DEMO_PASSWORD, final["password_hash"])
        print(f"  [OK]   Login query now finds user!")
        print(f"  [{'OK' if pwd_ok else 'FAIL'}]   Password verify = {pwd_ok}")
        if pwd_ok:
            print("\n" + "="*60)
            print("  LOGIN SHOULD NOW WORK!")
            print(f"  Email    : {DEMO_EMAIL}")
            print(f"  Password : {DEMO_PASSWORD}")
            print("="*60)
    else:
        print(f"  [FAIL] Still not found — check MongoDB Atlas manually")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
