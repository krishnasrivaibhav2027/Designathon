import httpx
from supabase import create_client, Client, ClientOptions
from app.core.config import settings

supabase_client: Client = None

def connect_to_supabase():
    """Connect to Supabase"""
    global supabase_client
    try:
        # Disable HTTP/2 to prevent ConnectionTerminated (httpx.RemoteProtocolError) errors
        # on idle connections to Supabase/PostgREST.
        # Use connection pooling for faster subsequent requests.
        options = ClientOptions(
            httpx_client=httpx.Client(
                http2=False,
                timeout=httpx.Timeout(30.0, connect=5.0),
                limits=httpx.Limits(
                    max_connections=20,
                    max_keepalive_connections=10,
                    keepalive_expiry=30,
                ),
            )
        )
        supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY, options=options)
        print("[OK] Connected to Supabase (HTTP/2 disabled)")
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
