import pg8000
import socket

ip = "13.235.158.127"
user = "postgres.xfbrhbuznbsidzriaukk"
pwd = "designathon2026"
port = 5432

try:
    print(f"Connecting to Session Pooler ({ip}:{port})...")
    conn = pg8000.connect(host=ip, user=user, password=pwd, port=port, database="postgres", timeout=15)
    cursor = conn.cursor()
    print("Connected successfully! Reloading schema cache...")
    cursor.execute("NOTIFY pgrst, 'reload schema';")
    conn.commit()
    print("Schema reload NOTIFY sent successfully!")
    cursor.close()
    conn.close()
except Exception as e:
    print("Error:", e)
