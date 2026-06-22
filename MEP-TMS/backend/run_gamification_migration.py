import pg8000
import sys
import os

host = "aws-0-ap-south-1.pooler.supabase.com"
user = "postgres.xfbrhbuznbsidzriaukk"
pwd = "designathon2026"
port = 6543

migration_file = "gamification_migration.sql"
if not os.path.exists(migration_file):
    migration_file = os.path.join(os.path.dirname(__file__), migration_file)

if not os.path.exists(migration_file):
    print(f"[FAIL] Migration file '{migration_file}' not found.")
    sys.exit(1)

with open(migration_file, "r") as f:
    sql = f.read()

print("Applying gamification schema updates via transaction pooler...")

try:
    conn = pg8000.connect(host=host, user=user, password=pwd, port=port, database="postgres", timeout=10)
    print(f"[SUCCESS] Connected to {host} on port {port}")
    cursor = conn.cursor()
    
    # Split commands by semicolon to handle statements individually, ignoring blank lines
    # To avoid errors with nested blocks, we split simple statements
    commands = [cmd.strip() for cmd in sql.split(";") if cmd.strip()]
    for cmd in commands:
        print(f"Executing: {cmd[:60]}...")
        cursor.execute(cmd)
        
    conn.commit()
    print("[SUCCESS] Gamification schema migration completed successfully!")
    
    # Reload PostgREST schema cache
    print("Reloading PostgREST schema cache...")
    cursor.execute("NOTIFY pgrst, 'reload schema';")
    conn.commit()
    print("[SUCCESS] PostgREST schema cache reloaded!")
    
    cursor.close()
    conn.close()
    sys.exit(0)
except Exception as e:
    print(f"[FAIL] Migration error: {e}")
    sys.exit(1)
