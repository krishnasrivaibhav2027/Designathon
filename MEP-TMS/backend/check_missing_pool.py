import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

cands_res = supabase.table("candidates").select("id, email, full_name").execute()
pool_res = supabase.table("trainee_pool").select("email").execute()

pool_emails = {p["email"].strip().lower() for p in pool_res.data} if pool_res.data else set()

missing = []
for c in cands_res.data or []:
    email = c["email"].strip().lower()
    if email not in pool_emails:
        missing.append(c)

print(f"Total candidates: {len(cands_res.data) if cands_res.data else 0}")
print(f"Candidates with missing trainee_pool record: {len(missing)}")
if missing:
    print("Example missing candidates:")
    for m in missing[:5]:
        print(f"  Name: {m['full_name']}, Email: {m['email']}")
else:
    print("All candidates have matching trainee_pool records.")
