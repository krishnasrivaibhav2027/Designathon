import sys
import os
import requests
import time

sys.path.append(r"d:\GitRepos\Designathon\MEP-TMS\backend")
os.environ["PYTHONPATH"] = r"d:\GitRepos\Designathon\MEP-TMS\backend"

from app.core.config import settings
from app.core.database import connect_to_supabase, get_db
from app.core.security import create_access_token

def simulate():
    connect_to_supabase()
    db = get_db()
    
    # 1. Fetch user Sanjay
    print("Fetching Sanjay user record from DB...")
    res = db.table("users").select("*").eq("email", "sanjayvaddiparthi@gmail.com").execute()
    if not res.data:
        print("Sanjay user not found in DB.")
        return
    user = res.data[0]
    print(f"Found user: {user.get('full_name')} - ID: {user.get('id')} - Role: {user.get('role')}")
    
    # 2. Generate valid JWT token
    token = create_access_token(
        data={
            "sub": user["id"],
            "email": user.get("email"),
            "role": user.get("role"),
            "fullName": user.get("full_name", "")
        }
    )
    print(f"Generated JWT token: {token[:20]}...")
    
    # 3. HTTP GET to /api/users/dashboard-analytics
    url = "http://127.0.0.1:8000"
    print("\nSending GET /api/users/dashboard-analytics via HTTP...")
    headers = {"Authorization": f"Bearer {token}"}
    try:
        start = time.time()
        resp = requests.get(f"{url}/api/users/dashboard-analytics", headers=headers, timeout=10)
        print(f"Response status: {resp.status_code} in {time.time() - start:.3f}s")
        if resp.status_code == 200:
            print("Successfully fetched analytics data!")
            data = resp.json()
            print(f"Stats: {data.get('stats')}")
        else:
            print(f"Error: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"Request failed: {e}")
        
    # 4. HTTP GET to /api/users/activity-logs
    print("\nSending GET /api/users/activity-logs via HTTP...")
    try:
        start = time.time()
        resp = requests.get(f"{url}/api/users/activity-logs", headers=headers, timeout=10)
        print(f"Response status: {resp.status_code} in {time.time() - start:.3f}s")
        if resp.status_code == 200:
            print(f"Successfully fetched {len(resp.json())} activity logs!")
        else:
            print(f"Error: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    simulate()
