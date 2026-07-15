import asyncio
from backend.app.database import get_database, connect_to_mongo

async def main():
    await connect_to_mongo()
    db = get_database()
    
    users = await db.users.count_documents({})
    expenses = await db.expenses.count_documents({})
    incomes = await db.incomes.count_documents({})
    categories = await db.categories.count_documents({})
    
    print(f"Total Users: {users}")
    print(f"Total Expenses: {expenses}")
    print(f"Total Incomes: {incomes}")
    print(f"Total Categories: {categories}")
    
    # Print first few transactions
    print("\nExpenses Sample:")
    async for e in db.expenses.find({}).limit(5):
        print(f" - Amount: {e.get('amount')}, Date: {e.get('date')}, Deleted: {e.get('is_deleted')}")
        
    print("\nIncomes Sample:")
    async for i in db.incomes.find({}).limit(5):
        print(f" - Amount: {i.get('amount')}, Date: {i.get('date')}, Deleted: {i.get('is_deleted')}")

if __name__ == "__main__":
    asyncio.run(main())
