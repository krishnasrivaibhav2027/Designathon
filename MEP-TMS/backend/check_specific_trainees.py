from dotenv import load_dotenv
import os
from supabase import create_client

load_dotenv()

emails = [
    "krish.sane795@gmail.com",
    "hunar.kothari153@gmail.com",
    "ryan.edwin322@gmail.com",
    "vihaan.mand502@gmail.com",
    "tiya.bera733@gmail.com"
]

def main():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    supabase = create_client(url, key)
    
    print("=== SEARCHING IN CANDIDATES ===")
    for email in emails:
        c_res = supabase.table("candidates").select("*").eq("email", email).execute()
        if c_res.data:
            c = c_res.data[0]
            print(f"CANDIDATE - Email: {email}, ID: {c.get('id')}, Name: {c.get('full_name')}, Batch: {c.get('batch_id')}")
        else:
            print(f"CANDIDATE - Email: {email} NOT FOUND")
            
    print("\n=== SEARCHING IN TRAINEE POOL ===")
    for email in emails:
        p_res = supabase.table("trainee_pool").select("*").eq("email", email).execute()
        if p_res.data:
            p = p_res.data[0]
            print(f"POOL - Email: {email}, ID: {p.get('id')}, Name: {p.get('full_name')}, Status: {p.get('status')}")
        else:
            print(f"POOL - Email: {email} NOT FOUND")

if __name__ == "__main__":
    main()
