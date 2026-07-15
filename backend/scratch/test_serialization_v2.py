import asyncio
from pydantic import Field, BaseModel, BeforeValidator
from typing import Annotated, Any, Dict
from datetime import datetime
from bson import ObjectId

# Helper to validate and convert MongoDB ObjectId to string
def validate_object_id(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, str) and ObjectId.is_valid(v):
        return v
    raise ValueError("Invalid ObjectId")

PyObjectId = Annotated[str, BeforeValidator(validate_object_id)]

class MongoBaseModelTest(BaseModel):
    id: PyObjectId = Field(default=None, validation_alias="_id", serialization_alias="id")

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        
    def to_mongo(self) -> Dict[str, Any]:
        """Convert pydantic model to dict for MongoDB insertion"""
        # We dump by field name (by_alias=False) to get 'id', then replace it with '_id'
        data = self.model_dump(by_alias=False, exclude_none=True)
        if "id" in data:
            data["_id"] = data.pop("id")
        if "_id" in data and data["_id"] is None:
            del data["_id"]
        return data

class CategoryResponseTest(MongoBaseModelTest):
    name: str

async def main():
    db_dict = {
        "_id": ObjectId("6a57ba6d30b4617e973c4eaf"),
        "name": "Test Category"
    }
    
    # Validate / Load
    model_instance = CategoryResponseTest.model_validate(db_dict)
    print("Successfully validated!")
    
    # Test to_mongo
    mongo_dict = model_instance.to_mongo()
    print("\nto_mongo result (for insertion):")
    print(mongo_dict)

if __name__ == "__main__":
    asyncio.run(main())
