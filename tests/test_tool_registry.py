import asyncio

from application.mcp_client import MCPClientManager


async def main():
    client = MCPClientManager()

    tools = await client.build_tool_registry()

    print("Tool Registry:")
    for tool_name, server_name in tools.items():
        print(f"{tool_name} -> {server_name}")


if __name__ == "__main__":
    asyncio.run(main())
