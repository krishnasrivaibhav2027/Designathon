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
import re

def run_pg_query(sql: str, params: list = None) -> list:
    pg8000 = __import__('pg8000')
    host = "db.xfbrhbuznbsidzriaukk.supabase.co"
    user = "postgres"
    password = " Designathon@99"
    
    conn = None
    for port in [5432, 6543]:
        try:
            conn = pg8000.connect(host=host, user=user, password=password, port=port, database="postgres", timeout=5)
            break
        except Exception:
            continue
            
    if conn is None:
        raise Exception("Could not connect to PostgreSQL database (ports 5432 and 6543 timed out).")
        
    try:
        cursor = conn.cursor()
        # Enforce read-only default
        cursor.execute("SET default_transaction_read_only = on;")
        cursor.execute(sql, params or [])
        
        if cursor.description:
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            result = []
            for r in rows:
                # Convert non-serializable objects (like datetime) to strings for JSON compatibility
                row_dict = {}
                for col, val in zip(columns, r):
                    if hasattr(val, "isoformat"):
                        row_dict[col] = val.isoformat()
                    else:
                        row_dict[col] = val
                result.append(row_dict)
            return result
        else:
            conn.commit()
            return []
    finally:
        if conn:
            try:
                cursor.close()
                conn.close()
            except Exception:
                pass

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
            name="get_db_schema",
            description="Retrieve structural schema details of the database (tables, columns, types, foreign keys).",
            inputSchema={
                "type": "object",
                "properties": {},
            }
        ),
        types.Tool(
            name="execute_readonly_sql",
            description="Execute a read-only SQL query against the PostgreSQL database. Supports SELECT, joins, aggregates, grouping, and subqueries.",
            inputSchema={
                "type": "object",
                "properties": {
                    "sql_query": {
                        "type": "string",
                        "description": "Read-only SELECT SQL query to execute. Must be valid PostgreSQL syntax."
                    }
                },
                "required": ["sql_query"]
            }
        ),
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

        if name == "get_db_schema":
            schema_info = """### Database Schema Reference
The database contains the following tables and relationships:

#### 1. `users`
- `id` (UUID, Primary Key) - User ID
- `email` (VARCHAR, Unique) - User's email
- `full_name` (VARCHAR) - Full name
- `password_hash` (TEXT) - Hashed password
- `role` (VARCHAR) - 'ADMIN' | 'COORDINATOR' | 'TRAINER' | 'TRAINEE'
- `phone` (VARCHAR, Optional)
- `assigned_batches` (TEXT[]) - Array of Batch IDs the user belongs to
- `is_active` (BOOLEAN) - Active status
- `employee_id` (VARCHAR) - Unique employee/registration ID
- `is_first_login` (BOOLEAN)
- `last_login` (TIMESTAMPTZ)
- `last_logout` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### 2. `batches`
- `id` (UUID, Primary Key) - Unique batch ID
- `batch_id` (VARCHAR, Unique) - Human-readable batch code (e.g. SPARK-1-2025)
- `batch_name` (VARCHAR) - Name of batch
- `start_date` (TIMESTAMPTZ) - Start of training
- `end_date` (TIMESTAMPTZ) - End of training
- `trainers` (TEXT[]) - Array of trainer emails or names
- `description` (TEXT) - JSON string containing metadata:
  - `text` (string) - General description
  - `topics` (string[]) - Topics list
  - `sizeLimit` (number) - Max trainees
  - `created_by` (string) - ID of the Coordinator who created this batch
  - `session_dates` (string[]) - Active training session date strings (YYYY-MM-DD)
- `status` (VARCHAR) - 'PLANNED' | 'RUNNING' | 'COMPLETED' | 'CLOSED'
- `candidates_count` (INTEGER)
- `category` (VARCHAR) - 'SPARK' | 'FOUNDATION' | 'STREAM'
- `phase` (VARCHAR) - e.g. 'Phase 1', 'Phase 2'
- `onboarding_date` (DATE)

#### 3. `candidates`
- `id` (UUID, Primary Key)
- `email` (VARCHAR)
- `full_name` (VARCHAR)
- `registration_number` (VARCHAR, Unique)
- `batch_id` (UUID, Foreign Key -> `batches.id`)
- `phone` (VARCHAR)
- `performance_score` (FLOAT) - Overall performance score
- `progress` (JSONB) - `{"completed_days": [], "current_day": 1}`

#### 4. `attendances`
- `id` (UUID, Primary Key)
- `batch_id` (UUID, Foreign Key -> `batches.id`)
- `candidate_id` (UUID, Foreign Key -> `candidates.id`)
- `date` (TIMESTAMPTZ)
- `status` (VARCHAR) - 'PRESENT' | 'ABSENT' | 'LEAVE'
- `version` (INTEGER)

#### 5. `assessments`
- `id` (UUID, Primary Key)
- `batch_id` (UUID, Foreign Key -> `batches.id`)
- `candidate_id` (UUID, Foreign Key -> `candidates.id`)
- `assessment_name` (VARCHAR) - Name of the assessment
- `total_score` (INTEGER)
- `obtained_score` (INTEGER)
- `percentage` (FLOAT)
- `result` (VARCHAR) - 'PASS' | 'FAIL' | 'PENDING'
- `time_taken` (INTEGER, Optional) - Time taken in minutes

#### 6. `feedbacks`
- `id` (UUID, Primary Key)
- `batch_id` (UUID, Foreign Key -> `batches.id`)
- `candidate_id` (UUID, Foreign Key -> `candidates.id`)
- `rating` (INTEGER) - 1 to 5 stars
- `comments` (TEXT)

#### 7. `detailed_feedbacks`
- `id` (UUID, Primary Key)
- `batch_id` (UUID, Foreign Key -> `batches.id`)
- `candidate_id` (UUID, Foreign Key -> `candidates.id`, Optional)
- `respondent_name` (TEXT)
- `respondent_email` (TEXT)
- `batch_no_and_trainer` (TEXT)
- `takeaway1` (TEXT), `takeaway2` (TEXT), `takeaway3` (TEXT) - Key takeaways
- `improvements` (TEXT) - Suggested improvements
- `course_impact` (TEXT)
- `trainer_rating` (SMALLINT) - 1 to 5 stars
- `assignments_helpful` (TEXT) - 'Yes' | 'No' | 'Partially'
- `demonstrations_helpful` (TEXT) - 'Yes' | 'No' | 'Partially'
- `trainer_support_adequate` (TEXT)
- `technical_discussions_helpful` (TEXT)
- `other_comments` (TEXT)
- `submitted_at` (TIMESTAMPTZ)

#### 8. `trainee_pool`
- `id` (UUID, Primary Key)
- `email` (VARCHAR)
- `full_name` (VARCHAR)
- `college` (VARCHAR)
- `phone` (VARCHAR)
- `onboarding_date` (DATE)
- `status` (VARCHAR) - 'UNASSIGNED' | 'SPARK_1' | 'SPARK_2' | 'FOUNDATION' | 'STREAM' | 'ELIMINATED' | 'COMPLETED'
- `current_batch_id` (UUID, Foreign Key -> `batches.id`)
- `foundation_language` (VARCHAR)
- `stream_training` (VARCHAR)
- `eliminated_phase` (VARCHAR)
- `registration_number` (VARCHAR)

#### 9. `spark_1_report_cards` & `spark_2_report_cards`
- `id` (UUID, Primary Key)
- `batch_id` (UUID, Foreign Key -> `batches.id`)
- `candidate_id` (UUID, Foreign Key -> `candidates.id`)
- `superset_id` (VARCHAR)
- `name` (VARCHAR), `email` (VARCHAR), `college` (VARCHAR)
- `trainer_name` (VARCHAR), `batch_no` (VARCHAR)
- `a1_score` (FLOAT), `a2_score` (FLOAT)
- `communication_skills` (FLOAT), `interpersonal_skills` (FLOAT), `business_etiquette` (FLOAT), `service_orientation` (FLOAT), `emotional_intelligence_empathy` (FLOAT), `accountability_ownership` (FLOAT), `presentation_skills` (FLOAT)
- `final_status` (VARCHAR) - 'Cleared' | 'Not Cleared'
- `rank` (INTEGER)
- `reevaluation_comments` (TEXT)
- `total_days` (INTEGER), `present_days` (INTEGER), `absent_days` (INTEGER), `attendance_percentage` (FLOAT)
- `reason_for_absence` (TEXT), `pc_name` (VARCHAR)

#### 10. `foundation_report_cards`
- `id` (UUID, Primary Key)
- `batch_id` (UUID, Foreign Key -> `batches.id`)
- `candidate_id` (UUID, Foreign Key -> `candidates.id`)
- `superset_id` (VARCHAR), `name` (VARCHAR), `email` (VARCHAR), `college` (VARCHAR)
- `foundation_language` (VARCHAR), `status` (VARCHAR), `reason` (TEXT)
- `ga1_a1` to `ga5_a2` (FLOAT) - Grades for different weeks (Assessment 1 and 2)
- `project_eval_a1` (FLOAT), `project_eval_a2` (FLOAT)
- `final_grade_a1` (FLOAT), `final_grade_a2` (FLOAT)
- `training_status` (VARCHAR)

#### 11. `stream_report_cards`
- `id` (UUID, Primary Key)
- `batch_id` (UUID, Foreign Key -> `batches.id`)
- `candidate_id` (UUID, Foreign Key -> `candidates.id`)
- `emp_id` (VARCHAR), `name` (VARCHAR), `email` (VARCHAR), `college` (VARCHAR)
- `stream_training` (VARCHAR), `trainer_name` (VARCHAR), `batch_no` (VARCHAR)
- `mcq1_a1` to `mcq7_a2` (FLOAT), `coding1_a1` to `coding7_a2` (FLOAT), `project_score1_a1` to `project_score2_a2` (FLOAT), `online_coding_a1` (FLOAT), `online_coding_a2` (FLOAT)
- `final_status` (VARCHAR), `comment_reason` (TEXT)
- `total_days` (INTEGER), `present_days` (INTEGER), `absent_days` (INTEGER), `attendance_percentage` (FLOAT)
"""
            return [types.TextContent(type="text", text=schema_info)]

        elif name == "execute_readonly_sql":
            sql_query = arguments["sql_query"].strip().rstrip(";")
            
            # Enforce syntax check (must start with SELECT, WITH, SHOW, or EXPLAIN)
            # Remove single line comments
            clean_sql = re.sub(r'--.*$', '', sql_query, flags=re.MULTILINE)
            # Remove multi-line comments
            clean_sql = re.sub(r'/\*.*?\*/', '', clean_sql, flags=re.DOTALL)
            clean_sql = clean_sql.strip()
            
            first_word_match = re.match(r'^\s*([a-zA-Z]+)', clean_sql)
            if not first_word_match:
                return [types.TextContent(type="text", text="Error: Invalid SQL query: No statement found.")]
                
            first_word = first_word_match.group(1).upper()
            if first_word not in ["SELECT", "WITH", "SHOW", "EXPLAIN"]:
                return [types.TextContent(type="text", text=f"Error: Starting keyword '{first_word}' is not allowed. Only read-only queries starting with SELECT, WITH, SHOW, or EXPLAIN are allowed.")]
            
            # Additional block of forbidden write-related keywords outside of strings/comments
            forbidden_keywords = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE", "GRANT", "REVOKE"]
            sql_tokens = re.findall(r'\b[a-zA-Z]+\b', clean_sql.upper())
            for fk in forbidden_keywords:
                if fk in sql_tokens:
                    if fk in ["DROP", "TRUNCATE", "ALTER", "GRANT", "REVOKE"]:
                        return [types.TextContent(type="text", text=f"Error: Command '{fk}' is strictly forbidden.")]

            if role == "COORDINATOR":
                # Get coordinator allowed batches
                res = db.table("batches").select("*").execute()
                batches = [row_to_api(row) for row in res.data] if res.data else []
                
                trainer_name = ""
                try:
                    user_res = db.table("users").select("full_name").eq("id", user_id).execute()
                    if user_res.data:
                        trainer_name = user_res.data[0]["full_name"]
                except Exception:
                    pass
                    
                trainer_clean = trainer_name.strip().lower() if trainer_name else ""
                user_email_clean = user.get("email", "").strip().lower() if user else ""

                allowed_batch_ids = []
                for b in batches:
                    creator = b.get("createdBy")
                    is_original = not creator and user_id in ["df772f20-b396-4a3b-8ddc-68fcd54b6060", "728f45b3-f6bd-4cfa-860f-a42c89682b33"]
                    is_owner = creator == user_id or is_original
                    
                    trainers = b.get("trainers", []) or []
                    is_trainer = False
                    for t in trainers:
                        t_clean = t.strip().lower()
                        if (trainer_clean and t_clean == trainer_clean) or t_clean == user_email_clean:
                            is_trainer = True
                            break
                    
                    if is_owner or is_trainer:
                        allowed_batch_ids.append(b.get("id"))
                
                if not allowed_batch_ids:
                    return [types.TextContent(type="text", text="Error: Access Denied. Coordinator is not assigned to any batches.")]
                
                # Check for batch_id filter in query
                allowed_batch_ids_lower = [str(b_id).lower() for b_id in allowed_batch_ids]
                sql_lower = sql_query.lower()
                
                # Check restricted tables
                restricted_tables = [
                    "batches", "candidates", "attendances", "assessments", "feedbacks",
                    "spark_1_report_cards", "spark_2_report_cards", "foundation_report_cards",
                    "stream_report_cards", "detailed_feedbacks", "trainee_pool", "users", "attendance_audit_logs"
                ]
                references_restricted = any(table in sql_lower for table in restricted_tables)
                
                if references_restricted:
                    has_allowed_batch = any(b_id in sql_lower for b_id in allowed_batch_ids_lower)
                    if not has_allowed_batch:
                        if str(user_id).lower() not in sql_lower:
                            return [types.TextContent(type="text", text="Error: Access Denied. Query on restricted tables must filter by your allowed batch ID(s) or your own user ID.")]
                    
                    # Verify UUIDs
                    uuid_pattern = re.compile(r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b', re.IGNORECASE)
                    query_uuids = [u.lower() for u in uuid_pattern.findall(sql_query)]
                    
                    for q_uuid in query_uuids:
                        if q_uuid not in allowed_batch_ids_lower and q_uuid != str(user_id).lower():
                            is_ok = False
                            try:
                                cand_res = db.table("candidates").select("batch_id").eq("id", q_uuid).execute()
                                if cand_res.data and cand_res.data[0].get("batch_id") in allowed_batch_ids:
                                    is_ok = True
                                else:
                                    user_res = db.table("users").select("assigned_batches").eq("id", q_uuid).execute()
                                    if user_res.data:
                                        assigned = user_res.data[0].get("assigned_batches", []) or []
                                        if any(b in allowed_batch_ids for b in assigned):
                                            is_ok = True
                            except Exception:
                                pass
                            if not is_ok:
                                return [types.TextContent(type="text", text=f"Error: Access Denied. Unauthorized UUID identifier '{q_uuid}' in query.")]
            
            # Execute query: Try using Supabase RPC over HTTPS first, fallback to pg8000
            rows = None
            rpc_error = None
            try:
                res_rpc = db.rpc("execute_sql", {"sql_query": sql_query}).execute()
                if res_rpc.data is not None:
                    # Check if the database function returned an error dictionary
                    if isinstance(res_rpc.data, dict) and "error" in res_rpc.data:
                        return [types.TextContent(type="text", text=f"Error executing SQL query: {res_rpc.data['error']}")]
                    elif isinstance(res_rpc.data, list) and len(res_rpc.data) == 1 and isinstance(res_rpc.data[0], dict) and "error" in res_rpc.data[0]:
                        return [types.TextContent(type="text", text=f"Error executing SQL query: {res_rpc.data[0]['error']}")]
                    
                    rows = res_rpc.data
                    if not isinstance(rows, list):
                        rows = [rows] if rows else []
            except Exception as e:
                rpc_error = str(e)

            if rows is None:
                # Fallback to direct pg8000 connection
                try:
                    rows = run_pg_query(sql_query)
                except Exception as e:
                    # Report both errors
                    err_msg = (
                        f"Error executing SQL query:\n"
                        f"1. RPC HTTPS execution failed: {rpc_error}\n"
                        f"2. Direct connection on port 5432/6543 failed: {str(e)}\n\n"
                        f"Tip: If your direct database ports are blocked by a firewall, you can enable SQL execution over HTTPS "
                        f"by running the following snippet once in your Supabase SQL Editor:\n\n"
                        f"```sql\n"
                        f"CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)\n"
                        f"RETURNS JSONB\n"
                        f"LANGUAGE plpgsql\n"
                        f"SECURITY DEFINER\n"
                        f"AS $$\n"
                        f"DECLARE\n"
                        f"    result JSONB;\n"
                        f"    clean_query TEXT;\n"
                        f"BEGIN\n"
                        f"    clean_query := TRIM(TRAILING ';' FROM TRIM(sql_query));\n"
                        f"    IF NOT (LOWER(clean_query) LIKE 'select%' OR LOWER(clean_query) LIKE 'with%' OR LOWER(clean_query) LIKE 'show%' OR LOWER(clean_query) LIKE 'explain%') THEN\n"
                        f"        RETURN jsonb_build_object('error', 'Only SELECT, WITH, SHOW, or EXPLAIN queries are allowed.');\n"
                        f"    END IF;\n"
                        f"    EXECUTE 'SELECT jsonb_agg(t) FROM (' || clean_query || ') t' INTO result;\n"
                        f"    RETURN COALESCE(result, '[]'::jsonb);\n"
                        f"EXCEPTION\n"
                        f"    WHEN OTHERS THEN\n"
                        f"        RETURN jsonb_build_object('error', SQLERRM);\n"
                        f"END;\n"
                        f"$$;\n"
                        f"```"
                    )
                    return [types.TextContent(type="text", text=err_msg)]
            
            # Validate returned row content for Coordinator
            if role == "COORDINATOR":
                for row in rows:
                    for col_name, col_val in row.items():
                        col_name_lower = col_name.lower()
                        if col_name_lower in ["batch_id", "batchid", "current_batch_id"]:
                            if col_val and str(col_val).lower() not in allowed_batch_ids_lower:
                                return [types.TextContent(type="text", text="Error: Security Violation. Query returned data from an unauthorized batch.")]
                        elif col_name_lower == "id":
                            if col_val and len(str(col_val)) == 36:
                                val_str = str(col_val).lower()
                                all_batch_ids = [str(b.get("id")).lower() for b in batches]
                                if val_str in all_batch_ids and val_str not in allowed_batch_ids_lower:
                                    return [types.TextContent(type="text", text="Error: Security Violation. Query returned batch details of an unauthorized batch.")]
            
            return [types.TextContent(type="text", text=json.dumps(rows, indent=2))]

        elif name == "list_batches":
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
