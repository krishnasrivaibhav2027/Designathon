import pg8000
import sys

host = "db.xfbrhbuznbsidzriaukk.supabase.co"
user = "postgres"
password = "password"

try:
    conn = pg8000.connect(host=host, user=user, password=password, port=6543, database="postgres", timeout=10)
    cursor = conn.cursor()
    print("Notifying pgrst to reload schema cache...")
    cursor.execute("NOTIFY pgrst, 'reload schema';")
    conn.commit()
    print("Notification sent successfully!")
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
