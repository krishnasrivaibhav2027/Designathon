import os
import sys
import json
import httpx
from typing import List, Dict, Any, Tuple
from datetime import datetime

# Add the project root directory to the python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.config import settings
from app.mcp.server import call_tool, list_tools

async def get_mcp_tools_schemas() -> List[Dict[str, Any]]:
    """Retrieve tool definitions from the MCP server and format them for Gemini API."""
    tools_list = await list_tools()
    gemini_tools = []
    for tool in tools_list:
        gemini_tools.append({
            "name": tool.name,
            "description": tool.description,
            "parameters": tool.inputSchema
        })
    return gemini_tools

async def call_gemini_api(messages: List[Dict[str, Any]], tools: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Execute a direct REST API call to Gemini with optional tool definitions."""
    model = settings.GEMINI_MODEL
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.GEMINI_API_KEY}"
    
    headers = {"Content-Type": "application/json"}
    
    # Format messages for Gemini API
    # Gemini expects contents: [{ role: "user"|"model", parts: [{ text: "..." } | { functionCall: ... }] }]
    contents = []
    for msg in messages:
        role = msg.get("role")
        if role == "assistant":
            role = "model"
            
        parts = []
        if "content" in msg and msg["content"]:
            parts.append({"text": msg["content"]})
            
        if "function_calls" in msg:
            for fc in msg["function_calls"]:
                parts.append({
                    "functionCall": {
                        "name": fc["name"],
                        "args": fc["args"]
                    }
                })
                
        if "function_responses" in msg:
            for fr in msg["function_responses"]:
                parts.append({
                    "functionResponse": {
                        "name": fr["name"],
                        "response": {"result": fr["response"]}
                    }
                })
                
        contents.append({
            "role": role,
            "parts": parts
        })
        
    payload = {
        "contents": contents,
        "systemInstruction": {
            "parts": [{
                "text": (
                    "You are an expert AI Coordinator Assistant for Maverick Execution Platform (MEP-TMS). "
                    "You assist batch coordinators with administration, candidate management, communication, and reporting. "
                    "You have direct access to a set of database, email, and Excel tools via Model Context Protocol (MCP).\n\n"
                    "Instructions:\n"
                    "1. Always use the appropriate tool when the user asks for batch listings, summaries, toppers, email alerts, or candidate records.\n"
                    "2. If the coordinator asks to import trainees from an Excel file, ask for the local file path (or use the uploaded file path) and call `parse_and_import_excel_candidates`.\n"
                    "3. Present database records cleanly. Use markdown tables or lists when listing candidates or batch schedules.\n"
                    "4. If a tool fails, explain the error to the user gracefully.\n"
                    "5. Keep responses professional, helpful, and concise."
                )
            }]
        }
    }
    
    if tools:
        payload["tools"] = [{"functionDeclarations": tools}]
        
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Gemini API Error (Status {response.status_code}): {response.text}")
        return response.json()

async def run_coordinator_agent(user_prompt: str, chat_history: List[Dict[str, Any]] = None) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Run the coordinator assistant agent loop.
    Translates user query -> Gemini -> MCP Server Tool executions -> Final response.
    Returns:
        Tuple[final_response_text, list_of_executed_tool_calls_for_thought_logs]
    """
    mcp_tools = await get_mcp_tools_schemas()
    
    # Initialize message list
    messages = []
    if chat_history:
        for h in chat_history:
            messages.append({
                "role": h["role"], # user or assistant
                "content": h["content"]
            })
            
    messages.append({
        "role": "user",
        "content": user_prompt
    })
    
    executed_tools_log = []
    loop_count = 0
    max_loops = 5  # Prevent infinite agent loops

    while loop_count < max_loops:
        loop_count += 1
        
        # 1. Ask Gemini
        response_json = await call_gemini_api(messages, tools=mcp_tools)
        
        # Parse response parts
        candidates = response_json.get("candidates", [])
        if not candidates:
            return "Error: No response generated by AI model.", executed_tools_log
            
        first_candidate = candidates[0]
        content = first_candidate.get("content", {})
        parts = content.get("parts", [])
        
        # Look for text content and function calls
        text_content = ""
        function_calls = []
        
        for part in parts:
            if "text" in part:
                text_content += part["text"]
            if "functionCall" in part:
                function_calls.append(part["functionCall"])
                
        # 2. If no function calls, agent has finished reasoning and returned final text
        if not function_calls:
            return text_content, executed_tools_log
            
        # 3. Handle function calls
        # Append assistant's turn with the requested function calls to maintain correct message sequence
        messages.append({
            "role": "assistant",
            "content": text_content,
            "function_calls": [{"name": fc["name"], "args": fc["args"]} for fc in function_calls]
        })
        
        # We need a corresponding 'user' turn containing the function response(s)
        function_responses = []
        
        for fc in function_calls:
            tool_name = fc["name"]
            tool_args = fc["args"]
            
            # Log for thought drawer
            executed_tools_log.append({
                "toolName": tool_name,
                "arguments": tool_args,
                "status": "running",
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Execute the tool via our MCP Server implementation
            # We call the handler directly (in-process execution)
            try:
                # call_tool returns a list of TextContent objects
                mcp_response = await call_tool(tool_name, tool_args)
                tool_output = ""
                if mcp_response and len(mcp_response) > 0:
                    tool_output = mcp_response[0].text
                else:
                    tool_output = "Success (No content returned)"
                
                # Update status to success
                executed_tools_log[-1]["status"] = "success"
                executed_tools_log[-1]["result"] = tool_output
            except Exception as tool_ex:
                tool_output = f"Error executing tool: {str(tool_ex)}"
                executed_tools_log[-1]["status"] = "failed"
                executed_tools_log[-1]["result"] = tool_output
                
            function_responses.append({
                "name": tool_name,
                "response": tool_output
            })
            
        # Append the tool execution response as the user's reply
        messages.append({
            "role": "user",
            "function_responses": function_responses
        })

    return "Agent loop exceeded maximum execution steps.", executed_tools_log
