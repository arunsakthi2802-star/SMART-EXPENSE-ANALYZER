from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
from backend.app.database import get_database
from backend.app.services.auth_service import decode_access_token

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    HTTPBearer dependency that parses JWT tokens and fetches the active database user.
    """
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token content",
        )
        
    db = get_database()
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id), "is_deleted": False})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid database identifier",
        )
        
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account does not exist or has been deleted",
        )
        
    return user

class RoleChecker:
    """
    Role constraint checker for protecting admin or business-tier endpoints.
    """
    def __init__(self, allowed_roles: list):
        self.allowed_roles = allowed_roles
        
    def __call__(self, user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: insufficient permissions",
            )
        return user
