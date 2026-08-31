import json

from application.gemini_client import GeminiClient
from application.mcp_client import MCPClientManager


class Assistant:

    def __init__(self):
        self.gemini = GeminiClient()
        self.mcp_client = MCPClientManager()

    async def process_message(
        self, user_message, latitude=None, longitude=None, location_error=None
    ):
        """Process a user message using Gemini and MCP tools."""

        tools = []

        for server_name in self.mcp_client.server_modules:
            server_tools = await self.mcp_client.list_server_tools(server_name)
            tools.extend(server_tools)

        decision = self.gemini.decide_action(
            user_message=user_message,
            tools=tools,
            latitude=latitude,
            longitude=longitude,
            location_error=location_error,
        )

        decision_data = json.loads(decision)

        print("GEMINI DECISION DATA:", decision_data)

        action = decision_data.get("action")

        if action == "location_required":

            return {
                "success": True,
                "action": "location_required",
                "location_type": decision_data.get("location_type", "unknown"),
                "response": None,
            }

        # --------------------------------------------------
        # Multiple MCP tools
        # --------------------------------------------------

        if action == "tools":

            selected_tools = decision_data.get("tools", [])

            tool_results = []

            for selected_tool in selected_tools:

                tool_name = selected_tool.get("tool_name")

                arguments = selected_tool.get("arguments", {})

                if latitude is not None and longitude is not None:
                    arguments["latitude"] = latitude
                    arguments["longitude"] = longitude

                print("MCP TOOL:", tool_name)
                print("MCP ARGUMENTS:", arguments)

                tool_result = await self.mcp_client.call_tool(tool_name, arguments)

                print("MCP RESULT:", tool_result)

                tool_results.append(
                    {
                        "tool_name": tool_name,
                        "result": tool_result,
                    }
                )

            final_response = self.gemini.generate_tools_response(
                user_message,
                tool_results,
                location_error=location_error,
            )

            return {
                "success": True,
                "response": final_response,
            }

        # --------------------------------------------------
        # Single MCP tool
        # --------------------------------------------------

        if action == "tool":

            tool_name = decision_data.get("tool_name")

            arguments = decision_data.get("arguments", {})

            if latitude is not None and longitude is not None:
                arguments["latitude"] = latitude
                arguments["longitude"] = longitude

            print("MCP TOOL:", tool_name)
            print("MCP ARGUMENTS:", arguments)

            tool_result = await self.mcp_client.call_tool(tool_name, arguments)

            print("MCP RESULT:", tool_result)

            final_response = self.gemini.generate_tool_response(
                user_message,
                tool_name,
                tool_result,
                location_error=location_error,
            )

            return {
                "success": True,
                "response": final_response,
            }

        # --------------------------------------------------
        # Direct response
        # --------------------------------------------------

        if action == "response":

            return {
                "success": True,
                "response": decision_data.get("response", ""),
            }

        return {
            "success": False,
            "response": "عذرًا، حدث خطأ أثناء معالجة طلبك.",
        }
