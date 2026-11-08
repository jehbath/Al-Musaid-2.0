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


# --------------------------------------------------
# Sudanese demo context (Faisal Islamic Bank, SDG)
# --------------------------------------------------

DEMO_CURRENCY = "SDG"

# Seed amounts are written in compact units and multiplied by this scale when
# inserted, giving realistic Sudanese Pound (SDG) values.
DEMO_AMOUNT_SCALE = 50

# Earlier Saudi demo names -> Sudanese demo names (used to convert existing rows)
SUDAN_MERCHANT_NAMES = {'Panda': 'Al Waha Supermarket', 'Carrefour': 'Afra Hypermarket', 'Tamimi Markets': 'Souq Al Arabi Grocery', 'Othaim Markets': 'Bahri Central Market', 'Lulu Hypermarket': 'Omdurman Grand Market', 'Danube': 'Kafouri Supermarket', 'Al Baik': 'Al Basha Restaurant', 'Starbucks': 'Ozone Cafe', 'Restaurant A': 'Al Housh Restaurant', 'Restaurant B': 'Papa Costa', 'Herfy': 'Kebab Express', 'Kudu': 'Tasty Burger', 'Dunkin': 'Sweet Corner Cafe', 'Miramar Restaurant': 'Nile View Restaurant', 'Nozomi': 'Corinthia Hotel Restaurant', 'Saudi Electricity': 'Sudanese Electricity Distribution Co.', 'National Water Company': 'Khartoum State Water Corporation', 'STC': 'Zain Sudan', 'Mobily': 'MTN Sudan', 'Noon': 'Khartoum Online Store', 'Zara': 'Afra Mall Fashion', 'Sephora': 'Beauty Corner', 'Nahdi Pharmacy': 'Al Shifa Pharmacy', 'SASCO': 'Nile Petroleum Station', 'VOX Cinemas': 'Al Waha Cinema', 'Uber': 'Tirhal', 'Careem': 'Tirhal', 'Jarir Bookstore': 'Al Dar Al Sudania Bookstore', 'Saudia Airlines': 'Tarco Airlines', 'Dr. Sulaiman Al Habib Hospital': 'Royal Care Hospital', 'Saudi Aramco': 'Sudapet', 'King Faisal Specialist Hospital': 'Ibn Sina Hospital', 'SABIC': 'Kenana Sugar Company', 'Fahad Trading Group': 'Al Fahad Trading Group', 'Employer B': 'Telecom Company'}


def insert_transaction(cursor, transaction):
    """
    Insert a transaction only if the same transaction
    does not already exist. The amount is scaled to SDG (DEMO_AMOUNT_SCALE).
    """

    transaction = (
        *transaction[:3],
        round(float(transaction[3]) * DEMO_AMOUNT_SCALE, 2),
        *transaction[4:],
    )

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
            'SD123456789',
            'checking',
            175000.00,
            'SDG'
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
            "Afra Hypermarket",
            "Grocery shopping",
        ),
        (
            1,
            "2026-08-02",
            "debit",
            80.00,
            "restaurant",
            "Al Housh Restaurant",
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
            "Afra Hypermarket",
            "Grocery shopping",
        ),
        (
            1,
            "2026-07-20",
            "debit",
            50.00,
            "restaurant",
            "Papa Costa",
            "Dinner",
        ),
    ]

    for transaction in transactions:
        insert_transaction(cursor, transaction)

    connection.commit()
    connection.close()


# Faisal Islamic Bank (Sudan) demo branches and ATMs.
# Branch/ATM names are taken from the bank's published annual reports (2013-2014);
# coordinates are APPROXIMATE (centre of each area) and are for testing only.
FIB_BRANCHES = [
    ("Faisal Islamic Bank - Al Faihaa Main Branch", 15.6030, 32.5300, "Al Faihaa Building, Ali Abdel Latif Street, Khartoum"),
    ("Faisal Islamic Bank - Khartoum Central Station Branch", 15.5975, 32.5320, "Central Station area, Khartoum"),
    ("Faisal Islamic Bank - Helat Koko Branch", 15.6330, 32.6010, "Helat Koko, Khartoum North (Bahri)"),
    ("Faisal Islamic Bank - Khartoum North Industrial Area Branch", 15.6480, 32.5420, "Industrial Area, Khartoum North (Bahri)"),
    ("Faisal Islamic Bank - Omdurman Central Station Branch", 15.6445, 32.4790, "Central Station, Omdurman"),
    ("Faisal Islamic Bank - Souq Libya Branch", 15.6560, 32.4310, "Souq Libya, Omdurman"),
    ("Faisal Islamic Bank - Alsouq Alshaabi Branch", 15.6240, 32.4700, "Alsouq Alshaabi, Omdurman"),
    ("Faisal Islamic Bank - Almawrada Branch", 15.6290, 32.4920, "Almawrada, Omdurman"),
]

FIB_ATMS = [
    ("Faisal Islamic Bank ATM - Al Faihaa", 15.6032, 32.5305, "Al Faihaa Building, Khartoum"),
    ("Faisal Islamic Bank ATM - Khartoum Central Station", 15.5978, 32.5325, "Central Station area, Khartoum"),
    ("Faisal Islamic Bank ATM - Omdurman Almawrada Branch", 15.6292, 32.4925, "Almawrada, Omdurman"),
    ("Faisal Islamic Bank ATM - Omdurman Central Station Branch", 15.6447, 32.4795, "Central Station, Omdurman"),
    ("Faisal Islamic Bank ATM - Omdurman Souq Libya Branch", 15.6562, 32.4315, "Souq Libya, Omdurman"),
    ("Faisal Islamic Bank ATM - Althawra Al Romee Station", 15.6900, 32.4700, "Althawra, Omdurman"),
]


def insert_location_data():
    """Replace the demo branches/ATMs with Faisal Islamic Bank (Sudan) locations."""

    connection = get_connection()

    try:
        cursor = connection.cursor()

        for table, rows in (("branches", FIB_BRANCHES), ("atms", FIB_ATMS)):
            names = [row[0] for row in rows]
            placeholders = ", ".join("?" for _ in names)

            # Remove earlier demo locations (e.g. the previous Riyadh data)
            cursor.execute(f"DELETE FROM {table} WHERE name NOT IN ({placeholders})", names)

            for row in rows:
                cursor.execute(f"SELECT id FROM {table} WHERE name = ?", (row[0],))

                if cursor.fetchone() is None:
                    cursor.execute(
                        f"INSERT INTO {table} (name, latitude, longitude, address) VALUES (?, ?, ?, ?)",
                        row,
                    )

        connection.commit()

    finally:
        connection.close()


def convert_demo_data_to_sudan():
    """
    One-time conversion of existing demo rows to the Sudanese context:
    SAR accounts -> SDG (amounts x DEMO_AMOUNT_SCALE) and Saudi merchant names -> Sudanese.
    Safe to run multiple times (only SAR accounts are converted).
    """

    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute("SELECT id FROM accounts WHERE currency = 'SAR'")
        sar_accounts = [row[0] for row in cursor.fetchall()]

        if sar_accounts:
            placeholders = ", ".join("?" for _ in sar_accounts)
            cursor.execute(
                f"UPDATE transactions SET amount = ROUND(amount * ?, 2) WHERE account_id IN ({placeholders})",
                [DEMO_AMOUNT_SCALE, *sar_accounts],
            )
            cursor.execute(
                f"UPDATE accounts SET balance = ROUND(balance * ?, 2), currency = ? WHERE id IN ({placeholders})",
                [DEMO_AMOUNT_SCALE, DEMO_CURRENCY, *sar_accounts],
            )

        for old, new in SUDAN_MERCHANT_NAMES.items():
            cursor.execute("UPDATE transactions SET merchant = ? WHERE merchant = ?", (new, old))

        connection.commit()
        print(f"Converted {len(sar_accounts)} SAR accounts to {DEMO_CURRENCY}.")

    finally:
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
    "account_number": "SD555000111",
    "account_type": "checking",
    "balance": 637525.00,
    "currency": "SDG",
}

AHMED_TRANSACTIONS = [
    ("2026-07-01", "credit", 8000.00, "salary", "Telecom Company", "Monthly salary"),
    ("2026-07-05", "debit", 260.00, "groceries", "Al Waha Supermarket", "Grocery shopping"),
    ("2026-07-15", "debit", 140.00, "restaurant", "Ozone Cafe", "Coffee"),
    ("2026-08-01", "credit", 8000.00, "salary", "Telecom Company", "Monthly salary"),
    ("2026-08-04", "debit", 220.00, "restaurant", "Al Basha Restaurant", "Dinner"),
    ("2026-08-06", "debit", 340.00, "groceries", "Al Waha Supermarket", "Grocery shopping"),
    ("2026-08-09", "debit", 1200.00, "shopping", "Al Dar Al Sudania Bookstore", "Laptop accessories"),
    ("2026-08-12", "debit", 95.00, "transport", "Tirhal", "Ride"),
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
        "accounts": [("SD100000001", "checking", 9840.75)],
        "salary": ("Ministry of Education", 11000.00),
        "factors": (1.0, 1.15, 0.9),
        "monthly": [
            (3, "groceries", "Al Waha Supermarket", "Grocery shopping", 420.00),
            (6, "restaurant", "Al Basha Restaurant", "Lunch", 85.00),
            (10, "bills", "Sudanese Electricity Distribution Co.", "Electricity bill", 310.00),
            (14, "shopping", "Khartoum Online Store", "Electronics", 260.00),
            (18, "health", "Al Shifa Pharmacy", "Medicine", 140.00),
            (24, "restaurant", "Ozone Cafe", "Coffee", 38.00),
        ],
    },
    {
        "name": "Khalid", "email": "khalid@example.com", "active": True, "gender": "male",
        "accounts": [
            ("SD100000002", "checking", 15320.40),
            ("SD100000003", "savings", 48000.00),
        ],
        "salary": ("Sudapet", 18500.00),
        "factors": (1.1, 0.95, 1.25),
        "monthly": [
            (2, "transfer", "Savings Account", "Transfer to savings", 3000.00),
            (4, "groceries", "Afra Hypermarket", "Grocery shopping", 650.00),
            (8, "transport", "Nile Petroleum Station", "Fuel", 280.00),
            (12, "entertainment", "Al Waha Cinema", "Movie tickets", 160.00),
            (16, "bills", "Zain Sudan", "Mobile and internet bill", 399.00),
            (21, "restaurant", "Nile View Restaurant", "Family dinner", 540.00),
        ],
        # Monthly credit into the savings account (account index 1)
        "savings_deposit": (2, "transfer", "Checking Account", "Deposit from checking", 3000.00),
    },
    {
        "name": "Noura", "email": "noura@example.com", "active": True, "gender": "female",
        "accounts": [("SD100000004", "checking", 6210.30)],
        "salary": ("Ibn Sina Hospital", 13500.00),
        "factors": (0.9, 1.3, 1.1),
        "monthly": [
            (5, "restaurant", "Layali Restaurant", "Dinner", 320.00),
            (9, "shopping", "Afra Mall Fashion", "Clothes", 890.00),
            (13, "restaurant", "Sweet Corner Cafe", "Coffee and donuts", 65.00),
            (17, "shopping", "Beauty Corner", "Cosmetics", 450.00),
            (22, "groceries", "Souq Al Arabi Grocery", "Grocery shopping", 380.00),
            (26, "restaurant", "Kebab Express", "Fast food", 55.00),
        ],
    },
    {
        "name": "Abdullah", "email": "abdullah@example.com", "active": True, "gender": "male",
        "accounts": [("SD100000005", "checking", 7455.00)],
        "salary": ("Kenana Sugar Company", 12800.00),
        "factors": (1.0, 1.05, 1.2),
        "monthly": [
            (3, "bills", "Sudanese Electricity Distribution Co.", "Electricity bill", 520.00),
            (5, "bills", "Khartoum State Water Corporation", "Water bill", 180.00),
            (7, "transport", "Tirhal", "Ride", 75.00),
            (11, "transport", "Nile Petroleum Station", "Fuel", 300.00),
            (15, "bills", "MTN Sudan", "Mobile bill", 230.00),
            (20, "groceries", "Bahri Central Market", "Grocery shopping", 480.00),
        ],
    },
    {
        "name": "Reem", "email": "reem@example.com", "active": True, "gender": "female",
        "accounts": [("SD100000006", "checking", 845.20)],
        "salary": ("Startup Company", 6500.00),
        "factors": (1.2, 1.0, 1.15),
        "monthly": [
            (4, "bills", "Apartment Rent", "Monthly rent", 2500.00),
            (8, "groceries", "Omdurman Grand Market", "Grocery shopping", 350.00),
            (12, "transport", "Tirhal", "Ride", 60.00),
            (16, "entertainment", "Netflix", "Monthly subscription", 45.00),
            (23, "restaurant", "Tasty Burger", "Fast food", 42.00),
        ],
    },
    {
        "name": "Fahad", "email": "fahad@example.com", "active": True, "gender": "male",
        "accounts": [("SD100000007", "checking", 86400.00)],
        "salary": ("Al Fahad Trading Group", 35000.00),
        "factors": (1.0, 1.4, 0.8),
        "monthly": [
            (2, "shopping", "Al Dar Al Sudania Bookstore", "Laptop", 4200.00),
            (6, "restaurant", "Corinthia Hotel Restaurant", "Business dinner", 1150.00),
            (10, "entertainment", "Tarco Airlines", "Flight tickets", 3600.00),
            (15, "groceries", "Kafouri Supermarket", "Grocery shopping", 980.00),
            (19, "health", "Royal Care Hospital", "Medical checkup", 750.00),
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
        "accounts": [("SD100000008", "checking", 3100.00)],
        "salary": ("Construction Company", 7800.00),
        "factors": (1.0, 1.0, 1.0),
        "monthly": [
            (7, "groceries", "Al Waha Supermarket", "Grocery shopping", 300.00),
            (15, "bills", "Zain Sudan", "Mobile bill", 150.00),
        ],
    },
]

# Extra recent transactions for the original users (Sep/Oct 2026),
# so month comparisons also work for them. Keyed by email.
EXTRA_TRANSACTIONS = {
    "mohamed@example.com": [
        ("2026-09-01", "credit", 5000.00, "salary", "Employer", "Monthly salary"),
        ("2026-09-08", "debit", 210.00, "groceries", "Afra Hypermarket", "Grocery shopping"),
        ("2026-09-15", "debit", 95.00, "restaurant", "Al Housh Restaurant", "Dinner"),
        ("2026-10-01", "credit", 5000.00, "salary", "Employer", "Monthly salary"),
        ("2026-10-06", "debit", 175.00, "groceries", "Afra Hypermarket", "Grocery shopping"),
        ("2026-10-19", "debit", 140.00, "restaurant", "Al Basha Restaurant", "Lunch"),
    ],
    "ahmed@example.com": [
        ("2026-09-01", "credit", 8000.00, "salary", "Telecom Company", "Monthly salary"),
        ("2026-09-07", "debit", 310.00, "groceries", "Al Waha Supermarket", "Grocery shopping"),
        ("2026-09-20", "debit", 260.00, "restaurant", "Ozone Cafe", "Coffee"),
        ("2026-10-01", "credit", 8000.00, "salary", "Telecom Company", "Monthly salary"),
        ("2026-10-05", "debit", 420.00, "groceries", "Al Waha Supermarket", "Grocery shopping"),
        ("2026-10-14", "debit", 180.00, "transport", "Tirhal", "Ride"),
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
                    VALUES (?, ?, ?, ?, 'SDG')
                    """,
                    (user_id, number, account_type, round(balance * DEMO_AMOUNT_SCALE, 2)),
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

    convert_demo_data_to_sudan()
    insert_sample_data()
    insert_july_data()
    insert_location_data()
    insert_demo_users_data()
    insert_demo_customers()

    print("Database and sample data created successfully.")
