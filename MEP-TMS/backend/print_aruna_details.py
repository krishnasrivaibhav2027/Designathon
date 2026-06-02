from dotenv import load_dotenv
import os
from supabase import create_client

load_dotenv()

def main():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    supabase = create_client(url, key)
    
    email = "arunodayashine@gmail.com"
    user_res = supabase.table("users").select("*").eq("email", email).execute().data
    print("USER ROW:")
    if user_res:
        u = user_res[0]
        print(f"ID: {u.get('id')}, email: {u.get('email')}, role: {u.get('role')}, assigned_batches: {u.get('assigned_batches')}")
    else:
        print("None")
        
    cand_res = supabase.table("candidates").select("*").eq("email", email).execute().data
    print("\nCANDIDATE ROW:")
    if cand_res:
        c = cand_res[0]
        print(f"ID: {c.get('id')}, email: {c.get('email')}, batch_id: {c.get('batch_id')}, isActive: {c.get('is_active')}")
    else:
        print("None")

if __name__ == "__main__":
    main()
