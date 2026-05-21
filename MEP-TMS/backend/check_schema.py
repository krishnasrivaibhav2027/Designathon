import asyncio
from dotenv import load_dotenv
import os
from supabase import create_client
from datetime import datetime, timedelta

load_dotenv()

async def main():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    supabase = create_client(url, key)
    
    test_batch = {
        "batch_id": "TEST-BATCH-2",
        "batch_name": "Test Batch 2",
        "start_date": datetime.now().isoformat(),
        "end_date": (datetime.now() + timedelta(days=30)).isoformat(),
        "trainers": ["trainer@test.com"],
        "description": "Test description",
        "status": "PLANNED",
        "topics": ["React", "CSS"],
        "size_limit": 40
    }
    
    try:
        res = supabase.table("batches").insert(test_batch).execute()
        print("Insert with topics & size_limit successful:", res.data)
        supabase.table("batches").delete().eq("batch_id", "TEST-BATCH-2").execute()
    except Exception as e:
        print("Insert with topics & size_limit failed:", e)

if __name__ == "__main__":
    asyncio.run(main())
