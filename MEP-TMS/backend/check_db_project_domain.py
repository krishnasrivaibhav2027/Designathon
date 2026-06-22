import pg8000

host = "db.xfbrhbuznbsidzriaukk.supabase.co"
user = "postgres"
pwd = "designathon2026"
port = 6543

try:
    print(f"Connecting to pooler on {host}:{port} as user '{user}'...")
    conn = pg8000.connect(host=host, user=user, password=pwd, port=port, database="postgres", timeout=10)
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, bits_accumulated, bytes_total FROM candidates LIMIT 5;")
    rows = cursor.fetchall()
    print("Database Query Successful! Rows from candidates:")
    for r in rows:
        print(f" - ID: {r[0]}, Email: {r[1]}, Bits: {r[2]}, Bytes: {r[3]}")
    cursor.close()
    conn.close()
except Exception as e:
    print("Database Query Failed:", e)
