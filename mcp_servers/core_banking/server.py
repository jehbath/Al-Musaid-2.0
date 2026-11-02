from mcp.server.mcpserver import MCPServer
from database.database import get_connection

mcp = MCPServer("Core Banking")


@mcp.tool()
def get_account_balance() -> dict:
    """Get the current balance of the user's bank account."""

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT balance, currency
        FROM accounts
        WHERE id = 1
    """)

    account = cursor.fetchone()
    connection.close()

    if account is None:
        return {"success": False, "error": "Account not found"}

    return {"success": True, "balance": account[0], "currency": account[1]}


@mcp.tool()
def search_transactions(
    category: str = None, merchant: str = None, transaction_type: str = None
) -> dict:
    """
    Search the user's transactions by category, merchant, or transaction type.

    transaction_type can be 'debit' or 'credit'.
    """

    connection = get_connection()
    cursor = connection.cursor()

    query = """
        SELECT transaction_date, type, amount,
               category, merchant, description
        FROM transactions
        WHERE account_id = 1
    """

    parameters = []

    if category:
        query += " AND LOWER(category) = LOWER(?)"
        parameters.append(category)

    if merchant:
        query += " AND LOWER(merchant) = LOWER(?)"
        parameters.append(merchant)

    if transaction_type:
        transaction_type = transaction_type.lower()

        if transaction_type not in ("debit", "credit"):
            connection.close()
            return {
                "success": False,
                "error": "transaction_type must be 'debit' or 'credit'",
            }

        query += " AND LOWER(type) = ?"
        parameters.append(transaction_type)

    query += " ORDER BY transaction_date DESC"

    cursor.execute(query, parameters)

    rows = cursor.fetchall()
    connection.close()

    transactions = []

    for row in rows:
        transactions.append(
            {
                "date": row[0],
                "type": row[1],
                "amount": row[2],
                "category": row[3],
                "merchant": row[4],
                "description": row[5],
            }
        )

    return {"success": True, "count": len(transactions), "transactions": transactions}


@mcp.tool()
def analyze_transactions(
    start_date: str = None,
    end_date: str = None,
    compare_start_date: str = None,
    compare_end_date: str = None,
) -> dict:
    """Analyze spending and optionally compare it with another period."""

    connection = get_connection()
    cursor = connection.cursor()

    def get_spending(start, end):
        query = """
            SELECT amount
            FROM transactions
            WHERE account_id = 1
            AND type = 'debit'
        """

        parameters = []

        if start:
            query += " AND transaction_date >= ?"
            parameters.append(start)

        if end:
            query += " AND transaction_date <= ?"
            parameters.append(end)

        cursor.execute(query, parameters)
        rows = cursor.fetchall()

        total = sum(row[0] for row in rows)

        return total, len(rows)

    total_spending, transaction_count = get_spending(start_date, end_date)

    average_spending = (
        total_spending / transaction_count if transaction_count > 0 else 0
    )

    result = {
        "success": True,
        "start_date": start_date,
        "end_date": end_date,
        "total_spending": total_spending,
        "average_spending": average_spending,
        "transaction_count": transaction_count,
    }

    if compare_start_date or compare_end_date:

        comparison_total, comparison_count = get_spending(
            compare_start_date, compare_end_date
        )

        difference = total_spending - comparison_total

        if comparison_total > 0:
            percentage_change = (difference / comparison_total) * 100
        else:
            percentage_change = 0

        result["comparison"] = {
            "start_date": compare_start_date,
            "end_date": compare_end_date,
            "total_spending": comparison_total,
            "transaction_count": comparison_count,
            "difference": difference,
            "percentage_change": percentage_change,
        }

    connection.close()

    return result


if __name__ == "__main__":
    mcp.run()
