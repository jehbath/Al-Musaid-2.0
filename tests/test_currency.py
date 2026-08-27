import asyncio
import json

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def main():
    server_params = StdioServerParameters(
        command="python",
        args=["-m", "mcp_servers.currency.server"],
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:

            await session.initialize()

            tools = await session.list_tools()

            print("Available tools:")
            for tool in tools.tools:
                print(f"- {tool.name}")

            result = await session.call_tool(
                "convert_currency",
                {
                    "amount": 1,
                    "from_currency": "USD",
                    "to_currency": "SAR"
                }
            )

            print("\nConversion result:")

            if result.content:
                text = result.content[0].text
                data = json.loads(text)
                print(json.dumps(data, indent=2))


if __name__ == "__main__":
    asyncio.run(main())