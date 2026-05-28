import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

try:
    res = supabase.table("spark_2_report_cards").select("*").limit(1).execute()
    print("Columns:", res.data[0].keys() if res.data else "No data rows, but connection successful")
except Exception as e:
    print("Error:", e)
