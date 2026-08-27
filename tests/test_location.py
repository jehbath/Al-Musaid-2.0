import asyncio
import json

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def main():
    server_params = StdioServerParameters(
        command="python",
        args=["-m", "mcp_servers.location.server"],
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:

            await session.initialize()

            tools = await session.list_tools()

            print("Available tools:")
            for tool in tools.tools:
                print(f"- {tool.name}")

            # Test nearest branch
            branch_result = await session.call_tool(
                "find_nearest_branch", {"latitude": 24.7000, "longitude": 46.6900}
            )

            print("\nNearest branch:")
            if branch_result.content:
                text = branch_result.content[0].text
                data = json.loads(text)
                print(json.dumps(data, indent=2))

            # Test nearest ATM
            atm_result = await session.call_tool(
                "find_nearest_atm", {"latitude": 24.7000, "longitude": 46.6900}
            )

            print("\nNearest ATM:")
            if atm_result.content:
                text = atm_result.content[0].text
                data = json.loads(text)
                print(json.dumps(data, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
