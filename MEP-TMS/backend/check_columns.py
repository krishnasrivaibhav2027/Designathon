import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

try:
    res = supabase.table("assessments").select("id, time_taken").limit(1).execute()
    print("Successfully queried time_taken column!", res.data)
except Exception as e:
    print("Failed to query time_taken:", e)
