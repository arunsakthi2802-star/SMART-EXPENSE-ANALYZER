import logging
from motor.motor_asyncio import AsyncIOMotorClient
from backend.app.config import settings

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_to_mongo():
    logger.info("Connecting to MongoDB...")
    db_instance.client = AsyncIOMotorClient(settings.MONGODB_URI)
    db_instance.db = db_instance.client[settings.DATABASE_NAME]
    logger.info("Connected to MongoDB successfully.")
    await init_db_indexes()

async def close_mongo_connection():
    logger.info("Closing connection to MongoDB...")
    if db_instance.client:
        db_instance.client.close()
    logger.info("MongoDB connection closed.")

async def init_db_indexes():
    """Create indexes for performance and constraints"""
    try:
        db = db_instance.db
        
        # User indexes
        await db.users.create_index("email", unique=True)
        
        # Category indexes
        # Categories can be global (user_id is null) or custom (linked to user_id)
        await db.categories.create_index([("user_id", 1), ("name", 1), ("type", 1)], unique=True)
        
        # Transaction indexes
        await db.expenses.create_index([("user_id", 1), ("date", -1)])
        await db.expenses.create_index("category_id")
        await db.incomes.create_index([("user_id", 1), ("date", -1)])
        await db.incomes.create_index("category_id")
        
        # Budget indexes
        await db.budgets.create_index([("user_id", 1), ("category_id", 1), ("period", 1)], unique=True)
        
        # Savings Goals index
        await db.savings_goals.create_index([("user_id", 1)])
        
        # Notification indexes
        await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
        
        logger.info("Database indexes initialized successfully.")
    except Exception as e:
        logger.error(f"Error initializing indexes: {e}")

def get_database():
    return db_instance.db
