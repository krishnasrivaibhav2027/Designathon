import os
import sys
import json
import asyncio
import pandas as pd
from datetime import datetime

# Add the project root directory to the python path to resolve absolute imports correctly
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import get_db, connect_to_supabase
from app.services.email_service import EmailService
from app.models.models import row_to_api, Candidate
from app.routers.batch import get_next_employee_id, generate_temp_password
from app.core.security import hash_password, check_batch_access, check_candidate_access

from mcp.server import Server
import mcp.types as types
from mcp.server.stdio import stdio_server

# Initialize the MCP Server
app = Server("mep-coordinator-mcp")

@app.list_tools()
async def list_tools(user: dict = None) -> list[types.Tool]:
    """List the available tools for the Coordinator or Admin assistant."""
    role = user.get("role", "COORDINATOR") if user else "COORDINATOR"
    
    if role == "ADMIN":
        app.name = "mep-admin-mcp"
        email_tool_name = "send_admin_email"
    else:
        app.name = "mep-coordinator-mcp"
        email_tool_name = "send_coordinator_email"

    tools = [
        types.Tool(
            name="list_batches",
            description="List all active, completed, or planned training batches in the system." if role == "ADMIN" else "List only the training batches assigned to or created by you.",
            inputSchema={
                "type": "object",
                "properties": {},
            }
        ),
        types.Tool(
            name="get_batch_summary",
            description="Retrieve detailed summary statistics (candidate count, average attendance, dates) for a specific batch.",
            inputSchema={
                "type": "object",
                "properties": {
                    "batch_id": {"type": "string", "description": "The unique UUID of the batch"}
                },
                "required": ["batch_id"]
            }
        ),
        types.Tool(
            name="get_toppers_list",
            description="Identify and retrieve the top-performing candidates in a specific batch.",
            inputSchema={
                "type": "object",
                "properties": {
                    "batch_id": {"type": "string", "description": "The unique UUID of the batch"},
                    "limit": {"type": "integer", "description": "Maximum number of toppers to return", "default": 5}
                },
                "required": ["batch_id"]
            }
        ),
        types.Tool(
            name=email_tool_name,
            description="Send an email update, attendance warning, or custom notification to any address.",
            inputSchema={
                "type": "object",
                "properties": {
                    "to_email": {"type": "string", "description": "Recipient email address"},
                    "subject": {"type": "string", "description": "Subject line of the email"},
                    "body": {"type": "string", "description": "Body message of the email (plain text or markdown)"}
                },
                "required": ["to_email", "subject", "body"]
            }
        ),
        types.Tool(
            name="parse_and_import_excel_candidates",
            description="Parse candidates list from an Excel sheet file path and import them into a batch.",
            inputSchema={
                "type": "object",
                "properties": {
                    "file_path": {"type": "string", "description": "Absolute path to the Excel file on local disk"},
                    "batch_id": {"type": "string", "description": "The unique UUID of the batch to import candidates into"}
                },
                "required": ["file_path", "batch_id"]
            }
        ),
        types.Tool(
            name="get_candidate_attendance",
            description="Retrieve the detailed daily attendance log and attendance counts for a candidate by email.",
            inputSchema={
                "type": "object",
                "properties": {
                    "email": {"type": "string", "description": "Candidate email address"}
                },
                "required": ["email"]
            }
        ),
        types.Tool(
            name="update_candidate_active_status",
            description="Toggle a candidate's user account active status (enable/disable account).",
            inputSchema={
                "type": "object",
                "properties": {
                    "email": {"type": "string", "description": "Candidate email address"},
                    "is_active": {"type": "boolean", "description": "True to activate, False to deactivate"}
                },
                "required": ["email", "is_active"]
            }
        ),
        types.Tool(
            name="send_feedback_email",
            description="Send the default feedback request email template to a candidate by their email address.",
            inputSchema={
                "type": "object",
                "properties": {
                    "email": {"type": "string", "description": "The email address of the trainee/candidate"}
                },
                "required": ["email"]
            }
        )
    ]

    if role != "COORDINATOR":
        return [t for t in tools if t.name != "send_feedback_email"]

    return tools

@app.call_tool()
async def call_tool(name: str, arguments: dict, user: dict = None) -> list[types.TextContent]:
    """Execute a requested tool and return a TextContent response."""
    role = user.get("role", "COORDINATOR") if user else "COORDINATOR"
    user_id = user.get("sub") or user.get("email") or ""

    if role == "ADMIN":
        app.name = "mep-admin-mcp"
    else:
        app.name = "mep-coordinator-mcp"

    db = get_db()
    if db is None:
        try:
            connect_to_supabase()
            db = get_db()
        except Exception as e:
            return [types.TextContent(type="text", text=f"Failed to connect to database: {str(e)}")]

    try:
        # Enforce security context dict fallback
        security_user = user or {"role": "COORDINATOR", "sub": ""}

        if name == "list_batches":
            res = db.table("batches").select("*").order("start_date", desc=True).execute()
            batches = [row_to_api(row) for row in res.data] if res.data else []
            if role == "COORDINATOR":
                filtered = []
                for b in batches:
                    creator = b.get("createdBy")
                    is_original = not creator and user_id in ["df772f20-b396-4a3b-8ddc-68fcd54b6060", "728f45b3-f6bd-4cfa-860f-a42c89682b33"]
                    if creator == user_id or is_original:
                        filtered.append(b)
                batches = filtered
            return [types.TextContent(type="text", text=json.dumps(batches, indent=2))]

        elif name == "get_batch_summary":
            batch_id = arguments["batch_id"]
            check_batch_access(db, security_user, batch_id)

            batch_res = db.table("batches").select("*").eq("id", batch_id).execute()
            if not batch_res.data:
                return [types.TextContent(type="text", text=f"Batch {batch_id} not found.")]
            batch = row_to_api(batch_res.data[0])

            cand_res = db.table("candidates").select("*").eq("batch_id", batch_id).execute()
            candidates = cand_res.data or []
            total_candidates = len(candidates)

            attn_res = db.table("attendances").select("*").eq("batch_id", batch_id).execute()
            attn_records = attn_res.data or []
            present_count = sum(1 for r in attn_records if r.get("status") == "PRESENT")
            total_attn = len(attn_records)
            avg_attendance = (present_count / total_attn * 100) if total_attn > 0 else 100.0

            summary = {
                "batchId": batch_id,
                "batchName": batch.get("batchName"),
                "status": batch.get("status"),
                "startDate": batch.get("startDate"),
                "endDate": batch.get("endDate"),
                "totalCandidates": total_candidates,
                "averageAttendance": f"{avg_attendance:.2f}%"
            }
            return [types.TextContent(type="text", text=json.dumps(summary, indent=2))]

        elif name == "get_toppers_list":
            batch_id = arguments["batch_id"]
            check_batch_access(db, security_user, batch_id)

            limit = arguments.get("limit", 5)
            cand_res = db.table("candidates").select("*").eq("batch_id", batch_id).execute()
            if not cand_res.data:
                return [types.TextContent(type="text", text="No candidates found for this batch.")]

            candidates = [row_to_api(row) for row in cand_res.data]
            # Sort by performanceScore or overallScore (whichever is available) descending
            candidates.sort(key=lambda x: x.get("performanceScore") or 0.0, reverse=True)
            toppers = candidates[:limit]

            results = [{
                "fullName": c.get("fullName"),
                "email": c.get("email"),
                "registrationNumber": c.get("registrationNumber"),
                "performanceScore": c.get("performanceScore") or 0.0
            } for c in toppers]
            return [types.TextContent(type="text", text=json.dumps(results, indent=2))]

        elif name in ["send_coordinator_email", "send_admin_email"]:
            expected_name = "send_admin_email" if role == "ADMIN" else "send_coordinator_email"
            if name != expected_name:
                return [types.TextContent(type="text", text=f"Error: Insufficient privileges to use tool '{name}'.")]

            to_email = arguments["to_email"]
            subject = arguments["subject"]
            body = arguments["body"]

            success = await EmailService.send_email(to_email, subject, body)
            if success:
                return [types.TextContent(type="text", text=f"Email successfully sent to {to_email}.")]
            else:
                return [types.TextContent(type="text", text=f"Failed to send email to {to_email} (check SMTP settings).")]

        elif name == "parse_and_import_excel_candidates":
            file_path = arguments["file_path"]
            batch_id = arguments["batch_id"]
            check_batch_access(db, security_user, batch_id)

            if not os.path.exists(file_path):
                return [types.TextContent(type="text", text=f"Error: Excel file '{file_path}' not found.")]

            df = pd.read_excel(file_path)
            # Find name/email columns
            name_col = next((c for c in df.columns if c.lower() in ["full_name", "fullname", "name"]), None)
            email_col = next((c for c in df.columns if c.lower() in ["email", "email_address"]), None)
            phone_col = next((c for c in df.columns if c.lower() in ["phone", "phone_number", "mobile"]), None)
            reg_col = next((c for c in df.columns if c.lower() in ["registration_number", "registration_num", "employee_id", "emp_id"]), None)

            if not name_col or not email_col:
                return [types.TextContent(type="text", text=f"Error: Missing columns. Sheet must contain 'name' and 'email' columns. Columns found: {list(df.columns)}")]

            imported_count = 0
            errors = []

            # Check if batch exists
            batch_res = db.table("batches").select("*").eq("id", batch_id).execute()
            if not batch_res.data:
                return [types.TextContent(type="text", text=f"Error: Target batch {batch_id} not found in database.")]

            for index, row in df.iterrows():
                full_name = str(row[name_col]).strip()
                email = str(row[email_col]).strip().lower()
                phone = str(row[phone_col]).strip() if phone_col and pd.notna(row[phone_col]) else None
                emp_id = str(row[reg_col]).strip() if reg_col and pd.notna(row[reg_col]) else None

                if not full_name or not email:
                    continue

                try:
                    # User table management
                    existing_user = db.table("users").select("*").eq("email", email).execute()
                    if existing_user.data:
                        user_row = existing_user.data[0]
                        user_uuid = user_row["id"]
                        current_batches = user_row.get("assigned_batches", []) or []
                        if batch_id not in current_batches:
                            current_batches.append(batch_id)
                            db.table("users").update({"assigned_batches": current_batches}).eq("id", user_uuid).execute()
                        if not emp_id:
                            emp_id = user_row.get("employee_id") or get_next_employee_id(db)
                    else:
                        if not emp_id:
                            emp_id = get_next_employee_id(db)
                        temp_pass = generate_temp_password()
                        pass_hash = hash_password(temp_pass)

                        new_user = {
                            "email": email,
                            "full_name": full_name,
                            "password_hash": pass_hash,
                            "role": "TRAINEE",
                            "assigned_batches": [batch_id],
                            "is_active": True,
                            "employee_id": emp_id,
                            "is_first_login": True
                        }
                        db.table("users").insert(new_user).execute()

                        # Email credentials
                        await EmailService.send_trainee_credentials(
                            candidate_email=email,
                            candidate_name=full_name,
                            employee_id=emp_id,
                            temp_password=temp_pass
                        )

                    # Candidate table management
                    existing_cand = db.table("candidates").select("*").eq("email", email).execute()
                    if existing_cand.data:
                        db.table("candidates").update({"batch_id": batch_id}).eq("email", email).execute()
                    else:
                        candidate = Candidate(
                            email=email,
                            fullName=full_name,
                            registrationNumber=emp_id,
                            batchId=batch_id,
                            phone=phone
                        )
                        payload = candidate.to_dict()
                        try:
                            db.table("candidates").insert(payload).execute()
                        except Exception as inner_err:
                            if "progress" in str(inner_err):
                                payload.pop("progress", None)
                                db.table("candidates").insert(payload).execute()
                            else:
                                raise
                    imported_count += 1
                except Exception as ex:
                    errors.append(f"Row {index + 2} ({email}): {str(ex)}")

            # Sync batch candidate count
            count_res = db.table("candidates").select("id").eq("batch_id", batch_id).execute()
            count = len(count_res.data) if count_res.data else 0
            db.table("batches").update({"candidates_count": count}).eq("id", batch_id).execute()

            result_msg = f"Import process complete. Successfully imported {imported_count} candidates into batch {batch_id}."
            if errors:
                result_msg += f"\nErrors: {json.dumps(errors, indent=2)}"
            return [types.TextContent(type="text", text=result_msg)]

        elif name == "get_candidate_attendance":
            email = arguments["email"]
            cand_res = db.table("candidates").select("*").eq("email", email).execute()
            if not cand_res.data:
                return [types.TextContent(type="text", text=f"Candidate with email {email} not found.")]

            candidate = cand_res.data[0]
            candidate_id = candidate["id"]
            check_candidate_access(db, security_user, candidate_id)

            attn_res = db.table("attendances").select("*").eq("candidate_id", candidate_id).order("date", desc=True).execute()
            records = attn_res.data or []

            result_list = []
            for r in records:
                result_list.append({
                    "date": r.get("date")[:10] if r.get("date") else None,
                    "status": r.get("status"),
                })

            summary = {
                "fullName": candidate.get("full_name"),
                "email": candidate.get("email"),
                "totalDays": len(result_list),
                "presentCount": sum(1 for r in result_list if r["status"] == "PRESENT"),
                "absentCount": sum(1 for r in result_list if r["status"] == "ABSENT"),
                "leaveCount": sum(1 for r in result_list if r["status"] == "LEAVE"),
                "log": result_list
            }
            return [types.TextContent(type="text", text=json.dumps(summary, indent=2))]

        elif name == "update_candidate_active_status":
            email = arguments["email"]
            is_active = arguments["is_active"]

            user_res = db.table("users").select("*").eq("email", email).execute()
            if not user_res.data:
                return [types.TextContent(type="text", text=f"User with email {email} not found.")]

            cand_res = db.table("candidates").select("id").eq("email", email).execute()
            if cand_res.data:
                candidate_id = cand_res.data[0]["id"]
                check_candidate_access(db, security_user, candidate_id)
            else:
                assigned_batches = user_res.data[0].get("assigned_batches", []) or []
                if assigned_batches:
                    check_batch_access(db, security_user, assigned_batches[0])

            db.table("users").update({"is_active": is_active}).eq("email", email).execute()
            status_str = "activated" if is_active else "deactivated"
            return [types.TextContent(type="text", text=f"Successfully {status_str} account for candidate {email}.")]

        elif name == "send_feedback_email":
            if role != "COORDINATOR":
                return [types.TextContent(type="text", text="Error: Insufficient privileges. Only coordinators can send feedback requests.")]
            email = arguments["email"]
            # 1. Fetch candidate
            cand_res = db.table("candidates").select("*").eq("email", email).execute()
            if not cand_res.data:
                return [types.TextContent(type="text", text=f"Candidate with email {email} not found in database.")]

            candidate = cand_res.data[0]
            candidate_id = candidate["id"]
            check_candidate_access(db, security_user, candidate_id)

            candidate_name = candidate.get("full_name") or candidate.get("fullName") or "Trainee"
            batch_id = candidate.get("batch_id") or candidate.get("batchId")

            if not batch_id:
                return [types.TextContent(type="text", text=f"Candidate {email} is not assigned to any batch.")]

            # 2. Fetch batch
            batch_res = db.table("batches").select("*").eq("id", batch_id).execute()
            if not batch_res.data:
                return [types.TextContent(type="text", text=f"Batch with ID {batch_id} not found for candidate {email}.")]

            batch = batch_res.data[0]
            batch_name = batch.get("batchName") or batch.get("batch_name") or "Training Batch"

            # 3. Send email using the template in EmailService
            success = await EmailService.send_feedback_request(
                candidate_email=email,
                candidate_name=candidate_name,
                batch_name=batch_name,
                batch_id=batch_id
            )

            if success:
                return [types.TextContent(type="text", text=f"Successfully sent the default feedback request email to {candidate_name} ({email}) for batch '{batch_name}'.")]
            else:
                return [types.TextContent(type="text", text=f"Failed to send feedback email to {email} (check SMTP settings).")]

        else:
            return [types.TextContent(type="text", text=f"Unknown tool: {name}")]

    except Exception as e:
        return [types.TextContent(type="text", text=f"Error executing {name}: {str(e)}")]

async def main():
    """Run the MCP server over standard I/O streams."""
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())
