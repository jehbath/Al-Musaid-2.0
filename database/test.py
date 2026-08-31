from pathlib import Path
import sqlite3

DATABASE_PATH = Path(__file__).parent / "bank.db"

conn = sqlite3.connect(DATABASE_PATH)
cursor = conn.cursor()

cursor.execute("""
    DELETE FROM transactions
    WHERE id NOT IN (
        SELECT MIN(id)
        FROM transactions
        GROUP BY account_id, transaction_date, type, amount, category, merchant, description
    )
""")

conn.commit()

print("Duplicate transactions removed successfully.")

cursor.execute("""
    SELECT id, transaction_date, type, amount, merchant
    FROM transactions
    ORDER BY id
""")

print(cursor.fetchall())

conn.close()
