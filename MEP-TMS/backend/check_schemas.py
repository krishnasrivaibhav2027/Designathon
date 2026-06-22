import socket
import pg8000

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
    
    # Check current schema search path
    cursor.execute("SHOW search_path;")
    print("search_path:", cursor.fetchone())
    
    # Check candidates table schema
    cursor.execute("""
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_name = 'candidates';
    """)
    tables = cursor.fetchall()
    print("Candidates tables in DB:")
    for t in tables:
        print(f" - {t[0]}.{t[1]}")
        
    cursor.close()
    conn.close()
except Exception as e:
    print("Error:", e)
