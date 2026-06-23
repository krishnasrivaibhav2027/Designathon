from dotenv import load_dotenv
import os
from supabase import create_client

load_dotenv()

def main():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    supabase = create_client(url, key)
    
    print("Listing Admins:")
    res = supabase.table("users").select("*").eq("role", "ADMIN").execute()
    if res.data:
        for u in res.data:
            print(f"USER: {u.get('full_name')} - Email: {u.get('email')} - Role: {u.get('role')} - Active: {u.get('is_active')}")
    else:
        print("No ADMIN role users found.")

    print("\nListing Sanjay:")
    res2 = supabase.table("users").select("*").ilike("full_name", "%Sanjay%").execute()
    if res2.data:
        for u in res2.data:
            print(f"USER: {u.get('full_name')} - Email: {u.get('email')} - Role: {u.get('role')} - Active: {u.get('is_active')}")
    else:
        print("No users with name Sanjay found.")

if __name__ == "__main__":
    main()
