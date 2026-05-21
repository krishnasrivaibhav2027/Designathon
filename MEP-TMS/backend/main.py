from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import connect_to_supabase, close_supabase_connection
from app.routers import auth, batch, attendance, assessment, report, user, chat, notification
from app.tasks.scheduler import start_scheduler, stop_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle"""
    # Startup
    connect_to_supabase()
    start_scheduler()
    print("[OK] Application startup complete")
    yield
    # Shutdown
    stop_scheduler()
    close_supabase_connection()
    print("[OK] Application shutdown complete")

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="MEP-TMS Backend API for Training Management System",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION
    }

# Include routers
app.include_router(auth.router)
app.include_router(batch.router)
app.include_router(attendance.router)
app.include_router(assessment.router)
app.include_router(report.router)
app.include_router(user.router)
app.include_router(chat.router)
app.include_router(notification.router)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
