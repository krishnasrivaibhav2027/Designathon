import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "MEP-TMS Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Server
    API_V1_STR: str = "/api/v1"
    
    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    
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
    MIN_BATCH_SIZE_LIMIT: int = int(os.getenv("MIN_BATCH_SIZE_LIMIT", "30"))
    
    # File Upload
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50 MB
    UPLOAD_FOLDER: str = "uploads"
    
    # Topper Configuration
    TOPPER_PERCENTAGE: int = int(os.getenv("TOPPER_PERCENTAGE", "10"))
    
    # Gemini AI API Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    
    # Judge0 Configuration
    JUDGE0_API_URL: str = os.getenv("JUDGE0_API_URL", "https://ce.judge0.com")
    JUDGE0_API_KEY: str = os.getenv("JUDGE0_API_KEY", "")

    # Redis Configuration
    REDIS_URL: str = os.getenv("REDIS_URL", "")
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

settings = Settings()
