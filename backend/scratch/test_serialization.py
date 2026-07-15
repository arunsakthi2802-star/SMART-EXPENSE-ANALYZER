import asyncio
from backend.app.models.category import CategoryResponse
from datetime import datetime
from bson import ObjectId

async def main():
    # Instantiate a mock CategoryResponse
    res = CategoryResponse(
        id=str(ObjectId()),
        name="Test",
        type="expense",
        icon="Tag",
        color="#ffffff",
        created_at=datetime.utcnow()
    )
    # Serialize it using the pydantic models
    print("model_dump by_alias=True (FastAPI default):")
    print(res.model_dump(by_alias=True))
    print("\nmodel_dump by_alias=False:")
    print(res.model_dump(by_alias=False))

if __name__ == "__main__":
    asyncio.run(main())
