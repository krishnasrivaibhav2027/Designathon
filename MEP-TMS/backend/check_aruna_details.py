from dotenv import load_dotenv
import os
from supabase import create_client

load_dotenv()

def main():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    supabase = create_client(url, key)
    
    email = "arunodayashine@gmail.com"
    print("=== USER RECORD ===")
    user_res = supabase.table("users").select("*").eq("email", email).execute().data
    print(user_res)
    
    print("\n=== CANDIDATE RECORD ===")
    cand_res = supabase.table("candidates").select("*").eq("email", email).execute().data
    print(cand_res)
    
    if cand_res:
        batch_id = cand_res[0].get("batch_id")
        if batch_id:
            batch_res = supabase.table("batches").select("*").eq("id", batch_id).execute().data
            print("\n=== BATCH RECORD ===")
            print(batch_res)

if __name__ == "__main__":
    main()
