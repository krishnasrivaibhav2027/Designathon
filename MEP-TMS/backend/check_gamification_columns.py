import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

try:
    res = supabase.table("candidates").select("*").limit(1).execute()
    if res.data:
        print("REST API returned candidate columns:", list(res.data[0].keys()))
    else:
        print("No candidates found via REST API.")
except Exception as e:
    print("REST API Call Failed:", e)
