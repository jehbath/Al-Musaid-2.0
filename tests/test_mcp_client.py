import asyncio

from application.mcp_client import MCPClientManager


async def main():
    manager = MCPClientManager()

    result = await manager.call_tool(
        "convert_currency", {"amount": 1, "from_currency": "USD", "to_currency": "SAR"}
    )

    print("Tool result:")
    print(result)


if __name__ == "__main__":
    asyncio.run(main())
