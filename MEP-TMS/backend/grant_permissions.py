import pg8000

ip = "13.235.158.127"
user = "postgres.xfbrhbuznbsidzriaukk"
pwd = "designathon2026"
port = 6543

sql = """
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.candidates TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.trainee_pool TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.gamification_ledger TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
"""

try:
    print(f"Connecting to database via pooler ({ip}:{port})...")
    conn = pg8000.connect(host=ip, user=user, password=pwd, port=port, database="postgres", timeout=10)
    cursor = conn.cursor()
    print("Granting permissions to REST API roles...")
    for stmt in [s.strip() for s in sql.split(";") if s.strip()]:
        print(f"Executing: {stmt[:60]}...")
        cursor.execute(stmt)
    conn.commit()
    print("Permissions granted successfully!")
    
    # Send reload schema notification
    print("Sending reload schema NOTIFY...")
    cursor.execute("NOTIFY pgrst, 'reload schema';")
    conn.commit()
    print("NOTIFY sent successfully!")
    
    cursor.close()
    conn.close()
except Exception as e:
    print("Error:", e)
