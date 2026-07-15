from typing import Annotated, Any, Dict
from bson import ObjectId
from pydantic import BaseModel, BeforeValidator, Field
from datetime import datetime

# Helper to validate and convert MongoDB ObjectId to string
def validate_object_id(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, str) and ObjectId.is_valid(v):
        return v
    raise ValueError("Invalid ObjectId")

PyObjectId = Annotated[str, BeforeValidator(validate_object_id)]

class MongoBaseModel(BaseModel):
    id: PyObjectId = Field(default=None, validation_alias="_id", serialization_alias="id")

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        
    def to_mongo(self) -> Dict[str, Any]:
        """Convert pydantic model to dict for MongoDB insertion"""
        data = self.model_dump(by_alias=False, exclude_none=True)
        if "id" in data:
            data["_id"] = data.pop("id")
            
        # Dynamically cast 24-character hex strings back to BSON ObjectIds
        for k, v in list(data.items()):
            if isinstance(v, str) and len(v) == 24 and ObjectId.is_valid(v):
                data[k] = ObjectId(v)
            elif isinstance(v, list):
                data[k] = [ObjectId(item) if isinstance(item, str) and len(item) == 24 and ObjectId.is_valid(item) else item for item in v]
                
        if "_id" in data and data["_id"] is None:
            del data["_id"]
        return data
