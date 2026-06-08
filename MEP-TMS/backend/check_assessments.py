from dotenv import load_dotenv
import os
from supabase import create_client

load_dotenv()

def main():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    supabase = create_client(url, key)
    
    print("=== ASSESSMENTS ===")
    res = supabase.table("assessments").select("id, batch_id, candidate_id, assessment_name, obtained_score, total_score, created_at").order("created_at").execute()
    for row in res.data or []:
        print(f"ID: {row.get('id')}, Candidate: {row.get('candidate_id')}, Name: '{row.get('assessment_name')}', Score: {row.get('obtained_score')}/{row.get('total_score')}, Date: {row.get('created_at')}")

if __name__ == "__main__":
    main()
