from dotenv import load_dotenv
import os
from jose import jwt
from datetime import datetime, timedelta
import httpx

load_dotenv()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"

# Create token for Eswara
eswara_payload = {
    "sub": "bf581561-1234-4567-89ab-cdef12345678", 
    "email": "rajarevs.ai@gmail.com",
    "role": "COORDINATOR",
    "exp": datetime.utcnow() + timedelta(hours=24)
}

from supabase import create_client
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

res = supabase.table("users").select("id").eq("email", "rajarevs.ai@gmail.com").execute()
if res.data:
    eswara_payload["sub"] = res.data[0]["id"]

token = jwt.encode(eswara_payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

headers = {
    "Authorization": f"Bearer {token}"
}

client = httpx.Client(base_url="http://localhost:8000")

def main():
    # Find a batch ID
    batches = supabase.table("batches").select("id, batch_name").execute()
    if not batches.data:
        print("No batch found.")
        return
        
    for b in batches.data:
        batch_id = b["id"]
        batch_name = b["batch_name"]
        print(f"Fetching trainees for batch: {batch_name} ({batch_id})")
        
        response = client.get(f"/api/users/trainees?batch_id={batch_id}", headers=headers)
        if response.status_code == 200:
            data = response.json().get("data", [])
            print(f"Number of trainees fetched: {len(data)}")
            if data:
                print("First trainee keys:", list(data[0].keys()))
                print("First trainee details:")
                for k, v in data[0].items():
                    print(f"  {k}: {v}")
                break
        else:
            print(f"Failed to fetch trainees: {response.status_code} - {response.text}")

if __name__ == "__main__":
    main()
