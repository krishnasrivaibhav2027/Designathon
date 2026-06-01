from dotenv import load_dotenv
import os
from supabase import create_client

load_dotenv()

def main():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    supabase = create_client(url, key)
    
    res = supabase.table("users").select("*").ilike("full_name", "%eswara%").execute()
    if res.data:
        for u in res.data:
            print(f"USER: {u.get('full_name')} - Email: {u.get('email')} - Role: {u.get('role')} - Active: {u.get('is_active')}")
    else:
        print("Eswara not found.")

if __name__ == "__main__":
    main()
