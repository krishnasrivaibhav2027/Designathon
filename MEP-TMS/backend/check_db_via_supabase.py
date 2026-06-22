import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app.core.database import connect_to_supabase, get_db

connect_to_supabase()
db = get_db()

print("Querying users with name containing Santhosh...")
try:
    res = db.table("users").select("*").ilike("full_name", "%santhosh%").execute()
    for u in res.data:
        print(f"User: {u['email']} | {u['full_name']} | {u['role']}")
        
        # Check candidates for this email
        c_res = db.table("candidates").select("*").eq("email", u['email']).execute()
        for c in c_res.data:
            print(f"Candidate: {c['email']} | batch_id: {c.get('batch_id')} | id: {c.get('id')}")
except Exception as e:
    print("Error:", e)
