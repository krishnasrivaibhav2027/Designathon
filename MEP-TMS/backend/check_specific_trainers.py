from dotenv import load_dotenv
import os
from supabase import create_client

load_dotenv()

emails = [
    "203j1a4218@raghuinstech.com",
    "versatilevaibhu@gmail.com",
    "kavyabhimana@gmail.com"
]

def main():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    supabase = create_client(url, key)
    
    print("=== SEARCHING IN USERS ===")
    for email in emails:
        u_res = supabase.table("users").select("*").eq("email", email).execute()
        if u_res.data:
            u = u_res.data[0]
            print(f"USER - Email: {email}, ID: {u.get('id')}, Name: {u.get('full_name')}, Role: {u.get('role')}, Active: {u.get('is_active')}")
        else:
            print(f"USER - Email: {email} NOT FOUND")

if __name__ == "__main__":
    main()
