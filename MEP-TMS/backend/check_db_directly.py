import pg8000

ip = "13.235.158.127"
user = "postgres.xfbrhbuznbsidzriaukk"
pwd = "designathon2026"
port = 6543

try:
    print(f"Connecting directly to {ip}...")
    conn = pg8000.connect(host=ip, user=user, password=pwd, port=port, database="postgres", timeout=10)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'candidates';
    """)
    cols = cursor.fetchall()
    print("Database columns in candidates table:")
    for col in cols:
        print(f" - {col[0]}: {col[1]}")
    cursor.close()
    conn.close()
except Exception as e:
    print("Error:", e)
