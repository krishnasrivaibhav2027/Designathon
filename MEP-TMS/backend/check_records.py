from dotenv import load_dotenv
import os
from supabase import create_client

load_dotenv()

def main():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    supabase = create_client(url, key)
    
    print("=== USERS ===")
    users_res = supabase.table("users").select("id, email, full_name, role, is_active").execute()
    for u in users_res.data or []:
        print(f"ID: {u.get('id')}, Name: {u.get('full_name')}, Email: {u.get('email')}, Role: {u.get('role')}, Active: {u.get('is_active')}")
        
    print("\n=== CANDIDATES ===")
    cands_res = supabase.table("candidates").select("id, email, full_name, batch_id").execute()
    for c in cands_res.data or []:
        print(f"ID: {c.get('id')}, Name: {c.get('full_name')}, Email: {c.get('email')}, Batch: {c.get('batch_id')}")
        
    print("\n=== TRAINEE POOL ===")
    pool_res = supabase.table("trainee_pool").select("id, email, full_name, status, onboarding_date").execute()
    for p in pool_res.data or []:
        print(f"ID: {p.get('id')}, Name: {p.get('full_name')}, Email: {p.get('email')}, Status: {p.get('status')}, Onboarding: {p.get('onboarding_date')}")

if __name__ == "__main__":
    main()
