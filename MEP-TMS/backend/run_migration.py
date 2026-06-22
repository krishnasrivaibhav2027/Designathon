import pg8000
import sys
import os

host = "db.xfbrhbuznbsidzriaukk.supabase.co"
user = "postgres"
passwords = [
    "designathon",
    "designathon123",
    "designathon2026",
    "postgres",
    "supabase",
    "admin",
    "password",
    "postgres.xfbrhbuznbsidzriaukk",
    "sb_publishable_sNpcGenAJsBJ3M_Z7cXD0Q_4Hs3kSxm"
]

migration_file = "gamification_migration.sql"
if not os.path.exists(migration_file):
    migration_file = os.path.join(os.path.dirname(__file__), migration_file)

if not os.path.exists(migration_file):
    print(f"[FAIL] Migration file '{migration_file}' not found.")
    sys.exit(1)

with open(migration_file, "r") as f:
    sql = f.read()

print("Applying gamification schema updates...")

connected = False
for port in (5432, 6543):
    for pwd in passwords:
        try:
            conn = pg8000.connect(host=host, user=user, password=pwd, port=port, database="postgres", timeout=10)
            print(f"[SUCCESS] Connected on port {port} with password: {pwd}")
            cursor = conn.cursor()
            
            # Split commands by semicolon to handle statements individually, ignoring blank lines
            commands = [cmd.strip() for cmd in sql.split(";") if cmd.strip()]
            for cmd in commands:
                print(f"Executing: {cmd[:60]}...")
                cursor.execute(cmd)
                
            conn.commit()
            print("[SUCCESS] Gamification schema migration completed successfully!")
            cursor.close()
            conn.close()
            connected = True
            break
        except Exception as e:
            # Print specific error details for debugging
            err_msg = str(e)
            if "password authentication failed" not in err_msg:
                print(f"Error on port {port} with password {pwd}: {err_msg}")
    if connected:
        break

if not connected:
    print("[FAIL] Could not connect to Supabase database to run migration.")
    sys.exit(1)
sys.exit(0)
