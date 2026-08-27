import json

from application.gemini_client import GeminiClient
from application.mcp_client import MCPClientManager


class Assistant:

    def __init__(self):
        self.gemini = GeminiClient()
        self.mcp_client = MCPClientManager()

    async def process_message(self, user_message):
        """Process a user message using Gemini and MCP tools."""

        # Discover all available MCP tools.
        tools = []

        for server_name in self.mcp_client.server_modules:
            server_tools = await self.mcp_client.list_server_tools(server_name)
            tools.extend(server_tools)

        # Ask Gemini what action should be taken.
        decision = self.gemini.decide_action(user_message, tools)

        decision_data = json.loads(decision)

        # If Gemini wants to call an MCP tool.
        if decision_data["action"] == "tool":

            tool_name = decision_data["tool_name"]
            arguments = decision_data.get("arguments", {})

            # Call the selected MCP tool.
            tool_result = await self.mcp_client.call_tool(tool_name, arguments)

            # Give the tool result back to Gemini
            # so it can generate the final response.
            final_response = self.gemini.generate_tool_response(
                user_message, tool_name, tool_result
            )

            return {"success": True, "response": final_response}

        # If Gemini can answer without using an MCP tool.
        elif decision_data["action"] == "response":

            return {"success": True, "response": decision_data["response"]}

        # Handle an unexpected action.
        else:

            return {"success": False, "error": "Unknown Gemini action"}
