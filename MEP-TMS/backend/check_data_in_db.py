import pg8000

ip = "13.235.158.127"
user = "postgres.xfbrhbuznbsidzriaukk"
pwd = "designathon2026"
port = 6543

try:
    print(f"Connecting directly to {ip}...")
    conn = pg8000.connect(host=ip, user=user, password=pwd, port=port, database="postgres", timeout=10)
    cursor = conn.cursor()
    cursor.execute("SELECT count(*) FROM candidates;")
    count = cursor.fetchone()[0]
    print(f"Total candidates in this DB: {count}")
    
    cursor.execute("SELECT id, email, full_name FROM candidates LIMIT 3;")
    rows = cursor.fetchall()
    print("Sample candidates:")
    for r in rows:
        print(f" - {r[0]} | {r[1]} | {r[2]}")
        
    cursor.close()
    conn.close()
except Exception as e:
    print("Error:", e)
