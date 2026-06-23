import sys
import os

sys.path.append(r"d:\GitRepos\Designathon\MEP-TMS\backend")
os.environ["PYTHONPATH"] = r"d:\GitRepos\Designathon\MEP-TMS\backend"

from app.core.config import settings
import redis as redis_lib

def list_keys():
    url = getattr(settings, "REDIS_URL", "")
    try:
        client = redis_lib.from_url(
            url,
            decode_responses=True,
        )
        print("Connected to Redis. Scanning keys...")
        keys = client.keys("mep:*")
        print(f"Found {len(keys)} keys:")
        for k in keys:
            ttl = client.ttl(k)
            # Try to print some preview of value
            val = client.get(k)
            val_preview = val[:100] if val else ""
            print(f" - Key: {k} (TTL: {ttl}s) -> Preview: {val_preview}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_keys()
