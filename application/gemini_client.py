import json
import os

from dotenv import load_dotenv
from google import genai

load_dotenv()


class GeminiClient:

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set")

        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-3.7-flash"

    def generate_response(self, prompt):
        """Send a prompt to Gemini and return the text response."""

        response = self.client.models.generate_content(
            model=self.model, contents=prompt
        )

        return response.text.strip()

    def decide_action(self, user_message, tools):
        """Ask Gemini to decide whether an MCP tool is required."""

        tool_descriptions = []

        for tool in tools:
            tool_descriptions.append(
                {"name": tool.name, "description": tool.description or ""}
            )

        tools_json = json.dumps(tool_descriptions, indent=2, ensure_ascii=False)

        prompt = f"""
You are the AI Brain of a banking assistant called Al-Musaid 2.0.

Your job is to understand the user's request and decide
whether an MCP tool is required.

Available MCP tools:

{tools_json}

Rules:

1. If the user's request requires one of the available tools,
   select the appropriate tool.

2. Never invent a tool that is not in the available tools.

3. Extract the required arguments for the selected tool.

4. Do not perform banking operations yourself when an appropriate
   MCP tool exists.

5. If no tool is required, respond directly to the user.

6. Return ONLY a valid JSON object.

If a tool is required, return:

{{
    "action": "tool",
    "tool_name": "tool name",
    "arguments": {{}}
}}

If no tool is required, return:

{{
    "action": "response",
    "response": "your response"
}}

User message:

{user_message}
"""

        response = self.client.models.generate_content(
            model=self.model, contents=prompt
        )

        return self._clean_json_response(response.text)

    def generate_tool_response(self, user_message, tool_name, tool_result):
        """
        Send the MCP tool result to Gemini and generate
        a natural-language response for the user.
        """

        prompt = f"""
You are the AI Brain of Al-Musaid 2.0, an Arabic banking assistant.

The user asked:

{user_message}

The MCP tool used was:

{tool_name}

The MCP tool returned:

{json.dumps(tool_result, ensure_ascii=False, indent=2)}

Generate a clear and natural response to the user based ONLY
on the tool result.

Rules:

1. Do not invent information.
2. Do not expose technical details such as MCP, tools, JSON,
   or internal system architecture.
3. Respond naturally in Arabic.
4. Be concise and helpful.
5. If the tool result indicates an error, explain the error politely.
"""

        response = self.client.models.generate_content(
            model=self.model, contents=prompt
        )

        return response.text.strip()

    def _clean_json_response(self, text):
        """Clean and validate Gemini's JSON response."""

        if not text:
            raise ValueError("Gemini returned an empty response")

        text = text.strip()

        if text.startswith("```json"):
            text = text[len("```json") :].strip()

        elif text.startswith("```"):
            text = text[3:].strip()

        if text.endswith("```"):
            text = text[:-3].strip()

        try:
            data = json.loads(text)
        except json.JSONDecodeError as error:
            raise ValueError(f"Gemini returned invalid JSON:\n{text}") from error

        return json.dumps(data, ensure_ascii=False)
