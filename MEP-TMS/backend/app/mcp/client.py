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

async def get_mcp_tools_schemas(current_user: dict = None) -> List[Dict[str, Any]]:
    """Retrieve tool definitions from the MCP server and format them for OpenAI API."""
    tools_list = await list_tools(current_user)
    openai_tools = []
    for tool in tools_list:
        openai_tools.append({
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.inputSchema
            }
        })
    return openai_tools

async def run_coordinator_agent(user_prompt: str, current_user: dict, chat_history: List[Dict[str, Any]] = None) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Run the coordinator assistant agent loop using Azure OpenAI.
    Translates user query -> Azure OpenAI -> MCP Server Tool executions -> Final response.
    Returns:
        Tuple[final_response_text, list_of_executed_tool_calls_for_thought_logs]
    """
    from openai import AsyncOpenAI
    
    mcp_tools = await get_mcp_tools_schemas(current_user)
    
    # Initialize message list
    messages = []
    
    # Add system instructions
    role = current_user.get("role", "COORDINATOR") if current_user else "COORDINATOR"
    persona = "Admin" if role == "ADMIN" else "Coordinator"
    
    system_instruction = (
        f"You are an expert AI {persona} Assistant for Maverick Execution Platform (MEP-TMS). "
        f"You assist batch {persona.lower()}s with administration, candidate management, communication, and reporting. "
        "You have direct access to a set of database, email, and Excel tools via Model Context Protocol (MCP).\n\n"
        "Instructions:\n"
        "1. Always use the appropriate tool when the user asks for batch listings, summaries, toppers, email alerts, or candidate records.\n"
        f"2. If the {persona.lower()} asks to import trainees from an Excel file, ask for the local file path (or use the uploaded file path) and call `parse_and_import_excel_candidates`.\n"
        "3. Present database records cleanly. Use markdown tables or lists when listing candidates or batch schedules.\n"
        "4. If a tool fails, explain the error to the user gracefully.\n"
        "5. Keep responses professional, helpful, and concise."
    )
    messages.append({"role": "system", "content": system_instruction})
    
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
    
    client = AsyncOpenAI(
        api_key=settings.AZURE_OPENAI_API_KEY,
        base_url=settings.AZURE_OPENAI_ENDPOINT
    )
    
    executed_tools_log = []
    loop_count = 0
    max_loops = 5  # Prevent infinite agent loops

    while loop_count < max_loops:
        loop_count += 1
        
        # 1. Ask Azure OpenAI
        response = await client.chat.completions.create(
            model=settings.AZURE_OPENAI_DEPLOYMENT,
            messages=messages,
            tools=mcp_tools if mcp_tools else None,
            temperature=0.2
        )
        
        message = response.choices[0].message
        
        # Build assistant message to add to messages history
        assistant_msg = {
            "role": "assistant",
            "content": message.content or ""
        }
        if message.tool_calls:
            assistant_msg["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": tc.type,
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments
                    }
                } for tc in message.tool_calls
            ]
            
        messages.append(assistant_msg)
        
        # 2. If no tool calls, agent has finished reasoning and returned final text
        if not message.tool_calls:
            return message.content or "", executed_tools_log
            
        # 3. Handle tool calls
        for tc in message.tool_calls:
            tool_name = tc.function.name
            try:
                tool_args = json.loads(tc.function.arguments)
            except Exception:
                tool_args = {}
            
            # Log for thought drawer
            executed_tools_log.append({
                "toolName": tool_name,
                "arguments": tool_args,
                "status": "running",
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Execute the tool via our MCP Server implementation
            try:
                mcp_response = await call_tool(tool_name, tool_args, current_user)
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
                
            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "name": tool_name,
                "content": tool_output
            })

    return "Agent loop exceeded maximum execution steps.", executed_tools_log
