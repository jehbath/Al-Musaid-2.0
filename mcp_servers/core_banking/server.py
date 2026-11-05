import os

from mcp.server.mcpserver import MCPServer
from database.database import get_connection

mcp = MCPServer("Core Banking")


# The authenticated user ID is supplied by the backend (MCP client)
# through this environment variable. It is never accepted as a tool
# argument, so neither the user nor Gemini can choose whose data is read.
USER_ID_ENV_VAR = "AL_MUSAID_USER_ID"

AUTH_REQUIRED_ERROR = {
    "success": False,
    "error": "authentication_required",
    "message": "User is not authenticated.",
}

NO_ACCOUNT_ERROR = {
    "success": False,
    "error": "no_bank_account",
    "message": "No bank account is linked to this user.",
}


def get_authenticated_user_id():
    """Return the trusted user ID from the environment, or None."""

    value = os.environ.get(USER_ID_ENV_VAR)

    if not value:
        return None

    try:
        user_id = int(value)
    except ValueError:
        return None

    return user_id if user_id > 0 else None


ACCOUNT_TYPES = ("checking", "savings")


def normalize_account_type(account_type):
    """
    Validate the optional account_type filter chosen by Gemini.

    Safe by design: it can only narrow results WITHIN the authenticated
    user's own accounts; it can never select another user's account.
    """

    if not account_type:
        return None, None

    account_type = account_type.strip().lower()

    if account_type not in ACCOUNT_TYPES:
        return None, {
            "success": False,
            "error": "account_type must be 'checking' or 'savings'",
        }

    return account_type, None


def user_has_account(cursor, user_id, account_type=None):

    query = "SELECT 1 FROM accounts WHERE user_id = ?"
    parameters = [user_id]

    if account_type:
        query += " AND account_type = ?"
        parameters.append(account_type)

    cursor.execute(query + " LIMIT 1", parameters)

    return cursor.fetchone() is not None


def no_account_of_type_error(account_type):
    return {
        "success": False,
        "error": "no_account_of_this_type",
        "message": f"The user has no {account_type} account.",
    }


@mcp.tool()
def get_account_balance(account_type: str = None) -> dict:
    """
    Get the balance of the user's bank accounts.

    account_type (optional): 'checking' (الحساب الجاري) or 'savings' (حساب التوفير).
    Use it only when the user names a specific account.
    If omitted, all of the user's accounts are returned with a total.
    """

    user_id = get_authenticated_user_id()

    if user_id is None:
        return AUTH_REQUIRED_ERROR

    account_type, error = normalize_account_type(account_type)

    if error:
        return error

    connection = get_connection()

    try:
        cursor = connection.cursor()

        query = """
            SELECT account_number, account_type, balance, currency
            FROM accounts
            WHERE user_id = ?
        """
        parameters = [user_id]

        if account_type:
            query += " AND account_type = ?"
            parameters.append(account_type)

        cursor.execute(query + " ORDER BY id", parameters)

        rows = cursor.fetchall()

        has_any_account = bool(rows) or user_has_account(cursor, user_id)

    finally:
        connection.close()

    if not rows:
        if has_any_account:
            return no_account_of_type_error(account_type)

        return NO_ACCOUNT_ERROR

    accounts = [
        {
            # Show only the last 4 digits of the account number
            "account_number": "****" + str(row[0])[-4:],
            "account_type": row[1],
            "balance": row[2],
            "currency": row[3],
        }
        for row in rows
    ]

    result = {
        "success": True,
        # "balance"/"currency" refer to the first (or selected) account,
        # keeping the response compatible with the Assistant.
        "balance": accounts[0]["balance"],
        "currency": accounts[0]["currency"],
        "account_type": accounts[0]["account_type"],
        "accounts_count": len(accounts),
        "accounts": accounts,
    }

    # Total across accounts (only meaningful when all share one currency)
    currencies = {account["currency"] for account in accounts}

    if len(accounts) > 1 and len(currencies) == 1:
        result["total_balance"] = round(sum(a["balance"] for a in accounts), 2)

    return result


@mcp.tool()
def search_transactions(
    category: str = None,
    merchant: str = None,
    transaction_type: str = None,
    account_type: str = None,
) -> dict:
    """
    Search the user's transactions by category, merchant, or transaction type.

    transaction_type can be 'debit' or 'credit'.
    account_type (optional): 'checking' or 'savings', only when the user
    names a specific account. If omitted, all of the user's accounts are searched.
    """

    user_id = get_authenticated_user_id()

    if user_id is None:
        return AUTH_REQUIRED_ERROR

    account_type, error = normalize_account_type(account_type)

    if error:
        return error

    if transaction_type:
        transaction_type = transaction_type.lower()

        if transaction_type not in ("debit", "credit"):
            return {
                "success": False,
                "error": "transaction_type must be 'debit' or 'credit'",
            }

    connection = get_connection()

    try:
        cursor = connection.cursor()

        if not user_has_account(cursor, user_id):
            return NO_ACCOUNT_ERROR

        if account_type and not user_has_account(cursor, user_id, account_type):
            return no_account_of_type_error(account_type)

        # Only transactions on accounts owned by the authenticated user
        query = """
            SELECT t.transaction_date, t.type, t.amount,
                   t.category, t.merchant, t.description, a.account_type
            FROM transactions t
            JOIN accounts a ON a.id = t.account_id
            WHERE a.user_id = ?
        """

        parameters = [user_id]

        if account_type:
            query += " AND a.account_type = ?"
            parameters.append(account_type)

        if category:
            query += " AND LOWER(t.category) = LOWER(?)"
            parameters.append(category)

        if merchant:
            query += " AND LOWER(t.merchant) = LOWER(?)"
            parameters.append(merchant)

        if transaction_type:
            query += " AND LOWER(t.type) = ?"
            parameters.append(transaction_type)

        query += " ORDER BY t.transaction_date DESC"

        cursor.execute(query, parameters)

        rows = cursor.fetchall()

    finally:
        connection.close()

    transactions = [
        {
            "date": row[0],
            "type": row[1],
            "amount": row[2],
            "category": row[3],
            "merchant": row[4],
            "description": row[5],
            "account_type": row[6],
        }
        for row in rows
    ]

    return {"success": True, "count": len(transactions), "transactions": transactions}


# --------------------------------------------------
# Spending analysis settings
# --------------------------------------------------

# Transfers between the user's own accounts are neither spending nor income
EXCLUDED_CATEGORIES = ("transfer",)

# Categories the user can usually reduce to save money
DISCRETIONARY_CATEGORIES = ("restaurant", "shopping", "entertainment")

# Suggested reduction used to compute saving opportunities
SAVING_REDUCTION_PERCENT = 20


def _round(value):
    return round(float(value), 2)


def _percentage_change(current, previous):
    if previous > 0:
        return _round((current - previous) / previous * 100)
    return 0


def _summarize(rows):
    """Build spending insights from (date, type, amount, category, merchant, description) rows."""

    debits = [row for row in rows if row[1] == "debit"]
    credits = [row for row in rows if row[1] == "credit"]

    total_spending = _round(sum(row[2] for row in debits))
    total_income = _round(sum(row[2] for row in credits))
    count = len(debits)

    # Spending by category
    categories = {}

    for _, _, amount, category, _, _ in debits:
        entry = categories.setdefault(category or "other", {"total": 0, "count": 0})
        entry["total"] += amount
        entry["count"] += 1

    spending_by_category = sorted(
        (
            {
                "category": category,
                "total": _round(data["total"]),
                "count": data["count"],
                "percentage": _round(data["total"] / total_spending * 100)
                if total_spending
                else 0,
            }
            for category, data in categories.items()
        ),
        key=lambda item: item["total"],
        reverse=True,
    )

    # Top merchants
    merchants = {}

    for _, _, amount, _, merchant, _ in debits:
        entry = merchants.setdefault(merchant or "unknown", {"total": 0, "count": 0})
        entry["total"] += amount
        entry["count"] += 1

    top_merchants = sorted(
        (
            {"merchant": name, "total": _round(data["total"]), "count": data["count"]}
            for name, data in merchants.items()
        ),
        key=lambda item: item["total"],
        reverse=True,
    )[:5]

    # Largest single expenses
    largest_expenses = [
        {
            "date": row[0],
            "amount": _round(row[2]),
            "category": row[3],
            "merchant": row[4],
            "description": row[5],
        }
        for row in sorted(debits, key=lambda row: row[2], reverse=True)[:3]
    ]

    # Saving opportunities (computed from real data, not estimated by the model)
    saving_opportunities = [
        {
            "category": item["category"],
            "current_spending": item["total"],
            "suggested_reduction_percent": SAVING_REDUCTION_PERCENT,
            "potential_saving": _round(item["total"] * SAVING_REDUCTION_PERCENT / 100),
        }
        for item in spending_by_category
        if item["category"] in DISCRETIONARY_CATEGORIES
    ]

    return {
        "total_spending": total_spending,
        "average_spending": _round(total_spending / count) if count else 0,
        "transaction_count": count,
        "total_income": total_income,
        "net_cash_flow": _round(total_income - total_spending),
        "spending_by_category": spending_by_category,
        "top_merchants": top_merchants,
        "largest_expenses": largest_expenses,
        "saving_opportunities": saving_opportunities,
        "total_potential_saving": _round(
            sum(item["potential_saving"] for item in saving_opportunities)
        ),
    }


@mcp.tool()
def analyze_transactions(
    start_date: str = None,
    end_date: str = None,
    compare_start_date: str = None,
    compare_end_date: str = None,
    account_type: str = None,
) -> dict:
    """
    Analyze the user's spending for a period (dates as YYYY-MM-DD),
    optionally comparing it with another period.

    Use it for: total/average spending, where most money goes,
    spending by category with percentages, top merchants, biggest expenses,
    income vs spending, month-to-month comparison (overall and per category),
    and saving advice ("how can I save next month?").

    Returns computed saving_opportunities (reducing discretionary categories
    by a suggested percentage). Transfers between the user's own accounts
    are excluded from spending and income.

    account_type (optional): 'checking' or 'savings', only when the user
    names a specific account. If omitted, all of the user's accounts are analyzed.
    """

    user_id = get_authenticated_user_id()

    if user_id is None:
        return AUTH_REQUIRED_ERROR

    account_type, error = normalize_account_type(account_type)

    if error:
        return error

    connection = get_connection()

    try:
        cursor = connection.cursor()

        if not user_has_account(cursor, user_id):
            return NO_ACCOUNT_ERROR

        if account_type and not user_has_account(cursor, user_id, account_type):
            return no_account_of_type_error(account_type)

        def fetch(start, end):
            # Only transactions on accounts owned by the authenticated user
            query = """
                SELECT t.transaction_date, t.type, t.amount,
                       t.category, t.merchant, t.description
                FROM transactions t
                JOIN accounts a ON a.id = t.account_id
                WHERE a.user_id = ?
            """

            parameters = [user_id]

            if account_type:
                query += " AND a.account_type = ?"
                parameters.append(account_type)

            placeholders = ", ".join("?" for _ in EXCLUDED_CATEGORIES)
            query += f" AND COALESCE(t.category, '') NOT IN ({placeholders})"
            parameters.extend(EXCLUDED_CATEGORIES)

            if start:
                query += " AND t.transaction_date >= ?"
                parameters.append(start)

            if end:
                query += " AND t.transaction_date <= ?"
                parameters.append(end)

            cursor.execute(query, parameters)

            return cursor.fetchall()

        current = _summarize(fetch(start_date, end_date))

        result = {
            "success": True,
            "account_type": account_type or "all",
            "start_date": start_date,
            "end_date": end_date,
            **current,
            "note": "Transfers between the user's own accounts are excluded.",
        }

        if compare_start_date or compare_end_date:

            previous = _summarize(fetch(compare_start_date, compare_end_date))

            difference = _round(current["total_spending"] - previous["total_spending"])

            # Per-category changes (current period vs comparison period)
            current_categories = {
                item["category"]: item["total"] for item in current["spending_by_category"]
            }
            previous_categories = {
                item["category"]: item["total"] for item in previous["spending_by_category"]
            }

            category_changes = sorted(
                (
                    {
                        "category": category,
                        "current": current_categories.get(category, 0),
                        "previous": previous_categories.get(category, 0),
                        "difference": _round(
                            current_categories.get(category, 0)
                            - previous_categories.get(category, 0)
                        ),
                        "percentage_change": _percentage_change(
                            current_categories.get(category, 0),
                            previous_categories.get(category, 0),
                        ),
                    }
                    for category in set(current_categories) | set(previous_categories)
                ),
                key=lambda item: abs(item["difference"]),
                reverse=True,
            )

            result["comparison"] = {
                "start_date": compare_start_date,
                "end_date": compare_end_date,
                "total_spending": previous["total_spending"],
                "transaction_count": previous["transaction_count"],
                "total_income": previous["total_income"],
                "difference": difference,
                "percentage_change": _percentage_change(
                    current["total_spending"], previous["total_spending"]
                ),
                "category_changes": category_changes,
            }

    finally:
        connection.close()

    return result

if __name__ == "__main__":
    mcp.run()
