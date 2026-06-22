import pg8000
import socket

host = "aws-0-ap-south-1.pooler.supabase.com"
try:
    ip = socket.gethostbyname(host)
    print(f"Resolved to {ip}")
except Exception as e:
    print("DNS resolution failed:", e)

user = "postgres.xfbrhbuznbsidzriaukk"
pwd = "designathon2026"
port = 6543

try:
    conn = pg8000.connect(host=host, user=user, password=pwd, port=port, database="postgres", timeout=10)
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, bits_accumulated, bytes_total FROM candidates LIMIT 5;")
    rows = cursor.fetchall()
    print("Rows from candidates:")
    for r in rows:
        print(f" - ID: {r[0]}, Email: {r[1]}, Bits: {r[2]}, Bytes: {r[3]}")
    cursor.close()
    conn.close()
except Exception as e:
    print("Error:", e)
