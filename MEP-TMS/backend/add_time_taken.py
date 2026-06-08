import pg8000
import sys

host = "db.xfbrhbuznbsidzriaukk.supabase.co"
user = "postgres"
passwords = [
    " Designathon@99"
]

print("Connecting to database...")
connected = False
for password in passwords:
    try:
        conn = pg8000.connect(host=host, user=user, password=password, port=5432, database="postgres", timeout=5)
        print(f"[SUCCESS] Connected with password: {password}")
        cursor = conn.cursor()
        print("Altering assessments table to add time_taken...")
        cursor.execute("ALTER TABLE assessments ADD COLUMN IF NOT EXISTS time_taken INTEGER;")
        conn.commit()
        print("Column time_taken added successfully!")
        cursor.close()
        conn.close()
        connected = True
        break
    except Exception as e:
        err_msg = str(e)
        if "password authentication failed" in err_msg:
            print(f"Failed with password: {password}")
        else:
            print(f"Error with password {password}: {err_msg}")

if not connected:
    print("Trying transaction pooler on port 6543...")
    for password in passwords:
        try:
            conn = pg8000.connect(host=host, user=user, password=password, port=6543, database="postgres", timeout=5)
            print(f"[SUCCESS] Connected on 6543 with password: {password}")
            cursor = conn.cursor()
            print("Altering assessments table to add time_taken...")
            cursor.execute("ALTER TABLE assessments ADD COLUMN IF NOT EXISTS time_taken INTEGER;")
            conn.commit()
            print("Column time_taken added successfully!")
            cursor.close()
            conn.close()
            connected = True
            break
        except Exception as e:
            err_msg = str(e)
            if "password authentication failed" in err_msg:
                print(f"Failed with password: {password}")
            else:
                print(f"Error with password {password}: {err_msg}")

if connected:
    print("Migration finished successfully.")
    sys.exit(0)
else:
    print("Migration failed: could not connect to DB.")
    sys.exit(1)
