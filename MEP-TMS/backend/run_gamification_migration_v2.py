import pg8000
import socket
import sys
import os

regions = ["ap-south-1"]
user = "postgres.xfbrhbuznbsidzriaukk"
passwords = ["designathon2026"]

migration_file = "gamification_migration.sql"
if not os.path.exists(migration_file):
    migration_file = os.path.join(os.path.dirname(__file__), migration_file)

if not os.path.exists(migration_file):
    print(f"[FAIL] Migration file '{migration_file}' not found.")
    sys.exit(1)

with open(migration_file, "r") as f:
    sql = f.read()

# Split commands by semicolon, ignore comments and empty statements
commands = []
for cmd in sql.split(";"):
    cleaned = cmd.strip()
    if cleaned and not cleaned.startswith("--"):
        commands.append(cleaned)

print("Applying gamification schema updates...")
found = False

for region in regions:
    host = f"aws-0-{region}.pooler.supabase.com"
    for pwd in passwords:
        try:
            conn = pg8000.connect(host=host, user=user, password=pwd, port=6543, database="postgres", timeout=5)
            print(f"[SUCCESS] Connected to {host}")
            cursor = conn.cursor()
            
            for cmd in commands:
                print(f"Executing: {cmd[:60]}...")
                cursor.execute(cmd)
                
            conn.commit()
            print("[SUCCESS] Gamification SQL migration committed successfully!")
            
            # Reload schema cache
            print("Reloading PostgREST schema cache...")
            cursor.execute("NOTIFY pgrst, 'reload schema';")
            conn.commit()
            print("PostgREST schema cache reloaded successfully!")
            
            cursor.close()
            conn.close()
            found = True
            break
        except Exception as e:
            print(f"Error connecting to {host}: {e}")
            
    if found:
        break

if found:
    sys.exit(0)
else:
    print("[FAIL] Could not run migration.")
    sys.exit(1)
