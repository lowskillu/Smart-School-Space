import sqlite3
import os

db_path = "instance/school.db"
if not os.path.exists(db_path):
    db_path = "../instance/school.db"

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE courses ADD COLUMN category VARCHAR(50) DEFAULT 'academic';")
        conn.commit()
        print("Column 'category' added successfully.")
    except sqlite3.OperationalError as e:
        print(f"Error: {e}")
    finally:
        conn.close()
else:
    print(f"Database not found at {db_path}")
