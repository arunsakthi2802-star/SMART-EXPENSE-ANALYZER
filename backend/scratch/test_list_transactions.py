import asyncio
from backend.app.database import get_database, connect_to_mongo
from backend.app.routes.transactions import list_transactions

async def main():
    await connect_to_mongo()
    db = get_database()
    
    user = await db.users.find_one({})
    if not user:
        print("No users found")
        return
        
    print(f"Testing list_transactions for user: {user.get('email')} (ID: {user['_id']})")
    
    # Call list_transactions by simulating FastAPI dependency
    current_user = {"_id": user["_id"], "email": user["email"]}
    
    res = await list_transactions(
        type=None,
        category_id=None,
        start_date=None,
        end_date=None,
        tags=None,
        merchant_name=None,
        payment_method=None,
        min_amount=None,
        max_amount=None,
        search=None,
        skip=0,
        limit=50,
        sort_by="date",
        sort_order=-1,
        current_user=current_user
    )
    
    print(f"\nReturned {len(res)} transactions:")
    for tx in res:
        print(f" - [{tx.type.upper()}] Date: {tx.date}, Amount: {tx.amount}, Merchant: {tx.merchant_name}, Category: {tx.category_detail.get('name') if tx.category_detail else 'N/A'}")

if __name__ == "__main__":
    asyncio.run(main())
