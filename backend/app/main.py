import logging
import os
from datetime import datetime
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from backend.app.config import settings
from backend.app.database import connect_to_mongo, close_mongo_connection, get_database
from backend.app.routes import (
    auth, transactions, category, budgets, dashboard, analytics, ai, reports, notifications, settings as settings_router
)

# Setup logging config
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Intelligent personal finance analyzer API.",
    version="1.0.0"
)

# CORS Policy
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploads folder for receipt images local fallback
os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()
    await seed_default_categories()

@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()

# Global Error Interceptor
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global server error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected server error occurred."}
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

async def seed_default_categories():
    """
    Seeds the global system categories (user_id = None) if they don't exist yet.
    """
    db = get_database()
    
    defaults = [
        # Expenses
        {"name": "Food", "type": "expense", "icon": "Utensils", "color": "#EF4444"},
        {"name": "Shopping", "type": "expense", "icon": "ShoppingBag", "color": "#3B82F6"},
        {"name": "Travel", "type": "expense", "icon": "Plane", "color": "#F59E0B"},
        {"name": "Medical", "type": "expense", "icon": "HeartPulse", "color": "#10B981"},
        {"name": "Education", "type": "expense", "icon": "GraduationCap", "color": "#8B5CF6"},
        {"name": "Entertainment", "type": "expense", "icon": "Gamepad2", "color": "#EC4899"},
        {"name": "Fuel", "type": "expense", "icon": "Fuel", "color": "#F97316"},
        {"name": "Bills", "type": "expense", "icon": "FileText", "color": "#06B6D4"},
        {"name": "Rent", "type": "expense", "icon": "Home", "color": "#6366F1"},
        {"name": "Investment", "type": "expense", "icon": "TrendingUp", "color": "#14B8A6"},
        {"name": "Business", "type": "expense", "icon": "Briefcase", "color": "#78350F"},
        
        # Incomes
        {"name": "Salary", "type": "income", "icon": "Briefcase", "color": "#10B981"},
        {"name": "Business", "type": "income", "icon": "Store", "color": "#3B82F6"},
        {"name": "Freelancing", "type": "income", "icon": "Laptop", "color": "#8B5CF6"},
        {"name": "Interest", "type": "income", "icon": "Percent", "color": "#F59E0B"},
        {"name": "Investment", "type": "income", "icon": "LineChart", "color": "#14B8A6"},
        {"name": "Rental", "type": "income", "icon": "Key", "color": "#6366F1"},
        {"name": "Other Income", "type": "income", "icon": "PlusCircle", "color": "#9CA3AF"}
    ]
    
    for category in defaults:
        existing = await db.categories.find_one({
            "name": category["name"],
            "type": category["type"],
            "user_id": None
        })
        if not existing:
            category["user_id"] = None
            category["created_at"] = datetime.utcnow()
            category["updated_at"] = datetime.utcnow()
            await db.categories.insert_one(category)
            logger.info(f"Seeded global category: {category['name']} ({category['type']})")

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(transactions.router, prefix=settings.API_V1_STR)
app.include_router(category.router, prefix=settings.API_V1_STR)
app.include_router(budgets.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(ai.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)
app.include_router(settings_router.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {"message": "Welcome to Smart Expense Analyzer API. Visit /docs for Swagger documentation."}
