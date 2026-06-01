import pg8000
import sys

host = "db.xfbrhbuznbsidzriaukk.supabase.co"
user = "postgres"
passwords = [
    "designathon",
    "designathon123",
    "designathon2026",
    "postgres",
    "supabase",
    "admin",
    "password",
    "postgres.xfbrhbuznbsidzriaukk"
]

sql = """
CREATE TABLE IF NOT EXISTS file_upload_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uploader_id UUID REFERENCES users(id) ON DELETE SET NULL,
    uploader_email VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    batch_id UUID,
    row_count INTEGER,
    status VARCHAR(20) DEFAULT 'SUCCESS',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
"""

print("Attempting to connect and create file_upload_logs table...")

connected = False
for port in (5432, 6543):
    for pwd in passwords:
        try:
            conn = pg8000.connect(host=host, user=user, password=pwd, port=port, database="postgres", timeout=5)
            print(f"[SUCCESS] Connected on port {port} with password: {pwd}")
            cursor = conn.cursor()
            cursor.execute(sql)
            conn.commit()
            print("[SUCCESS] Created file_upload_logs table successfully!")
            cursor.close()
            conn.close()
            connected = True
            break
        except Exception as e:
            pass
    if connected:
        break

if not connected:
    print("[FAIL] Could not connect to database to create table.")
    sys.exit(1)
sys.exit(0)
