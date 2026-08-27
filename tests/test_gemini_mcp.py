import asyncio
import json

from application.gemini_client import GeminiClient
from application.mcp_client import MCPClientManager


async def main():

    # Create MCP client
    mcp_client = MCPClientManager()

    # Discover available tools
    tools = []

    for server_name in mcp_client.server_modules:
        server_tools = await mcp_client.list_server_tools(server_name)
        tools.extend(server_tools)

    # Create Gemini client
    gemini = GeminiClient()

    # Ask Gemini to decide what to do
    decision = gemini.decide_action("كم رصيدي؟", tools)

    print("Gemini decision:")
    print(decision)

    # Convert Gemini's JSON response into a Python object
    decision_data = json.loads(decision)

    # Check whether Gemini selected a tool
    if decision_data["action"] == "tool":

        tool_name = decision_data["tool_name"]
        arguments = decision_data["arguments"]

        print("\nCalling MCP tool:")
        print(tool_name)

        # Call the selected MCP tool
        result = await mcp_client.call_tool(tool_name, arguments)

        print("\nMCP tool result:")
        print(result)


if __name__ == "__main__":
    asyncio.run(main())
