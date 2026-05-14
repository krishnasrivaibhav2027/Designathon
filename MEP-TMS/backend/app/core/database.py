from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

client: AsyncIOMotorClient = None
db: AsyncIOMotorDatabase = None

async def connect_to_mongo():
    """Connect to MongoDB"""
    global client, db
    try:
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        db = client[settings.MONGODB_DB_NAME]
        print("✓ Connected to MongoDB")
    except Exception as e:
        print(f"✗ Failed to connect to MongoDB: {e}")
        raise

async def close_mongo_connection():
    """Close MongoDB connection"""
    global client
    try:
        if client:
            client.close()
            print("✓ Disconnected from MongoDB")
    except Exception as e:
        print(f"✗ Error closing MongoDB: {e}")

def get_db():
    """Get database instance"""
    return db
