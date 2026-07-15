import asyncio
from bson import ObjectId
from backend.app.database import get_database, connect_to_mongo

async def main():
    await connect_to_mongo()
    db = get_database()
    
    collections = ["expenses", "incomes", "budgets", "categories", "savings_goals", "notifications"]
    
    print("--- Database Migration (Dry Run & Execute) ---")
    
    for coll_name in collections:
        count_migrated = 0
        cursor = db[coll_name].find({})
        async for doc in cursor:
            updates = {}
            for field in ["_id", "user_id", "category_id"]:
                val = doc.get(field)
                if val and isinstance(val, str) and len(val) == 24 and ObjectId.is_valid(val):
                    updates[field] = ObjectId(val)
            
            if updates:
                # If we need to migrate _id, we must delete and re-insert or use copy, since _id is immutable in updates.
                if "_id" in updates:
                    new_doc = dict(doc)
                    new_doc["_id"] = updates["_id"]
                    # Convert other fields too
                    for f in ["user_id", "category_id"]:
                        if f in updates:
                            new_doc[f] = updates[f]
                        elif f in new_doc and isinstance(new_doc[f], str) and len(new_doc[f]) == 24 and ObjectId.is_valid(new_doc[f]):
                            new_doc[f] = ObjectId(new_doc[f])
                    
                    await db[coll_name].delete_one({"_id": doc["_id"]})
                    await db[coll_name].insert_one(new_doc)
                else:
                    await db[coll_name].update_one({"_id": doc["_id"]}, {"$set": updates})
                count_migrated += 1
                
        print(f"Migrated {count_migrated} documents in '{coll_name}' collection.")

if __name__ == "__main__":
    asyncio.run(main())
