import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "MEP-TMS Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Server
    API_V1_STR: str = "/api/v1"
    
    # MongoDB
    MONGODB_URL: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DB_NAME: str = "mep-tms"
    
    # JWT Configuration
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # Email Configuration
    EMAIL_SERVICE: str = os.getenv("EMAIL_SERVICE", "gmail")
    EMAIL_USER: str = os.getenv("EMAIL_USER", "")
    EMAIL_PASSWORD: str = os.getenv("EMAIL_PASSWORD", "")
    
    # Attendance Configuration
    ATTENDANCE_CUTOFF_TIME: str = os.getenv("ATTENDANCE_CUTOFF_TIME", "10:00")
    ABSENT_ALERT_DAYS: int = int(os.getenv("ABSENT_ALERT_DAYS", "3"))
    
    # File Upload
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50 MB
    UPLOAD_FOLDER: str = "uploads"
    
    # Topper Configuration
    TOPPER_PERCENTAGE: int = int(os.getenv("TOPPER_PERCENTAGE", "10"))
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
