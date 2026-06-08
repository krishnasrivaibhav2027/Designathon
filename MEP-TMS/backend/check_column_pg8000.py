import pg8000
import sys

host = "db.xfbrhbuznbsidzriaukk.supabase.co"
user = "postgres"
password = "password"

try:
    conn = pg8000.connect(host=host, user=user, password=password, port=6543, database="postgres", timeout=10)
    cursor = conn.cursor()
    cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name='assessments';")
    columns = [row[0] for row in cursor.fetchall()]
    print("Columns in assessments table:", columns)
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
