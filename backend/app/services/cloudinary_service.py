import os
import uuid
import shutil
from fastapi import UploadFile
import cloudinary
import cloudinary.uploader
from backend.app.config import settings

class CloudinaryService:
    @staticmethod
    def upload_receipt(file: UploadFile) -> str:
        """
        Uploads file to Cloudinary. If credentials are not set or upload fails,
        it falls back to local static directory storage.
        """
        if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET:
            try:
                # Configure Cloudinary
                cloudinary.config(
                    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                    api_key=settings.CLOUDINARY_API_KEY,
                    api_secret=settings.CLOUDINARY_API_SECRET
                )
                # Reset file cursor just in case
                file.file.seek(0)
                result = cloudinary.uploader.upload(file.file, folder="smart_expense_analyzer")
                return result.get("secure_url")
            except Exception as e:
                # Log error and fall back to local disk storage
                pass
        
        # Local Storage Fallback
        # We store files relative to the execution root (which will be inside backend/)
        upload_dir = os.path.join("static", "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        
        file_extension = os.path.splitext(file.filename or "")[1] or ".jpg"
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        file.file.seek(0)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return f"/static/uploads/{unique_filename}"
