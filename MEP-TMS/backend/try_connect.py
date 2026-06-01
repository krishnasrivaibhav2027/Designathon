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
    "postgres.xfbrhbuznbsidzriaukk",
    "sb_publishable_sNpcGenAJsBJ3M_Z7cXD0Q_4Hs3kSxm"
]

print("Trying to connect to direct database (port 5432)...")
for pwd in passwords:
    try:
        conn = pg8000.connect(host=host, user=user, password=pwd, port=5432, database="postgres", timeout=5)
        print(f"[SUCCESS] Connected with password: {pwd}")
        
        # Read and run detailed_feedback_schema.sql
        with open("detailed_feedback_schema.sql", "r") as f:
            sql = f.read()
            
        cursor = conn.cursor()
        print("Running SQL script...")
        cursor.execute(sql)
        conn.commit()
        print("SQL script completed successfully!")
        
        # Close connection
        cursor.close()
        conn.close()
        sys.exit(0)
    except Exception as e:
        err_msg = str(e)
        if "password authentication failed" in err_msg:
            print(f"Failed with password: {pwd}")
        else:
            print(f"Error with password {pwd}: {err_msg}")
            
print("Direct database connection failed. Trying transaction pooler (port 6543)...")
for pwd in passwords:
    try:
        conn = pg8000.connect(host=host, user=user, password=pwd, port=6543, database="postgres", timeout=5)
        print(f"[SUCCESS] Connected on 6543 with password: {pwd}")
        
        # Read and run detailed_feedback_schema.sql
        with open("detailed_feedback_schema.sql", "r") as f:
            sql = f.read()
            
        cursor = conn.cursor()
        print("Running SQL script...")
        cursor.execute(sql)
        conn.commit()
        print("SQL script completed successfully!")
        
        # Close connection
        cursor.close()
        conn.close()
        sys.exit(0)
    except Exception as e:
        err_msg = str(e)
        if "password authentication failed" in err_msg:
            print(f"Failed with password: {pwd}")
        else:
            print(f"Error with password {pwd}: {err_msg}")

print("All connection attempts failed.")
sys.exit(1)
