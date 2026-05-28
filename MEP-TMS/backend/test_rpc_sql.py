import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

# Try common RPC names for SQL execution
common_rpcs = [
    ("exec_sql", {"query": "SELECT 1"}),
    ("run_sql", {"sql": "SELECT 1"}),
    ("execute_sql", {"sql_query": "SELECT 1"}),
]

for rpc_name, params in common_rpcs:
    try:
        res = supabase.rpc(rpc_name, params).execute()
        print(f"RPC {rpc_name} succeeded:", res.data)
        break
    except Exception as e:
        print(f"RPC {rpc_name} failed:", str(e)[:150])
else:
    print("No common SQL RPC functions found.")
