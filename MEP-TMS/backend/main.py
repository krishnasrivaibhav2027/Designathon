from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.routers import auth, batch, attendance, assessment, report

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="MEP-TMS Backend API for Training Management System"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Event handlers
from app.tasks.scheduler import start_scheduler, stop_scheduler

@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    await connect_to_mongo()
    start_scheduler()
    print("✓ Application startup complete")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    stop_scheduler()
    await close_mongo_connection()
    print("✓ Application shutdown complete")

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
