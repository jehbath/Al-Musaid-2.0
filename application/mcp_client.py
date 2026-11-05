import json
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# Environment variable used to pass the authenticated user ID to MCP servers.
USER_ID_ENV_VAR = "AL_MUSAID_USER_ID"

# Maps each MCP server to its Python module.
SERVER_MODULES = {
    "core_banking": "mcp_servers.core_banking.server",
    "currency": "mcp_servers.currency.server",
    "location": "mcp_servers.location.server",
}


class MCPClientManager:

    def __init__(self):
        self.server_modules = SERVER_MODULES
        self.tool_registry = {}

    async def list_server_tools(self, server_name):
        """Connect to an MCP server and return its available tools."""

        server_module = self.server_modules.get(server_name)

        if server_module is None:
            raise ValueError(f"Unknown MCP server: {server_name}")

        server_params = StdioServerParameters(
            command="python",
            args=["-m", server_module],
        )

        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:

                await session.initialize()

                tools = await session.list_tools()

                return tools.tools

    async def call_tool(self, tool_name, arguments=None, user_id=None):
        """
        Call a tool using the tool registry.

        user_id is the trusted ID from the backend (validated JWT).
        It is passed to the MCP server through an environment variable,
        never through the tool arguments, so Gemini cannot control it.
        """

        if not self.tool_registry:
            await self.build_tool_registry()

        server_name = self.tool_registry.get(tool_name)

        if server_name is None:
            raise ValueError(f"Unknown tool: {tool_name}")

        server_module = self.server_modules[server_name]

        env = {}

        if user_id is not None:
            env[USER_ID_ENV_VAR] = str(int(user_id))

        server_params = StdioServerParameters(
            command="python",
            args=["-m", server_module],
            env=env,
        )

        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:

                await session.initialize()

                result = await session.call_tool(tool_name, arguments or {})

                return self.extract_result(result)

    def extract_result(self, result):
        """Extract the JSON data from an MCP tool result."""

        if result.is_error:
            return {"success": False, "error": "MCP tool execution failed"}

        if not result.content:
            return {"success": False, "error": "Empty tool result"}

        text = result.content[0].text

        return json.loads(text)

    async def build_tool_registry(self):
        """Discover all tools and map each tool to its MCP server."""

        self.tool_registry = {}

        for server_name in self.server_modules:

            tools = await self.list_server_tools(server_name)

            for tool in tools:
                self.tool_registry[tool.name] = server_name

        return self.tool_registry
