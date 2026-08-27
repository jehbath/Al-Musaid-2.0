import asyncio

from application.gemini_client import GeminiClient
from application.mcp_client import MCPClientManager


async def main():

    mcp_client = MCPClientManager()

    tools = []

    for server_name in mcp_client.server_modules:
        server_tools = await mcp_client.list_server_tools(server_name)
        tools.extend(server_tools)

    gemini = GeminiClient()

    result = gemini.decide_action("كم رصيدي؟", tools)

    print("Gemini decision:")
    print(result)


if __name__ == "__main__":
    asyncio.run(main())
