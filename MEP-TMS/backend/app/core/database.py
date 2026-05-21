from supabase import create_client, Client
from app.core.config import settings

supabase_client: Client = None

def connect_to_supabase():
    """Connect to Supabase"""
    global supabase_client
    try:
        supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        print("[OK] Connected to Supabase")
    except Exception as e:
        print(f"[FAIL] Failed to connect to Supabase: {e}")
        raise

def close_supabase_connection():
    """Close Supabase connection (no-op for REST client)"""
    global supabase_client
    supabase_client = None
    print("[OK] Disconnected from Supabase")

def get_db() -> Client:
    """Get Supabase client instance"""
    return supabase_client
