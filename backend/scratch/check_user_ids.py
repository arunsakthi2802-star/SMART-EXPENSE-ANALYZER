import asyncio
from backend.app.database import get_database, connect_to_mongo

async def main():
    await connect_to_mongo()
    db = get_database()
    
    user = await db.users.find_one({})
    print(f"User email: {user['email']}, ID: {user['_id']} (Type: {type(user['_id'])})")
    
    print("\nExpenses:")
    async for e in db.expenses.find({}):
        print(f" - Amount: {e['amount']}, user_id: {e.get('user_id')} (Type: {type(e.get('user_id'))})")
        
    print("\nIncomes:")
    async for i in db.incomes.find({}):
        print(f" - Amount: {i['amount']}, user_id: {i.get('user_id')} (Type: {type(i.get('user_id'))})")

if __name__ == "__main__":
    asyncio.run(main())
