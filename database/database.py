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


def migrate_users_table():
    """
    Add authentication-related columns to the existing users table.
    Safe to run multiple times.
    """

    connection = get_connection()

    try:
        cursor = connection.cursor()

        # Get existing columns
        cursor.execute("PRAGMA table_info(users)")
        existing_columns = {column[1] for column in cursor.fetchall()}

        # Add password_hash
        if "password_hash" not in existing_columns:
            cursor.execute("""
                ALTER TABLE users
                ADD COLUMN password_hash TEXT
            """)

            print("Added password_hash column.")

        # Add is_active
        if "is_active" not in existing_columns:
            cursor.execute("""
                ALTER TABLE users
                ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1
            """)

            print("Added is_active column.")

        # Add gender ('male' / 'female' / NULL = not specified), used for the avatar
        if "gender" not in existing_columns:
            cursor.execute("""
                ALTER TABLE users
                ADD COLUMN gender TEXT
            """)

            print("Added gender column.")

        # Add created_at
        if "created_at" not in existing_columns:
            cursor.execute("""
                ALTER TABLE users
                ADD COLUMN created_at TEXT
            """)

            print("Added created_at column.")

        # Set creation date for existing users
        cursor.execute("""
            UPDATE users
            SET created_at = CURRENT_TIMESTAMP
            WHERE created_at IS NULL OR TRIM(created_at) = ''
        """)

        connection.commit()

        print("Users table migration completed successfully.")

    except Exception:
        connection.rollback()
        raise

    finally:
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


# --------------------------------------------------
# Demo data for multi-user testing (development only)
# --------------------------------------------------

# Test password for the legacy user Mohamed (set only if he has none).
# Development/testing value only — never use real passwords here.
DEMO_PASSWORDS = {
    "mohamed@example.com": "Mohamed@2026",
}

# Ahmed's own demo bank account and transactions.
# Deliberately different from Mohamed's data to test isolation.
AHMED_ACCOUNT = {
    "email": "ahmed@example.com",
    "account_number": "SA555000111",
    "account_type": "checking",
    "balance": 12750.50,
    "currency": "SAR",
}

AHMED_TRANSACTIONS = [
    ("2026-07-01", "credit", 8000.00, "salary", "Employer B", "Monthly salary"),
    ("2026-07-05", "debit", 260.00, "groceries", "Panda", "Grocery shopping"),
    ("2026-07-15", "debit", 140.00, "restaurant", "Starbucks", "Coffee"),
    ("2026-08-01", "credit", 8000.00, "salary", "Employer B", "Monthly salary"),
    ("2026-08-04", "debit", 220.00, "restaurant", "Al Baik", "Dinner"),
    ("2026-08-06", "debit", 340.00, "groceries", "Panda", "Grocery shopping"),
    ("2026-08-09", "debit", 1200.00, "shopping", "Jarir Bookstore", "Laptop accessories"),
    ("2026-08-12", "debit", 95.00, "transport", "Uber", "Ride"),
]


def insert_demo_users_data():
    """
    Prepare demo users for multi-user testing.
    Safe to run multiple times. Never links Mohamed's account to Ahmed.
    """

    # Imported here so the rest of this module does not require auth settings
    from application.security import hash_password

    connection = get_connection()

    try:
        cursor = connection.cursor()

        # 1. Set test passwords only for users that do not have one
        for email, password in DEMO_PASSWORDS.items():
            cursor.execute(
                """
                UPDATE users
                SET password_hash = ?
                WHERE email = ?
                AND (password_hash IS NULL OR TRIM(password_hash) = '')
                """,
                (hash_password(password), email),
            )

            if cursor.rowcount:
                print(f"Test password set for {email}.")

        # 2. Find Ahmed (created through the registration system)
        cursor.execute(
            "SELECT id FROM users WHERE email = ?", (AHMED_ACCOUNT["email"],)
        )

        row = cursor.fetchone()

        if row is None:
            print("Ahmed is not registered yet. Register him first, then rerun.")
            connection.commit()
            return

        ahmed_id = row[0]

        # 3. Create Ahmed's own bank account (if missing)
        cursor.execute(
            """
            INSERT OR IGNORE INTO accounts
            (user_id, account_number, account_type, balance, currency)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                ahmed_id,
                AHMED_ACCOUNT["account_number"],
                AHMED_ACCOUNT["account_type"],
                AHMED_ACCOUNT["balance"],
                AHMED_ACCOUNT["currency"],
            ),
        )

        cursor.execute(
            "SELECT id, user_id FROM accounts WHERE account_number = ?",
            (AHMED_ACCOUNT["account_number"],),
        )

        account_id, owner_id = cursor.fetchone()

        # Safety check: never attach transactions to someone else's account
        if owner_id != ahmed_id:
            raise RuntimeError("Demo account number belongs to another user.")

        # 4. Add Ahmed's transactions (duplicates are skipped)
        for transaction in AHMED_TRANSACTIONS:
            insert_transaction(cursor, (account_id, *transaction))

        connection.commit()

        print(f"Demo data ready for Ahmed (user {ahmed_id}, account {account_id}).")

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


# --------------------------------------------------
# Demo customers (development/testing only)
# Data is stored in English; the assistant replies in Arabic.
# --------------------------------------------------

# Test password for all new demo customers (development only).
DEMO_CUSTOMER_PASSWORD = "Demo@2026"

# Months covered by the demo transactions
DEMO_MONTHS = ["2026-08", "2026-09", "2026-10"]

# monthly items: (day, category, merchant, description, base_amount)
# factors: spending multiplier per month (Aug, Sep, Oct) for realistic variation
DEMO_CUSTOMERS = [
    {
        "name": "Sara", "email": "sara@example.com", "active": True, "gender": "female",
        "accounts": [("SA100000001", "checking", 9840.75)],
        "salary": ("Ministry of Education", 11000.00),
        "factors": (1.0, 1.15, 0.9),
        "monthly": [
            (3, "groceries", "Panda", "Grocery shopping", 420.00),
            (6, "restaurant", "Al Baik", "Lunch", 85.00),
            (10, "bills", "Saudi Electricity", "Electricity bill", 310.00),
            (14, "shopping", "Noon", "Electronics", 260.00),
            (18, "health", "Nahdi Pharmacy", "Medicine", 140.00),
            (24, "restaurant", "Starbucks", "Coffee", 38.00),
        ],
    },
    {
        "name": "Khalid", "email": "khalid@example.com", "active": True, "gender": "male",
        "accounts": [
            ("SA100000002", "checking", 15320.40),
            ("SA100000003", "savings", 48000.00),
        ],
        "salary": ("Saudi Aramco", 18500.00),
        "factors": (1.1, 0.95, 1.25),
        "monthly": [
            (2, "transfer", "Savings Account", "Transfer to savings", 3000.00),
            (4, "groceries", "Carrefour", "Grocery shopping", 650.00),
            (8, "transport", "SASCO", "Fuel", 280.00),
            (12, "entertainment", "VOX Cinemas", "Movie tickets", 160.00),
            (16, "bills", "STC", "Mobile and internet bill", 399.00),
            (21, "restaurant", "Miramar Restaurant", "Family dinner", 540.00),
        ],
        # Monthly credit into the savings account (account index 1)
        "savings_deposit": (2, "transfer", "Checking Account", "Deposit from checking", 3000.00),
    },
    {
        "name": "Noura", "email": "noura@example.com", "active": True, "gender": "female",
        "accounts": [("SA100000004", "checking", 6210.30)],
        "salary": ("King Faisal Specialist Hospital", 13500.00),
        "factors": (0.9, 1.3, 1.1),
        "monthly": [
            (5, "restaurant", "Layali Restaurant", "Dinner", 320.00),
            (9, "shopping", "Zara", "Clothes", 890.00),
            (13, "restaurant", "Dunkin", "Coffee and donuts", 65.00),
            (17, "shopping", "Sephora", "Cosmetics", 450.00),
            (22, "groceries", "Tamimi Markets", "Grocery shopping", 380.00),
            (26, "restaurant", "Herfy", "Fast food", 55.00),
        ],
    },
    {
        "name": "Abdullah", "email": "abdullah@example.com", "active": True, "gender": "male",
        "accounts": [("SA100000005", "checking", 7455.00)],
        "salary": ("SABIC", 12800.00),
        "factors": (1.0, 1.05, 1.2),
        "monthly": [
            (3, "bills", "Saudi Electricity", "Electricity bill", 520.00),
            (5, "bills", "National Water Company", "Water bill", 180.00),
            (7, "transport", "Uber", "Ride", 75.00),
            (11, "transport", "SASCO", "Fuel", 300.00),
            (15, "bills", "Mobily", "Mobile bill", 230.00),
            (20, "groceries", "Othaim Markets", "Grocery shopping", 480.00),
        ],
    },
    {
        "name": "Reem", "email": "reem@example.com", "active": True, "gender": "female",
        "accounts": [("SA100000006", "checking", 845.20)],
        "salary": ("Startup Company", 6500.00),
        "factors": (1.2, 1.0, 1.15),
        "monthly": [
            (4, "bills", "Apartment Rent", "Monthly rent", 2500.00),
            (8, "groceries", "Lulu Hypermarket", "Grocery shopping", 350.00),
            (12, "transport", "Careem", "Ride", 60.00),
            (16, "entertainment", "Netflix", "Monthly subscription", 45.00),
            (23, "restaurant", "Kudu", "Fast food", 42.00),
        ],
    },
    {
        "name": "Fahad", "email": "fahad@example.com", "active": True, "gender": "male",
        "accounts": [("SA100000007", "checking", 86400.00)],
        "salary": ("Fahad Trading Group", 35000.00),
        "factors": (1.0, 1.4, 0.8),
        "monthly": [
            (2, "shopping", "Jarir Bookstore", "Laptop", 4200.00),
            (6, "restaurant", "Nozomi", "Business dinner", 1150.00),
            (10, "entertainment", "Saudia Airlines", "Flight tickets", 3600.00),
            (15, "groceries", "Danube", "Grocery shopping", 980.00),
            (19, "health", "Dr. Sulaiman Al Habib Hospital", "Medical checkup", 750.00),
            (25, "transport", "Car Service Center", "Car maintenance", 1400.00),
        ],
    },
    {
        # Registered user with NO bank account (tests "no bank account linked")
        "name": "Layla", "email": "layla@example.com", "active": True, "gender": "female",
        "accounts": [],
    },
    {
        # Inactive user (tests that inactive accounts cannot log in)
        "name": "Omar", "email": "omar@example.com", "active": False, "gender": "male",
        "accounts": [("SA100000008", "checking", 3100.00)],
        "salary": ("Construction Company", 7800.00),
        "factors": (1.0, 1.0, 1.0),
        "monthly": [
            (7, "groceries", "Panda", "Grocery shopping", 300.00),
            (15, "bills", "STC", "Mobile bill", 150.00),
        ],
    },
]

# Extra recent transactions for the original users (Sep/Oct 2026),
# so month comparisons also work for them. Keyed by email.
EXTRA_TRANSACTIONS = {
    "mohamed@example.com": [
        ("2026-09-01", "credit", 5000.00, "salary", "Employer", "Monthly salary"),
        ("2026-09-08", "debit", 210.00, "groceries", "Carrefour", "Grocery shopping"),
        ("2026-09-15", "debit", 95.00, "restaurant", "Restaurant A", "Dinner"),
        ("2026-10-01", "credit", 5000.00, "salary", "Employer", "Monthly salary"),
        ("2026-10-06", "debit", 175.00, "groceries", "Carrefour", "Grocery shopping"),
        ("2026-10-19", "debit", 140.00, "restaurant", "Al Baik", "Lunch"),
    ],
    "ahmed@example.com": [
        ("2026-09-01", "credit", 8000.00, "salary", "Employer B", "Monthly salary"),
        ("2026-09-07", "debit", 310.00, "groceries", "Panda", "Grocery shopping"),
        ("2026-09-20", "debit", 260.00, "restaurant", "Starbucks", "Coffee"),
        ("2026-10-01", "credit", 8000.00, "salary", "Employer B", "Monthly salary"),
        ("2026-10-05", "debit", 420.00, "groceries", "Panda", "Grocery shopping"),
        ("2026-10-14", "debit", 180.00, "transport", "Uber", "Ride"),
    ],
}


# Gender of the original demo users (used for the avatar)
DEMO_GENDERS = {
    "mohamed@example.com": "male",
    "ahmed@example.com": "male",
}


def apply_demo_genders(cursor):
    """Set gender for demo users only where it is not set yet."""

    genders = dict(DEMO_GENDERS)
    genders.update({c["email"]: c["gender"] for c in DEMO_CUSTOMERS if c.get("gender")})

    for email, gender in genders.items():
        cursor.execute(
            "UPDATE users SET gender = ? WHERE email = ? AND gender IS NULL",
            (gender, email),
        )


def build_customer_transactions(customer):
    """Build (date, type, amount, category, merchant, description) rows per account."""

    rows_by_account = {index: [] for index in range(len(customer["accounts"]))}

    for month, factor in zip(DEMO_MONTHS, customer["factors"]):

        employer, salary = customer["salary"]
        rows_by_account[0].append(
            (f"{month}-01", "credit", salary, "salary", employer, "Monthly salary")
        )

        for day, category, merchant, description, base in customer["monthly"]:
            # Fixed transfers keep their amount; spending varies by month
            amount = base if category == "transfer" else round(base * factor, 2)
            rows_by_account[0].append(
                (f"{month}-{day:02d}", "debit", amount, category, merchant, description)
            )

        if "savings_deposit" in customer:
            day, category, merchant, description, amount = customer["savings_deposit"]
            rows_by_account[1].append(
                (f"{month}-{day:02d}", "credit", amount, category, merchant, description)
            )

    return rows_by_account


def insert_demo_customers():
    """
    Insert demo customers, their bank accounts and transactions.
    Safe to run multiple times (existing users, accounts and transactions are kept).
    """

    from application.security import hash_password

    connection = get_connection()

    try:
        cursor = connection.cursor()

        password_hash = hash_password(DEMO_CUSTOMER_PASSWORD)
        summary = []

        for customer in DEMO_CUSTOMERS:

            # 1. Create the user if missing (never overwrite an existing password)
            cursor.execute("SELECT id FROM users WHERE email = ?", (customer["email"],))
            row = cursor.fetchone()

            if row is None:
                cursor.execute(
                    """
                    INSERT INTO users (name, email, password_hash, is_active, created_at)
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                    """,
                    (
                        customer["name"],
                        customer["email"],
                        password_hash,
                        1 if customer["active"] else 0,
                    ),
                )
                user_id = cursor.lastrowid
            else:
                user_id = row[0]

            # 2. Create accounts and transactions
            if not customer["accounts"]:
                summary.append((customer["name"], user_id, 0, 0))
                continue

            rows_by_account = build_customer_transactions(customer)
            transaction_count = 0

            for index, (number, account_type, balance) in enumerate(customer["accounts"]):

                cursor.execute(
                    """
                    INSERT OR IGNORE INTO accounts
                    (user_id, account_number, account_type, balance, currency)
                    VALUES (?, ?, ?, ?, 'SAR')
                    """,
                    (user_id, number, account_type, balance),
                )

                cursor.execute(
                    "SELECT id, user_id FROM accounts WHERE account_number = ?",
                    (number,),
                )
                account_id, owner_id = cursor.fetchone()

                # Safety check: never attach data to another user's account
                if owner_id != user_id:
                    raise RuntimeError(f"Account {number} belongs to another user.")

                for transaction in rows_by_account[index]:
                    insert_transaction(cursor, (account_id, *transaction))
                    transaction_count += 1

            summary.append(
                (customer["name"], user_id, len(customer["accounts"]), transaction_count)
            )

        # 3. Avatar genders for demo users
        apply_demo_genders(cursor)

        # 4. Recent transactions for the original users (their first account)
        for email, transactions in EXTRA_TRANSACTIONS.items():
            cursor.execute(
                """
                SELECT a.id FROM accounts a
                JOIN users u ON u.id = a.user_id
                WHERE u.email = ?
                ORDER BY a.id LIMIT 1
                """,
                (email,),
            )
            row = cursor.fetchone()

            if row:
                for transaction in transactions:
                    insert_transaction(cursor, (row[0], *transaction))

        connection.commit()

        for name, user_id, accounts, transactions in summary:
            print(f"{name}: user {user_id}, accounts={accounts}, transactions={transactions}")

    except Exception:
        connection.rollback()
        raise

    finally:
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

    migrate_users_table()

    insert_sample_data()
    insert_july_data()
    insert_location_data()
    insert_demo_users_data()
    insert_demo_customers()

    print("Database and sample data created successfully.")
