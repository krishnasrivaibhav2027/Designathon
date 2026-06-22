import pg8000

ip = "13.235.158.127"
user = "postgres.xfbrhbuznbsidzriaukk"
pwd = "designathon2026"
port = 6543

sql = """
CREATE OR REPLACE FUNCTION public.reload_schema() 
RETURNS void AS $$
BEGIN
    NOTIFY pgrst, 'reload schema';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
"""

try:
    print(f"Connecting to database via pooler ({ip}:{port})...")
    conn = pg8000.connect(host=ip, user=user, password=pwd, port=port, database="postgres", timeout=10)
    cursor = conn.cursor()
    print("Creating public.reload_schema() function...")
    cursor.execute(sql)
    conn.commit()
    print("Function created successfully!")
    cursor.close()
    conn.close()
except Exception as e:
    print("Error:", e)
