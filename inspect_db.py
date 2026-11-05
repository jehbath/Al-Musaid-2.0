import sqlite3

connection = sqlite3.connect("file:database/bank.db?mode=ro", uri=True)

cursor = connection.cursor()

queries = {
    "USERS": "SELECT * FROM users",
    "ACCOUNTS": "SELECT * FROM accounts",
    "TRANSACTIONS": "SELECT * FROM transactions LIMIT 10",
}

for title, query in queries.items():
    print(f"\n========== {title} ==========")

    rows = cursor.execute(query).fetchall()

    for row in rows:
        print(row)

    print("TOTAL:", len(rows))

connection.close()
