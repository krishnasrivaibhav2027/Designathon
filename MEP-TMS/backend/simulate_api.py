from dotenv import load_dotenv
import os
from jose import jwt
from datetime import datetime, timedelta
import httpx

load_dotenv()

# Load settings
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"

# Create a mock token for Eswara (Coordinator)
# Standard payload format from backend/app/core/security.py
eswara_payload = {
    "sub": "bf581561-1234-4567-89ab-cdef12345678", # Mock user ID or replace with actual
    "email": "rajarevs.ai@gmail.com",
    "role": "COORDINATOR",
    "exp": datetime.utcnow() + timedelta(hours=24)
}

# Let's get the actual user ID of Eswara first
from supabase import create_client
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)
res = supabase.table("users").select("id").eq("email", "rajarevs.ai@gmail.com").execute()
if res.data:
    eswara_payload["sub"] = res.data[0]["id"]

token = jwt.encode(eswara_payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

client = httpx.Client(base_url="http://localhost:8000")

def test_trainer_edit():
    # Find a trainer ID
    trainers = supabase.table("users").select("id").eq("role", "TRAINER").limit(1).execute()
    if not trainers.data:
        print("No trainer found to test edit.")
        return
    trainer_id = trainers.data[0]["id"]
    print(f"Testing Update Trainer with ID: {trainer_id}")
    
    # Try updating their phone or name
    payload = {
        "fullName": "Krishna Sri Vaibhav",
        "email": "203j1a4218@raghuinstech.com",
        "phone": "+91 99999 99999",
        "isActive": True
    }
    
    # Send PUT request
    try:
        response = client.put(f"/api/users/{trainer_id}", json=payload, headers=headers)
        print(f"Update Trainer Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Update Trainer failed to connect: {e}")

def test_trainee_edit():
    # Find a trainee pool ID
    pool = supabase.table("trainee_pool").select("id").limit(1).execute()
    if not pool.data:
        print("No trainee found in pool to test edit.")
        return
    pool_id = pool.data[0]["id"]
    print(f"Testing Update Trainee Pool with ID: {pool_id}")
    
    payload = {
        "fullName": "Krish Sane",
        "foundationLanguage": "C#",
        "status": "SPARK_1"
    }
    
    try:
        response = client.put(f"/api/onboarding/pool/{pool_id}", json=payload, headers=headers)
        print(f"Update Trainee Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Update Trainee failed to connect: {e}")

if __name__ == "__main__":
    test_trainer_edit()
    print("-" * 40)
    test_trainee_edit()
