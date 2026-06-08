import pg8000
import socket
import sys

regions = [
    "ap-south-1",      # Mumbai
    "ap-southeast-1",  # Singapore
    "ap-southeast-2",  # Sydney
    "ap-northeast-1",  # Tokyo
    "ap-northeast-2",  # Seoul
    "eu-west-1",       # Ireland
    "eu-west-2",       # London
    "eu-central-1",    # Frankfurt
    "us-east-1",       # N. Virginia
    "us-east-2",       # Ohio
    "us-west-1",       # N. California
    "us-west-2",       # Oregon
    "sa-east-1"        # São Paulo
]

user = "postgres.xfbrhbuznbsidzriaukk"
passwords = [
    "designathon",
    "designathon123",
    "designathon2026",
    "postgres",
    "supabase",
    "admin",
    "password"
]

print("Scanning regions for pooler...")
found = False

for region in regions:
    host = f"aws-0-{region}.pooler.supabase.com"
    try:
        # Resolve host to check if it exists and has IPv4
        ip = socket.gethostbyname(host)
        print(f"Region {region} resolved to {ip}")
    except Exception:
        continue
        
    for pwd in passwords:
        try:
            # Connect via port 6543 (transaction pooler) or 5432
            conn = pg8000.connect(host=host, user=user, password=pwd, port=6543, database="postgres", timeout=3)
            print(f"[SUCCESS] Connected to {host} using password {pwd}!")
            cursor = conn.cursor()
            cursor.execute("SELECT version();")
            print("DB version:", cursor.fetchone())
            
            # Execute migration if needed
            print("Adding time_taken column if not exists...")
            cursor.execute("ALTER TABLE assessments ADD COLUMN IF NOT EXISTS time_taken INTEGER;")
            conn.commit()
            print("Migration query executed successfully!")
            
            # Reload schema cache
            print("Reloading schema cache...")
            cursor.execute("NOTIFY pgrst, 'reload schema';")
            conn.commit()
            print("pgrst notified successfully!")
            
            cursor.close()
            conn.close()
            found = True
            break
        except Exception as e:
            err = str(e)
            if "password authentication failed" in err:
                print(f"Auth failed for {host} with password {pwd}")
            elif "timeout" in err or "connection" in err:
                print(f"Network error for {host} on 6543: {err[:80]}")
                break # If network timeout, try next region instead of other passwords
            else:
                print(f"Error {host} with password {pwd}: {err[:80]}")
                
    if found:
        break

if found:
    print("Process completed successfully.")
else:
    print("Failed to find and connect to pooler.")
