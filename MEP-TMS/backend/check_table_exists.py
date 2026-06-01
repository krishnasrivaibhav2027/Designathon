import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

try:
    res = supabase.table("detailed_feedbacks").select("*").limit(1).execute()
    print("SUCCESS: detailed_feedbacks exists! Data:", res.data)
except Exception as e:
    print("FAILED: detailed_feedbacks does not exist or error:", e)
