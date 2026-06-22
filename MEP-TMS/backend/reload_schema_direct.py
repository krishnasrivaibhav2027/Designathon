import pg8000
import sys

host = "db.xfbrhbuznbsidzriaukk.supabase.co"
user = "postgres"
password = "designathon2026"

try:
    print(f"Connecting to database {host}:5432...")
    conn = pg8000.connect(host=host, user=user, password=password, port=5432, database="postgres", timeout=15)
    cursor = conn.cursor()
    print("Connected successfully! Reloading schema cache...")
    cursor.execute("NOTIFY pgrst, 'reload schema';")
    conn.commit()
    print("Schema reload NOTIFY sent successfully!")
    cursor.close()
    conn.close()
    sys.exit(0)
except Exception as e:
    print(f"Failed to reload schema: {e}")
    sys.exit(1)
