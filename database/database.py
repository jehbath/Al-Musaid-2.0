import sqlite3
from pathlib import Path

DATABASE_PATH = Path(__file__).parent / "bank.db"


def get_connection():
    return sqlite3.connect(DATABASE_PATH)


def create_tables():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            account_number TEXT UNIQUE NOT NULL,
            account_type TEXT NOT NULL,
            balance REAL NOT NULL DEFAULT 0,
            currency TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            transaction_date TEXT NOT NULL,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT,
            merchant TEXT,
            description TEXT,
            FOREIGN KEY (account_id) REFERENCES accounts(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS branches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            address TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS atms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            address TEXT NOT NULL
        )
    """)

    connection.commit()
    connection.close()


def insert_transaction(cursor, transaction):
    """
    Insert a transaction only if the same transaction
    does not already exist.
    """

    cursor.execute(
        """
        SELECT id FROM transactions
        WHERE account_id = ?
        AND transaction_date = ?
        AND type = ?
        AND amount = ?
        AND category = ?
        AND merchant = ?
        AND description = ?
        """,
        transaction,
    )

    if cursor.fetchone() is None:
        cursor.execute(
            """
            INSERT INTO transactions
            (
                account_id,
                transaction_date,
                type,
                amount,
                category,
                merchant,
                description
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            transaction,
        )


def insert_sample_data():
    connection = get_connection()
    cursor = connection.cursor()

    # User
    cursor.execute("""
        INSERT OR IGNORE INTO users (id, name, email)
        VALUES (1, 'Mohamed', 'mohamed@example.com')
    """)

    # Account
    cursor.execute("""
        INSERT OR IGNORE INTO accounts
        (
            id,
            user_id,
            account_number,
            account_type,
            balance,
            currency
        )
        VALUES (
            1,
            1,
            'SA123456789',
            'checking',
            3500.00,
            'SAR'
        )
    """)

    # August transactions
    transactions = [
        (
            1,
            "2026-08-01",
            "debit",
            150.00,
            "groceries",
            "Carrefour",
            "Grocery shopping",
        ),
        (
            1,
            "2026-08-02",
            "debit",
            80.00,
            "restaurant",
            "Restaurant A",
            "Dinner",
        ),
        (
            1,
            "2026-08-03",
            "credit",
            5000.00,
            "salary",
            "Employer",
            "Monthly salary",
        ),
    ]

    for transaction in transactions:
        insert_transaction(cursor, transaction)

    connection.commit()
    connection.close()


def insert_july_data():
    connection = get_connection()
    cursor = connection.cursor()

    # July transactions
    transactions = [
        (
            1,
            "2026-07-10",
            "debit",
            100.00,
            "groceries",
            "Carrefour",
            "Grocery shopping",
        ),
        (
            1,
            "2026-07-20",
            "debit",
            50.00,
            "restaurant",
            "Restaurant B",
            "Dinner",
        ),
    ]

    for transaction in transactions:
        insert_transaction(cursor, transaction)

    connection.commit()
    connection.close()


def insert_location_data():
    connection = get_connection()
    cursor = connection.cursor()

    # Branches
    branches = [
        (
            "Al Riyadh Main Branch",
            24.7136,
            46.6753,
            "King Fahd Road, Riyadh",
        ),
        (
            "Olaya Branch",
            24.6900,
            46.6850,
            "Olaya Street, Riyadh",
        ),
        (
            "Al Malaz Branch",
            24.6750,
            46.7200,
            "Al Malaz, Riyadh",
        ),
    ]

    for branch in branches:
        cursor.execute(
            """
            SELECT id FROM branches
            WHERE name = ?
            """,
            (branch[0],),
        )

        if cursor.fetchone() is None:
            cursor.execute(
                """
                INSERT INTO branches
                (name, latitude, longitude, address)
                VALUES (?, ?, ?, ?)
                """,
                branch,
            )

    # ATMs
    atms = [
        (
            "ATM - King Fahd Road",
            24.7100,
            46.6800,
            "King Fahd Road, Riyadh",
        ),
        (
            "ATM - Olaya",
            24.6920,
            46.6870,
            "Olaya Street, Riyadh",
        ),
        (
            "ATM - Al Malaz",
            24.6730,
            46.7180,
            "Al Malaz, Riyadh",
        ),
    ]

    for atm in atms:
        cursor.execute(
            """
            SELECT id FROM atms
            WHERE name = ?
            """,
            (atm[0],),
        )

        if cursor.fetchone() is None:
            cursor.execute(
                """
                INSERT INTO atms
                (name, latitude, longitude, address)
                VALUES (?, ?, ?, ?)
                """,
                atm,
            )

    connection.commit()
    connection.close()


def get_transaction_categories():
    """
    Get all unique transaction categories from the database.
    """

    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute("""
            SELECT DISTINCT category
            FROM transactions
            WHERE category IS NOT NULL
            AND TRIM(category) != ''
            ORDER BY category
        """)

        rows = cursor.fetchall()

        categories = [row[0] for row in rows]

        return categories

    finally:
        connection.close()


if __name__ == "__main__":
    create_tables()
    insert_sample_data()
    insert_july_data()
    insert_location_data()

    print("Database and sample data created successfully.")
