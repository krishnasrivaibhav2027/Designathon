import sys
import os
import time

sys.path.append(r"d:\GitRepos\Designathon\MEP-TMS\backend")
os.environ["PYTHONPATH"] = r"d:\GitRepos\Designathon\MEP-TMS\backend"

from app.core.config import settings
import redis as redis_lib

def test_redis():
    url = getattr(settings, "REDIS_URL", "")
    print(f"Connecting to Redis URL: {url[:30]}...")
    try:
        start = time.time()
        client = redis_lib.from_url(
            url,
            decode_responses=True,
            socket_connect_timeout=3,
            socket_timeout=2,
            retry_on_timeout=True,
        )
        client.ping()
        print(f"Ping successful in {time.time() - start:.3f}s")
        
        # Test get/set
        print("Testing setex...")
        client.setex("mep_test_key", 10, "hello world")
        print("Testing get...")
        val = client.get("mep_test_key")
        print(f"Retrieved value: {val}")
        
    except Exception as e:
        print(f"Redis Error: {e}")

if __name__ == "__main__":
    test_redis()
