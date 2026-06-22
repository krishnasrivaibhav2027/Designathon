import pg8000

ip = "13.235.158.127"
user = "postgres.xfbrhbuznbsidzriaukk"
pwd = "designathon2026"
port = 6543

try:
    conn = pg8000.connect(host=ip, user=user, password=pwd, port=port, database="postgres", timeout=10)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT table_schema, column_name 
        FROM information_schema.columns 
        WHERE table_name = 'candidates' AND column_name = 'bits_accumulated';
    """)
    rows = cursor.fetchall()
    print("Schema of bits_accumulated in candidates table:")
    for r in rows:
        print(f" - Schema: {r[0]}, Column: {r[1]}")
    cursor.close()
    conn.close()
except Exception as e:
    print("Error:", e)
