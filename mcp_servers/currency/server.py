import requests
from decimal import Decimal

from mcp.server.mcpserver import MCPServer


mcp = MCPServer("Currency")


@mcp.tool()
def convert_currency(
    amount: float,
    from_currency: str,
    to_currency: str
) -> dict:
    """Convert an amount from one currency to another using an external exchange rate API."""

    # Normalize currency codes to uppercase.
    from_currency = from_currency.upper()
    to_currency = to_currency.upper()

    # Validate that the amount is greater than zero.
    if amount <= 0:
        return {
            "success": False,
            "error": "Amount must be greater than zero"
        }

    # If both currencies are the same, no external conversion is needed.
    if from_currency == to_currency:
        return {
            "success": True,
            "amount": amount,
            "from_currency": from_currency,
            "to_currency": to_currency,
            "rate": 1.0,
            "converted_amount": amount,
            "date": None
        }

    # Request the exchange rate from the external API.
    url = f"https://api.frankfurter.dev/v2/rate/{from_currency}/{to_currency}"

    try:
        response = requests.get(url, timeout=10)

        # Return a clear error if the requested currency is not supported
        # or the external API returns an unsuccessful response.
        if response.status_code != 200:
            return {
                "success": False,
                "error": "Unable to get exchange rate"
            }

        data = response.json()

        # Use Decimal for the actual financial calculation.
        rate = Decimal(str(data["rate"]))
        converted_amount = Decimal(str(amount)) * rate

        return {
            "success": True,
            "amount": amount,
            "from_currency": from_currency,
            "to_currency": to_currency,
            "rate": float(rate),
            "converted_amount": float(
                converted_amount.quantize(Decimal("0.01"))
            ),
            "date": data.get("date")
        }

    except requests.RequestException:
        # Handle network/API connection problems.
        return {
            "success": False,
            "error": "Exchange rate service is unavailable"
        }


if __name__ == "__main__":
    mcp.run()