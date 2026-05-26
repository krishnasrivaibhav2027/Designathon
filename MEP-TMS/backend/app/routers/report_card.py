from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_user, has_role
from app.models.models import row_to_api
from app.schemas.report_card_schemas import (
    SparkReportCardResponse, SparkReportCardUpdate,
    FoundationReportCardResponse, FoundationReportCardUpdate,
    StreamReportCardResponse, StreamReportCardUpdate
)
import openpyxl
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from fastapi.responses import StreamingResponse
import io
import csv

router = APIRouter(prefix="/api/report-card", tags=["report-card"])

# Helper: Convert snake_case Supabase keys to camelCase keys for API responses
def to_camel(snake_str):
    components = snake_str.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])

def map_db_to_api(row: dict) -> dict:
    if not row:
        return {}
    res = {}
    for k, v in row.items():
        # Handle specific custom manual overrides
        if k == "ga1_a1": res["ga1_a1"] = v
        elif k == "ga1_a2": res["ga1_a2"] = v
        elif k == "ga2_a1": res["ga2_a1"] = v
        elif k == "ga2_a2": res["ga2_a2"] = v
        elif k == "ga3_a1": res["ga3_a1"] = v
        elif k == "ga3_a2": res["ga3_a2"] = v
        elif k == "ga4_a1": res["ga4_a1"] = v
        elif k == "ga4_a2": res["ga4_a2"] = v
        elif k == "ga5_a1": res["ga5_a1"] = v
        elif k == "ga5_a2": res["ga5_a2"] = v
        elif k == "project_eval_a1": res["projectEval_a1"] = v
        elif k == "project_eval_a2": res["projectEval_a2"] = v
        elif k == "final_grade_a1": res["finalGrade_a1"] = v
        elif k == "final_grade_a2": res["finalGrade_a2"] = v
        elif k == "contact_number": res["contactNumber"] = v
        elif k == "foundation_language": res["foundationLanguage"] = v
        elif k == "email_sent_date": res["emailSentDate"] = v
        elif k == "training_status": res["trainingStatus"] = v
        elif k == "superset_id": res["supersetId"] = v
        elif k == "batch_id": res["batchId"] = v
        elif k == "candidate_id": res["candidateId"] = v
        elif k == "created_at": res["createdAt"] = v
        elif k == "updated_at": res["updatedAt"] = v
        elif k == "trainer_name": res["trainerName"] = v
        elif k == "training_start_date": res["trainingStartDate"] = v
        elif k == "training_end_date": res["trainingEndDate"] = v
        elif k == "batch_no": res["batchNo"] = v
        elif k == "a1_score": res["a1Score"] = v
        elif k == "a2_score": res["a2Score"] = v
        elif k == "final_status": res["finalStatus"] = v
        elif k == "total_days": res["totalDays"] = v
        elif k == "present_days": res["presentDays"] = v
        elif k == "absent_days": res["absentDays"] = v
        elif k == "attendance_percentage": res["attendancePercentage"] = v
        elif k == "emp_id": res["empId"] = v
        elif k == "stream_training": res["streamTraining"] = v
        elif k == "comment_reason": res["commentReason"] = v
        elif k == "project_score1_a1": res["projectScore1_a1"] = v
        elif k == "project_score1_a2": res["projectScore1_a2"] = v
        elif k == "project_score2_a1": res["projectScore2_a1"] = v
        elif k == "project_score2_a2": res["projectScore2_a2"] = v
        elif k == "online_coding_a1": res["onlineCoding_a1"] = v
        elif k == "online_coding_a2": res["onlineCoding_a2"] = v
        # MCQ 1-7
        elif k.startswith("mcq") or k.startswith("coding"):
            res[to_camel(k)] = v
        else:
            res[to_camel(k)] = v
    return res

# Helper: Convert camelCase request dicts to snake_case for DB storage
def map_api_to_db(data: dict) -> dict:
    res = {}
    for k, v in data.items():
        # Specific mappings
        if k == "contactNumber": res["contact_number"] = v
        elif k == "foundationLanguage": res["foundation_language"] = v
        elif k == "emailSentDate": res["email_sent_date"] = v
        elif k == "trainingStatus": res["training_status"] = v
        elif k == "supersetId": res["superset_id"] = v
        elif k == "batchId": res["batch_id"] = v
        elif k == "candidateId": res["candidate_id"] = v
        elif k == "trainerName": res["trainer_name"] = v
        elif k == "trainingStartDate": res["training_start_date"] = v
        elif k == "trainingEndDate": res["training_end_date"] = v
        elif k == "batchNo": res["batch_no"] = v
        elif k == "a1Score": res["a1_score"] = v
        elif k == "a2Score": res["a2_score"] = v
        elif k == "finalStatus": res["final_status"] = v
        elif k == "totalDays": res["total_days"] = v
        elif k == "presentDays": res["present_days"] = v
        elif k == "absentDays": res["absent_days"] = v
        elif k == "attendancePercentage": res["attendance_percentage"] = v
        elif k == "empId": res["emp_id"] = v
        elif k == "streamTraining": res["stream_training"] = v
        elif k == "commentReason": res["comment_reason"] = v
        elif k == "projectEval_a1": res["project_eval_a1"] = v
        elif k == "projectEval_a2": res["project_eval_a2"] = v
        elif k == "finalGrade_a1": res["final_grade_a1"] = v
        elif k == "finalGrade_a2": res["final_grade_a2"] = v
        elif k == "projectScore1_a1": res["project_score1_a1"] = v
        elif k == "projectScore1_a2": res["project_score1_a2"] = v
        elif k == "projectScore2_a1": res["project_score2_a1"] = v
        elif k == "projectScore2_a2": res["project_score2_a2"] = v
        elif k == "onlineCoding_a1": res["online_coding_a1"] = v
        elif k == "onlineCoding_a2": res["online_coding_a2"] = v
        # MCQ/Coding 1-7
        elif k.startswith("mcq") or k.startswith("coding"):
            # e.g., mcq1_a1 or mcq1_a2
            # camelCase is mcq1A1 or mcq1A2 -> convert to mcq1_a1/mcq1_a2
            snake = k
            for i in range(1, 8):
                if f"mcq{i}A1" == k: snake = f"mcq{i}_a1"
                elif f"mcq{i}A2" == k: snake = f"mcq{i}_a2"
                elif f"coding{i}A1" == k: snake = f"coding{i}_a1"
                elif f"coding{i}A2" == k: snake = f"coding{i}_a2"
            res[snake] = v
        else:
            # General convert to snake_case
            import re
            snake = re.sub(r'(?<!^)(?=[A-Z])', '_', k).lower()
            res[snake] = v
    return res


# ==========================================
# Spark Phase 1 Endpoints
# ==========================================

@router.get("/spark1/{batch_id}", response_model=List[SparkReportCardResponse])
async def get_spark1_records(batch_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    res = db.table("spark_1_report_cards").select("*").eq("batch_id", batch_id).execute()
    return [SparkReportCardResponse(**map_db_to_api(row)) for row in res.data or []]

@router.put("/spark1/{id}", response_model=SparkReportCardResponse)
async def update_spark1_record(id: str, payload: SparkReportCardUpdate, current_user: dict = Depends(has_role("TRAINER", "COORDINATOR", "ADMIN"))):
    db = get_db()
    db_update = map_api_to_db(payload.model_dump(exclude_unset=True))
    res = db.table("spark_1_report_cards").update(db_update).eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Record not found")
    return SparkReportCardResponse(**map_db_to_api(res.data[0]))

@router.get("/spark1/{batch_id}/download")
async def download_spark1_sheet(batch_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    batch_res = db.table("batches").select("batch_name").eq("id", batch_id).execute()
    batch_name = batch_res.data[0]["batch_name"] if batch_res.data else "Cohort"
    
    records_res = db.table("spark_1_report_cards").select("*").eq("batch_id", batch_id).execute()
    records = [map_db_to_api(r) for r in records_res.data or []]
    records.sort(key=lambda x: x.get("name", "").lower())

    wb = Workbook()
    ws = wb.active
    ws.title = "Spark Phase 1"
    ws.views.sheetView[0].showGridLines = True

    # Styling helper variables
    title_font = Font(name="Calibri", size=16, bold=True, color="1F497D")
    sec_font = Font(name="Calibri", size=11, bold=True, color="000000")
    bold_font = Font(name="Calibri", size=10, bold=True)
    reg_font = Font(name="Calibri", size=10)
    center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left_align = Alignment(horizontal="left", vertical="center")
    thin_side = Side(border_style="thin", color="D3D3D3")
    thin_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)

    # Curated HSL fills
    personal_fill = PatternFill(start_color="F5EEF8", end_color="F5EEF8", fill_type="solid") # Lavender Pink
    metrics_fill = PatternFill(start_color="D5F5E3", end_color="D5F5E3", fill_type="solid") # Mint Green
    attendance_fill = PatternFill(start_color="FCF3CF", end_color="FCF3CF", fill_type="solid") # Gold/Yellow

    # Merged header rows
    ws.merge_cells("A1:R1")
    ws["A1"] = "Spark Phase 1 Report Card - " + batch_name
    ws["A1"].font = title_font
    ws["A1"].alignment = center_align

    # Column widths and header values
    headers = [
        ("S.No", 6), ("Superset ID", 14), ("Name", 20), ("Registered Mail ID", 25), ("College", 22),
        ("Training", 16), ("Training Start date", 18), ("Training End date", 18), ("Trainer Name", 18),
        ("Batch No", 12), ("Training Status", 14), ("A-1", 10), ("A-2", 10), ("Final Status", 14),
        ("Total Days", 12), ("Present Days", 12), ("Absent Days", 12), ("Percentage", 12)
    ]

    # Spanning headers labels
    ws.merge_cells("A3:K3")
    ws["A3"] = "Personal & Training Info"
    ws["A3"].font = sec_font
    ws["A3"].alignment = center_align
    ws["A3"].fill = personal_fill

    ws.merge_cells("L3:N3")
    ws["L3"] = "Performance Metrics"
    ws["L3"].font = sec_font
    ws["L3"].alignment = center_align
    ws["L3"].fill = metrics_fill

    ws.merge_cells("O3:R3")
    ws["O3"] = "Attendance"
    ws["O3"].font = sec_font
    ws["O3"].alignment = center_align
    ws["O3"].fill = attendance_fill

    # Specific headers in row 4
    for idx, (h_name, width) in enumerate(headers, 1):
        cell = ws.cell(row=4, column=idx, value=h_name)
        cell.font = bold_font
        cell.alignment = center_align
        cell.border = thin_border
        ws.column_dimensions[get_column_letter(idx)].width = width
        
        # Color specific section columns
        if idx <= 11:
            cell.fill = personal_fill
        elif idx <= 14:
            cell.fill = metrics_fill
        else:
            cell.fill = attendance_fill

    # Fill data rows starting at row 5
    for r_idx, r in enumerate(records, 5):
        ws.cell(row=r_idx, column=1, value=r_idx - 4).alignment = center_align
        ws.cell(row=r_idx, column=2, value=r.get("supersetId", "")).alignment = center_align
        ws.cell(row=r_idx, column=3, value=r.get("name", "")).alignment = left_align
        ws.cell(row=r_idx, column=4, value=r.get("email", "")).alignment = left_align
        ws.cell(row=r_idx, column=5, value=r.get("college", "")).alignment = left_align
        ws.cell(row=r_idx, column=6, value=r.get("trainingName", "Spark Phase 1")).alignment = center_align
        ws.cell(row=r_idx, column=7, value=r.get("trainingStartDate", "")).alignment = center_align
        ws.cell(row=r_idx, column=8, value=r.get("trainingEndDate", "")).alignment = center_align
        ws.cell(row=r_idx, column=9, value=r.get("trainerName", "")).alignment = left_align
        ws.cell(row=r_idx, column=10, value=r.get("batchNo", "")).alignment = center_align
        ws.cell(row=r_idx, column=11, value=r.get("trainingStatus", "Active")).alignment = center_align
        
        ws.cell(row=r_idx, column=12, value=r.get("a1Score")).alignment = center_align
        ws.cell(row=r_idx, column=13, value=r.get("a2Score")).alignment = center_align
        ws.cell(row=r_idx, column=14, value=r.get("finalStatus", "Cleared")).alignment = center_align
        
        ws.cell(row=r_idx, column=15, value=r.get("totalDays", 0)).alignment = center_align
        ws.cell(row=r_idx, column=16, value=r.get("presentDays", 0)).alignment = center_align
        ws.cell(row=r_idx, column=17, value=r.get("absentDays", 0)).alignment = center_align
        
        # Percentage formula: =IF(O{row}>0, P{row}/O{row}, 0)
        pct_cell = ws.cell(row=r_idx, column=18, value=f"=IF(O{r_idx}>0, P{r_idx}/O{r_idx}, 0)")
        pct_cell.alignment = center_align
        pct_cell.number_format = '0%'

        for c_idx in range(1, 19):
            ws.cell(row=r_idx, column=c_idx).border = thin_border
            ws.cell(row=r_idx, column=c_idx).font = reg_font

    file_stream = io.BytesIO()
    wb.save(file_stream)
    file_stream.seek(0)
    
    filename = f"Spark1_Report_{batch_name.replace(' ', '_')}.xlsx"
    return StreamingResponse(
        file_stream,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )

@router.post("/spark1/{batch_id}/upload")
async def upload_spark1_sheet(batch_id: str, file: UploadFile = File(...), current_user: dict = Depends(has_role("TRAINER", "COORDINATOR", "ADMIN"))):
    db = get_db()
    contents = await file.read()
    wb = openpyxl.load_workbook(io.BytesIO(contents))
    ws = wb.active
    
    updated_count = 0
    errors = []

    # Iterate rows starting at row 5 (ignoring headers)
    for r_idx in range(5, ws.max_row + 1):
        email = ws.cell(row=r_idx, column=4).value
        if not email:
            continue
        email = str(email).strip().lower()
        
        try:
            superset_id = ws.cell(row=r_idx, column=2).value
            college = ws.cell(row=r_idx, column=5).value
            training_status = ws.cell(row=r_idx, column=11).value
            
            a1_score = ws.cell(row=r_idx, column=12).value
            a2_score = ws.cell(row=r_idx, column=13).value
            final_status = ws.cell(row=r_idx, column=14).value
            
            total_days = ws.cell(row=r_idx, column=15).value
            present_days = ws.cell(row=r_idx, column=16).value
            absent_days = ws.cell(row=r_idx, column=17).value

            def float_or_none(val):
                try: return float(val) if val is not None else None
                except: return None

            def int_or_zero(val):
                try: return int(val) if val is not None else 0
                except: return 0

            # Map back to database updates
            payload = {
                "superset_id": str(superset_id) if superset_id is not None else None,
                "college": str(college) if college is not None else None,
                "training_status": str(training_status) if training_status is not None else "Active",
                "a1_score": float_or_none(a1_score),
                "a2_score": float_or_none(a2_score),
                "final_status": str(final_status) if final_status is not None else "Cleared",
                "total_days": int_or_zero(total_days),
                "present_days": int_or_zero(present_days),
                "absent_days": int_or_zero(absent_days),
            }
            
            if payload["total_days"] > 0:
                payload["attendance_percentage"] = payload["present_days"] / payload["total_days"]

            db.table("spark_1_report_cards").update(payload).eq("batch_id", batch_id).eq("email", email).execute()
            updated_count += 1
        except Exception as e:
            errors.append(f"Row {r_idx} (email: {email}): {str(e)}")

    return {"updated": updated_count, "errors": errors}


# ==========================================
# Spark Phase 2 Endpoints
# ==========================================

@router.get("/spark2/{batch_id}", response_model=List[SparkReportCardResponse])
async def get_spark2_records(batch_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    res = db.table("spark_2_report_cards").select("*").eq("batch_id", batch_id).execute()
    return [SparkReportCardResponse(**map_db_to_api(row)) for row in res.data or []]

@router.put("/spark2/{id}", response_model=SparkReportCardResponse)
async def update_spark2_record(id: str, payload: SparkReportCardUpdate, current_user: dict = Depends(has_role("TRAINER", "COORDINATOR", "ADMIN"))):
    db = get_db()
    db_update = map_api_to_db(payload.model_dump(exclude_unset=True))
    res = db.table("spark_2_report_cards").update(db_update).eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Record not found")
    return SparkReportCardResponse(**map_db_to_api(res.data[0]))

@router.get("/spark2/{batch_id}/download")
async def download_spark2_sheet(batch_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    batch_res = db.table("batches").select("batch_name").eq("id", batch_id).execute()
    batch_name = batch_res.data[0]["batch_name"] if batch_res.data else "Cohort"
    
    records_res = db.table("spark_2_report_cards").select("*").eq("batch_id", batch_id).execute()
    records = [map_db_to_api(r) for r in records_res.data or []]
    records.sort(key=lambda x: x.get("name", "").lower())

    wb = Workbook()
    ws = wb.active
    ws.title = "Spark Phase 2"
    ws.views.sheetView[0].showGridLines = True

    # Styles
    title_font = Font(name="Calibri", size=16, bold=True, color="1F497D")
    sec_font = Font(name="Calibri", size=11, bold=True, color="000000")
    bold_font = Font(name="Calibri", size=10, bold=True)
    reg_font = Font(name="Calibri", size=10)
    center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left_align = Alignment(horizontal="left", vertical="center")
    thin_side = Side(border_style="thin", color="D3D3D3")
    thin_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)

    personal_fill = PatternFill(start_color="F5EEF8", end_color="F5EEF8", fill_type="solid")
    metrics_fill = PatternFill(start_color="D5F5E3", end_color="D5F5E3", fill_type="solid")
    attendance_fill = PatternFill(start_color="FCF3CF", end_color="FCF3CF", fill_type="solid")

    ws.merge_cells("A1:R1")
    ws["A1"] = "Spark Phase 2 Report Card - " + batch_name
    ws["A1"].font = title_font
    ws["A1"].alignment = center_align

    ws.merge_cells("A3:K3")
    ws["A3"] = "Personal & Training Info"
    ws["A3"].font = sec_font
    ws["A3"].alignment = center_align
    ws["A3"].fill = personal_fill

    ws.merge_cells("L3:N3")
    ws["L3"] = "Performance Metrics"
    ws["L3"].font = sec_font
    ws["L3"].alignment = center_align
    ws["L3"].fill = metrics_fill

    ws.merge_cells("O3:R3")
    ws["O3"] = "Attendance"
    ws["O3"].font = sec_font
    ws["O3"].alignment = center_align
    ws["O3"].fill = attendance_fill

    headers = [
        ("S.No", 6), ("Superset ID", 14), ("Name", 20), ("Registered Mail ID", 25), ("College", 22),
        ("Training", 16), ("Training Start date", 18), ("Training End date", 18), ("Trainer Name", 18),
        ("Batch No", 12), ("Training Status", 14), ("A-1", 10), ("A-2", 10), ("Final Status", 14),
        ("Total Days", 12), ("Present Days", 12), ("Absent Days", 12), ("Percentage", 12)
    ]

    for idx, (h_name, width) in enumerate(headers, 1):
        cell = ws.cell(row=4, column=idx, value=h_name)
        cell.font = bold_font
        cell.alignment = center_align
        cell.border = thin_border
        ws.column_dimensions[get_column_letter(idx)].width = width
        if idx <= 11:
            cell.fill = personal_fill
        elif idx <= 14:
            cell.fill = metrics_fill
        else:
            cell.fill = attendance_fill

    for r_idx, r in enumerate(records, 5):
        ws.cell(row=r_idx, column=1, value=r_idx - 4).alignment = center_align
        ws.cell(row=r_idx, column=2, value=r.get("supersetId", "")).alignment = center_align
        ws.cell(row=r_idx, column=3, value=r.get("name", "")).alignment = left_align
        ws.cell(row=r_idx, column=4, value=r.get("email", "")).alignment = left_align
        ws.cell(row=r_idx, column=5, value=r.get("college", "")).alignment = left_align
        ws.cell(row=r_idx, column=6, value=r.get("trainingName", "Spark Phase 2")).alignment = center_align
        ws.cell(row=r_idx, column=7, value=r.get("trainingStartDate", "")).alignment = center_align
        ws.cell(row=r_idx, column=8, value=r.get("trainingEndDate", "")).alignment = center_align
        ws.cell(row=r_idx, column=9, value=r.get("trainerName", "")).alignment = left_align
        ws.cell(row=r_idx, column=10, value=r.get("batchNo", "")).alignment = center_align
        ws.cell(row=r_idx, column=11, value=r.get("trainingStatus", "Active")).alignment = center_align
        
        ws.cell(row=r_idx, column=12, value=r.get("a1Score")).alignment = center_align
        ws.cell(row=r_idx, column=13, value=r.get("a2Score")).alignment = center_align
        ws.cell(row=r_idx, column=14, value=r.get("finalStatus", "Cleared")).alignment = center_align
        
        ws.cell(row=r_idx, column=15, value=r.get("totalDays", 0)).alignment = center_align
        ws.cell(row=r_idx, column=16, value=r.get("presentDays", 0)).alignment = center_align
        ws.cell(row=r_idx, column=17, value=r.get("absentDays", 0)).alignment = center_align
        
        pct_cell = ws.cell(row=r_idx, column=18, value=f"=IF(O{r_idx}>0, P{r_idx}/O{r_idx}, 0)")
        pct_cell.alignment = center_align
        pct_cell.number_format = '0%'

        for c_idx in range(1, 19):
            ws.cell(row=r_idx, column=c_idx).border = thin_border
            ws.cell(row=r_idx, column=c_idx).font = reg_font

    file_stream = io.BytesIO()
    wb.save(file_stream)
    file_stream.seek(0)
    
    filename = f"Spark2_Report_{batch_name.replace(' ', '_')}.xlsx"
    return StreamingResponse(
        file_stream,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )

@router.post("/spark2/{batch_id}/upload")
async def upload_spark2_sheet(batch_id: str, file: UploadFile = File(...), current_user: dict = Depends(has_role("TRAINER", "COORDINATOR", "ADMIN"))):
    db = get_db()
    contents = await file.read()
    wb = openpyxl.load_workbook(io.BytesIO(contents))
    ws = wb.active
    
    updated_count = 0
    errors = []

    for r_idx in range(5, ws.max_row + 1):
        email = ws.cell(row=r_idx, column=4).value
        if not email:
            continue
        email = str(email).strip().lower()
        
        try:
            superset_id = ws.cell(row=r_idx, column=2).value
            college = ws.cell(row=r_idx, column=5).value
            training_status = ws.cell(row=r_idx, column=11).value
            
            a1_score = ws.cell(row=r_idx, column=12).value
            a2_score = ws.cell(row=r_idx, column=13).value
            final_status = ws.cell(row=r_idx, column=14).value
            
            total_days = ws.cell(row=r_idx, column=15).value
            present_days = ws.cell(row=r_idx, column=16).value
            absent_days = ws.cell(row=r_idx, column=17).value

            def float_or_none(val):
                try: return float(val) if val is not None else None
                except: return None

            def int_or_zero(val):
                try: return int(val) if val is not None else 0
                except: return 0

            payload = {
                "superset_id": str(superset_id) if superset_id is not None else None,
                "college": str(college) if college is not None else None,
                "training_status": str(training_status) if training_status is not None else "Active",
                "a1_score": float_or_none(a1_score),
                "a2_score": float_or_none(a2_score),
                "final_status": str(final_status) if final_status is not None else "Cleared",
                "total_days": int_or_zero(total_days),
                "present_days": int_or_zero(present_days),
                "absent_days": int_or_zero(absent_days),
            }
            
            if payload["total_days"] > 0:
                payload["attendance_percentage"] = payload["present_days"] / payload["total_days"]

            db.table("spark_2_report_cards").update(payload).eq("batch_id", batch_id).eq("email", email).execute()
            updated_count += 1
        except Exception as e:
            errors.append(f"Row {r_idx} (email: {email}): {str(e)}")

    return {"updated": updated_count, "errors": errors}


# ==========================================
# Foundational Training Endpoints
# ==========================================

@router.get("/foundation/{batch_id}", response_model=List[FoundationReportCardResponse])
async def get_foundation_records(batch_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    res = db.table("foundation_report_cards").select("*").eq("batch_id", batch_id).execute()
    return [FoundationReportCardResponse(**map_db_to_api(row)) for row in res.data or []]

@router.put("/foundation/{id}", response_model=FoundationReportCardResponse)
async def update_foundation_record(id: str, payload: FoundationReportCardUpdate, current_user: dict = Depends(has_role("TRAINER", "COORDINATOR", "ADMIN"))):
    db = get_db()
    db_update = map_api_to_db(payload.model_dump(exclude_unset=True))
    res = db.table("foundation_report_cards").update(db_update).eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Record not found")
    return FoundationReportCardResponse(**map_db_to_api(res.data[0]))

@router.get("/foundation/{batch_id}/download")
async def download_foundation_sheet(batch_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    batch_res = db.table("batches").select("batch_name").eq("id", batch_id).execute()
    batch_name = batch_res.data[0]["batch_name"] if batch_res.data else "Cohort"
    
    records_res = db.table("foundation_report_cards").select("*").eq("batch_id", batch_id).execute()
    records = [map_db_to_api(r) for r in records_res.data or []]
    records.sort(key=lambda x: x.get("name", "").lower())

    wb = Workbook()
    ws = wb.active
    ws.title = "Foundational Training"
    ws.views.sheetView[0].showGridLines = True

    # Style definitions
    title_font = Font(name="Calibri", size=16, bold=True, color="8A3324")
    sec_font = Font(name="Calibri", size=11, bold=True, color="000000")
    bold_font = Font(name="Calibri", size=10, bold=True)
    reg_font = Font(name="Calibri", size=10)
    center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left_align = Alignment(horizontal="left", vertical="center")
    thin_side = Side(border_style="thin", color="D3D3D3")
    thin_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)

    # Curated fills
    brown_fill = PatternFill(start_color="EDBB99", end_color="EDBB99", fill_type="solid") # Warm Terracotta/Brown
    blue_fill = PatternFill(start_color="D6EAF8", end_color="D6EAF8", fill_type="solid")  # Pale Blue

    ws.merge_cells("A1:X1")
    ws["A1"] = "Foundational Training Report Card - " + batch_name
    ws["A1"].font = title_font
    ws["A1"].alignment = center_align

    # Span Headers
    ws.merge_cells("A3:I3")
    ws["A3"] = "Personal & Info"
    ws["A3"].font = sec_font
    ws["A3"].alignment = center_align
    ws["A3"].fill = brown_fill

    ws.merge_cells("J3:W3")
    ws["J3"] = "Grade Assessments & Scores"
    ws["J3"].font = sec_font
    ws["J3"].alignment = center_align
    ws["J3"].fill = blue_fill

    # Row 4 Detail Headers
    headers = [
        ("Superset ID", 14), ("Candidate Name", 20), ("College", 22), ("Personal Mail ID", 25), ("Contact#", 14),
        ("Foundation Programming Language", 24), ("Status", 12), ("Email Sent Date", 16), ("Reason", 16),
        ("GA 1 A1", 9), ("GA 1 A2", 9), ("GA 2 A1", 9), ("GA 2 A2", 9), ("GA 3 A1", 9), ("GA 3 A2", 9),
        ("GA 4 A1", 9), ("GA 4 A2", 9), ("GA 5 A1", 9), ("GA 5 A2", 9), ("Project A1", 11), ("Project A2", 11),
        ("Final A1", 10), ("Final A2", 10), ("Training Status", 14)
    ]

    for idx, (h_name, width) in enumerate(headers, 1):
        cell = ws.cell(row=4, column=idx, value=h_name)
        cell.font = bold_font
        cell.alignment = center_align
        cell.border = thin_border
        ws.column_dimensions[get_column_letter(idx)].width = width
        if idx <= 9:
            cell.fill = brown_fill
        else:
            cell.fill = blue_fill

    for r_idx, r in enumerate(records, 5):
        ws.cell(row=r_idx, column=1, value=r.get("supersetId", "")).alignment = center_align
        ws.cell(row=r_idx, column=2, value=r.get("name", "")).alignment = left_align
        ws.cell(row=r_idx, column=3, value=r.get("college", "")).alignment = left_align
        ws.cell(row=r_idx, column=4, value=r.get("email", "")).alignment = left_align
        ws.cell(row=r_idx, column=5, value=r.get("contactNumber", "")).alignment = center_align
        ws.cell(row=r_idx, column=6, value=r.get("foundationLanguage", "")).alignment = center_align
        ws.cell(row=r_idx, column=7, value=r.get("status", "Active")).alignment = center_align
        
        sent_date = r.get("emailSentDate")
        ws.cell(row=r_idx, column=8, value=sent_date[:10] if sent_date else "").alignment = center_align
        ws.cell(row=r_idx, column=9, value=r.get("reason", "")).alignment = left_align

        ws.cell(row=r_idx, column=10, value=r.get("ga1_a1")).alignment = center_align
        ws.cell(row=r_idx, column=11, value=r.get("ga1_a2")).alignment = center_align
        ws.cell(row=r_idx, column=12, value=r.get("ga2_a1")).alignment = center_align
        ws.cell(row=r_idx, column=13, value=r.get("ga2_a2")).alignment = center_align
        ws.cell(row=r_idx, column=14, value=r.get("ga3_a1")).alignment = center_align
        ws.cell(row=r_idx, column=15, value=r.get("ga3_a2")).alignment = center_align
        ws.cell(row=r_idx, column=16, value=r.get("ga4_a1")).alignment = center_align
        ws.cell(row=r_idx, column=17, value=r.get("ga4_a2")).alignment = center_align
        ws.cell(row=r_idx, column=18, value=r.get("ga5_a1")).alignment = center_align
        ws.cell(row=r_idx, column=19, value=r.get("ga5_a2")).alignment = center_align
        
        ws.cell(row=r_idx, column=20, value=r.get("projectEval_a1")).alignment = center_align
        ws.cell(row=r_idx, column=21, value=r.get("projectEval_a2")).alignment = center_align
        ws.cell(row=r_idx, column=22, value=r.get("finalGrade_a1")).alignment = center_align
        ws.cell(row=r_idx, column=23, value=r.get("finalGrade_a2")).alignment = center_align
        
        ws.cell(row=r_idx, column=24, value=r.get("trainingStatus", "Active")).alignment = center_align

        for c_idx in range(1, 25):
            ws.cell(row=r_idx, column=c_idx).border = thin_border
            ws.cell(row=r_idx, column=c_idx).font = reg_font

    file_stream = io.BytesIO()
    wb.save(file_stream)
    file_stream.seek(0)
    
    filename = f"Foundation_Report_{batch_name.replace(' ', '_')}.xlsx"
    return StreamingResponse(
        file_stream,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )

@router.post("/foundation/{batch_id}/upload")
async def upload_foundation_sheet(batch_id: str, file: UploadFile = File(...), current_user: dict = Depends(has_role("TRAINER", "COORDINATOR", "ADMIN"))):
    db = get_db()
    contents = await file.read()
    wb = openpyxl.load_workbook(io.BytesIO(contents))
    ws = wb.active
    
    updated_count = 0
    errors = []

    for r_idx in range(5, ws.max_row + 1):
        email = ws.cell(row=r_idx, column=4).value
        if not email:
            continue
        email = str(email).strip().lower()
        
        try:
            superset_id = ws.cell(row=r_idx, column=1).value
            college = ws.cell(row=r_idx, column=3).value
            contact_number = ws.cell(row=r_idx, column=5).value
            foundation_language = ws.cell(row=r_idx, column=6).value
            status = ws.cell(row=r_idx, column=7).value
            reason = ws.cell(row=r_idx, column=9).value

            def float_or_none(val):
                try: return float(val) if val is not None else None
                except: return None

            payload = {
                "superset_id": str(superset_id) if superset_id is not None else None,
                "college": str(college) if college is not None else None,
                "contact_number": str(contact_number) if contact_number is not None else None,
                "foundation_language": str(foundation_language) if foundation_language is not None else None,
                "status": str(status) if status is not None else "Active",
                "reason": str(reason) if reason is not None else None,
                "ga1_a1": float_or_none(ws.cell(row=r_idx, column=10).value),
                "ga1_a2": float_or_none(ws.cell(row=r_idx, column=11).value),
                "ga2_a1": float_or_none(ws.cell(row=r_idx, column=12).value),
                "ga2_a2": float_or_none(ws.cell(row=r_idx, column=13).value),
                "ga3_a1": float_or_none(ws.cell(row=r_idx, column=14).value),
                "ga3_a2": float_or_none(ws.cell(row=r_idx, column=15).value),
                "ga4_a1": float_or_none(ws.cell(row=r_idx, column=16).value),
                "ga4_a2": float_or_none(ws.cell(row=r_idx, column=17).value),
                "ga5_a1": float_or_none(ws.cell(row=r_idx, column=18).value),
                "ga5_a2": float_or_none(ws.cell(row=r_idx, column=19).value),
                "project_eval_a1": float_or_none(ws.cell(row=r_idx, column=20).value),
                "project_eval_a2": float_or_none(ws.cell(row=r_idx, column=21).value),
                "final_grade_a1": float_or_none(ws.cell(row=r_idx, column=22).value),
                "final_grade_a2": float_or_none(ws.cell(row=r_idx, column=23).value),
                "training_status": str(ws.cell(row=r_idx, column=24).value or "Active")
            }

            # Handle email sent date parse
            sent_date_raw = ws.cell(row=r_idx, column=8).value
            if sent_date_raw:
                try:
                    payload["email_sent_date"] = datetime.strptime(str(sent_date_raw), "%Y-%m-%d").isoformat()
                except:
                    try:
                        payload["email_sent_date"] = datetime.fromisoformat(str(sent_date_raw).replace('Z', '+00:00')).isoformat()
                    except:
                        pass

            db.table("foundation_report_cards").update(payload).eq("batch_id", batch_id).eq("email", email).execute()
            updated_count += 1
        except Exception as e:
            errors.append(f"Row {r_idx} (email: {email}): {str(e)}")

    return {"updated": updated_count, "errors": errors}


# ==========================================
# Stream Based Training Endpoints
# ==========================================

@router.get("/stream/{batch_id}", response_model=List[StreamReportCardResponse])
async def get_stream_records(batch_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    res = db.table("stream_report_cards").select("*").eq("batch_id", batch_id).execute()
    return [StreamReportCardResponse(**map_db_to_api(row)) for row in res.data or []]

@router.put("/stream/{id}", response_model=StreamReportCardResponse)
async def update_stream_record(id: str, payload: StreamReportCardUpdate, current_user: dict = Depends(has_role("TRAINER", "COORDINATOR", "ADMIN"))):
    db = get_db()
    db_update = map_api_to_db(payload.model_dump(exclude_unset=True))
    res = db.table("stream_report_cards").update(db_update).eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Record not found")
    return StreamReportCardResponse(**map_db_to_api(res.data[0]))

@router.get("/stream/{batch_id}/download")
async def download_stream_sheet(batch_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    batch_res = db.table("batches").select("batch_name").eq("id", batch_id).execute()
    batch_name = batch_res.data[0]["batch_name"] if batch_res.data else "Cohort"
    
    records_res = db.table("stream_report_cards").select("*").eq("batch_id", batch_id).execute()
    records = [map_db_to_api(r) for r in records_res.data or []]
    records.sort(key=lambda x: x.get("name", "").lower())

    wb = Workbook()
    ws = wb.active
    ws.title = "Stream Based Training"
    ws.views.sheetView[0].showGridLines = True

    # Styling helper variables
    title_font = Font(name="Calibri", size=16, bold=True, color="2C3E50")
    sec_font = Font(name="Calibri", size=11, bold=True, color="000000")
    bold_font = Font(name="Calibri", size=9, bold=True)
    reg_font = Font(name="Calibri", size=9)
    center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left_align = Alignment(horizontal="left", vertical="center")
    thin_side = Side(border_style="thin", color="D3D3D3")
    thin_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)

    # curating gorgeous HSL fits
    info_fill = PatternFill(start_color="F5EEF8", end_color="F5EEF8", fill_type="solid") # Info/Personal
    mcq_fill = PatternFill(start_color="FADBD8", end_color="FADBD8", fill_type="solid")  # MCQ metrics
    coding_fill = PatternFill(start_color="D5F5E3", end_color="D5F5E3", fill_type="solid") # Coding metrics
    proj_fill = PatternFill(start_color="D6EAF8", end_color="D6EAF8", fill_type="solid") # Project metrics
    att_fill = PatternFill(start_color="FCF3CF", end_color="FCF3CF", fill_type="solid") # Attendance

    # Title row
    ws.merge_cells("A1:AK1")
    ws["A1"] = "Stream Based Training Report Card - " + batch_name
    ws["A1"].font = title_font
    ws["A1"].alignment = center_align

    # Span Headers Row 3
    ws.merge_cells("A3:N3")
    ws["A3"] = "Personal & Training Info"
    ws["A3"].font = sec_font
    ws["A3"].alignment = center_align
    ws["A3"].fill = info_fill

    ws.merge_cells("O3:AC3")
    ws["O3"] = "Performance Metrics"
    ws["O3"].font = sec_font
    ws["O3"].alignment = center_align
    ws["O3"].fill = coding_fill

    ws.merge_cells("AD3:AD3")
    ws["AD3"] = "Status"
    ws["AD3"].font = sec_font
    ws["AD3"].alignment = center_align
    ws["AD3"].fill = proj_fill

    ws.merge_cells("AE3:AE3")
    ws["AE3"] = "Comments"
    ws["AE3"].font = sec_font
    ws["AE3"].alignment = center_align
    ws["AE3"].fill = proj_fill

    ws.merge_cells("AF3:AK3")
    ws["AF3"] = "Attendance"
    ws["AF3"].font = sec_font
    ws["AF3"].alignment = center_align
    ws["AF3"].fill = att_fill

    # Row 4 details headers
    headers = [
        ("S.No", 6), ("DOJ", 12), ("Superset ID", 12), ("Emp ID", 10), ("Name", 18),
        ("Registered Mail ID", 22), ("College", 18), ("Foundation Language", 16),
        ("Stream Training", 18), ("Training Start date", 15), ("Training End date", 15),
        ("Trainer Name", 16), ("Batch No", 10), ("Training Status", 12),
        # MCQs (A1, A2 merged in headers later, for simplicity writing names)
        ("MCQ 1", 8), ("MCQ 2", 8), ("MCQ 3", 8), ("MCQ 4", 8), ("MCQ 5", 8), ("MCQ 6", 8), ("MCQ 7", 8),
        # Coding
        ("Coding 1", 9), ("Coding 2", 9), ("Coding 3", 9), ("Coding 4", 9), ("Coding 5", 9), ("Coding 6", 9), ("Coding 7", 9),
        # Projects & Online Coding
        ("Project 1", 10), ("Project 2", 10), ("Online Coding", 12),
        ("Final Status", 12), ("Comment / Reason", 20),
        # Attendance
        ("Total Days", 10), ("Present Days", 10), ("Absent Days", 10), ("Percentage", 10)
    ]

    # In Stream based training, each MCQ/Coding/Project score column actually has subcolumns for A-1 and A-2.
    # To fit this nicely, let's create a double row header for Row 4 & 5 for scores.
    # However, to keep it clean and match the CSV upload/parsing logic, we will create explicit columns:
    # MCQ-1 A-1, MCQ-1 A-2, MCQ-2 A-1, etc.
    
    # Let's map exactly how columns are laid out in Row 4 & Row 5:
    # Columns 1 to 14: Personal Info
    # Columns 15 to 28: MCQ-1 A-1/A-2 to MCQ-7 A-1/A-2
    # Columns 29 to 42: Coding-1 A-1/A-2 to Coding-7 A-1/A-2
    # Columns 43 to 46: Project-1 A-1/A-2, Project-2 A-1/A-2
    # Columns 47, 48: Online Coding A-1/A-2
    # Column 49: Final Status
    # Column 50: Comment / Reason
    # Columns 51 to 54: Attendance Info
    
    # Let's re-merge row 3 accordingly:
    ws.merge_cells("A3:N3")  # Personal & Training Info (14 columns)
    ws.merge_cells("O3:BB3") # Performance Metrics (mcq=14, coding=14, proj=4, online_coding=2 -> 34 columns)
    ws.merge_cells("BC3:BC3") # Final Status
    ws.merge_cells("BD3:BD3") # Comment / Reason
    ws.merge_cells("BE3:BH3") # Attendance (4 columns)

    ws["A3"] = "Personal & Training Info"
    ws["A3"].fill = info_fill
    ws["O3"] = "Performance Metrics"
    ws["O3"].fill = coding_fill
    ws["BC3"] = "Status"
    ws["BC3"].fill = proj_fill
    ws["BD3"] = "Reasoning"
    ws["BD3"].fill = proj_fill
    ws["BE3"] = "Attendance"
    ws["BE3"].fill = att_fill

    for cell_addr in ["A3", "O3", "BC3", "BD3", "BE3"]:
        ws[cell_addr].font = sec_font
        ws[cell_addr].alignment = center_align

    # Column Titles row 4
    col_idx = 1
    # Personal Info headers
    p_headers = [
        ("S.No", 6), ("DOJ", 12), ("Superset ID", 12), ("Emp ID", 10), ("Name", 18),
        ("Registered Mail ID", 22), ("College", 18), ("Foundation Language", 16),
        ("Stream Training", 18), ("Training Start date", 15), ("Training End date", 15),
        ("Trainer Name", 16), ("Batch No", 10), ("Training Status", 12)
    ]
    for h_name, w in p_headers:
        ws.merge_cells(start_row=4, start_column=col_idx, end_row=5, end_column=col_idx)
        cell = ws.cell(row=4, column=col_idx, value=h_name)
        cell.fill = info_fill
        ws.column_dimensions[get_column_letter(col_idx)].width = w
        col_idx += 1

    # MCQ 1-7 A-1/A-2
    for i in range(1, 8):
        ws.merge_cells(start_row=4, start_column=col_idx, end_row=4, end_column=col_idx + 1)
        ws.cell(row=4, column=col_idx, value=f"MCQ-{i}").fill = mcq_fill
        ws.cell(row=5, column=col_idx, value="A-1").fill = mcq_fill
        ws.cell(row=5, column=col_idx + 1, value="A-2").fill = mcq_fill
        ws.column_dimensions[get_column_letter(col_idx)].width = 7
        ws.column_dimensions[get_column_letter(col_idx + 1)].width = 7
        col_idx += 2

    # Coding 1-7 A-1/A-2
    for i in range(1, 8):
        ws.merge_cells(start_row=4, start_column=col_idx, end_row=4, end_column=col_idx + 1)
        ws.cell(row=4, column=col_idx, value=f"Coding-{i}").fill = coding_fill
        ws.cell(row=5, column=col_idx, value="A-1").fill = coding_fill
        ws.cell(row=5, column=col_idx + 1, value="A-2").fill = coding_fill
        ws.column_dimensions[get_column_letter(col_idx)].width = 8
        ws.column_dimensions[get_column_letter(col_idx + 1)].width = 8
        col_idx += 2

    # Projects
    for i in range(1, 3):
        ws.merge_cells(start_row=4, start_column=col_idx, end_row=4, end_column=col_idx + 1)
        ws.cell(row=4, column=col_idx, value=f"Proj Score-{i}").fill = proj_fill
        ws.cell(row=5, column=col_idx, value="A-1").fill = proj_fill
        ws.cell(row=5, column=col_idx + 1, value="A-2").fill = proj_fill
        ws.column_dimensions[get_column_letter(col_idx)].width = 10
        ws.column_dimensions[get_column_letter(col_idx + 1)].width = 10
        col_idx += 2

    # Online Coding
    ws.merge_cells(start_row=4, start_column=col_idx, end_row=4, end_column=col_idx + 1)
    ws.cell(row=4, column=col_idx, value="Online Coding").fill = proj_fill
    ws.cell(row=5, column=col_idx, value="A-1").fill = proj_fill
    ws.cell(row=5, column=col_idx + 1, value="A-2").fill = proj_fill
    ws.column_dimensions[get_column_letter(col_idx)].width = 11
    ws.column_dimensions[get_column_letter(col_idx + 1)].width = 11
    col_idx += 2

    # Final Status & Comments
    ws.merge_cells(start_row=4, start_column=col_idx, end_row=5, end_column=col_idx)
    ws.cell(row=4, column=col_idx, value="Final Status").fill = proj_fill
    ws.column_dimensions[get_column_letter(col_idx)].width = 14
    col_idx += 1

    ws.merge_cells(start_row=4, start_column=col_idx, end_row=5, end_column=col_idx)
    ws.cell(row=4, column=col_idx, value="Comment / Reason").fill = proj_fill
    ws.column_dimensions[get_column_letter(col_idx)].width = 22
    col_idx += 1

    # Attendance
    a_headers = [
        ("Total No of days", 12), ("Total Present days", 12), ("Absent days", 12), ("Percentage", 12)
    ]
    for h_name, w in a_headers:
        ws.merge_cells(start_row=4, start_column=col_idx, end_row=5, end_column=col_idx)
        cell = ws.cell(row=4, column=col_idx, value=h_name)
        cell.fill = att_fill
        ws.column_dimensions[get_column_letter(col_idx)].width = w
        col_idx += 1

    # Apply fonts/alignments to all header cells
    for r in [4, 5]:
        for c in range(1, col_idx):
            cell = ws.cell(row=r, column=c)
            cell.font = bold_font
            cell.alignment = center_align
            cell.border = thin_border

    # Fill data rows starting at row 6
    for r_idx, r in enumerate(records, 6):
        ws.cell(row=r_idx, column=1, value=r_idx - 5).alignment = center_align
        
        doj = r.get("doj")
        ws.cell(row=r_idx, column=2, value=doj[:10] if doj else "").alignment = center_align
        ws.cell(row=r_idx, column=3, value=r.get("supersetId", "")).alignment = center_align
        ws.cell(row=r_idx, column=4, value=r.get("empId", "")).alignment = center_align
        ws.cell(row=r_idx, column=5, value=r.get("name", "")).alignment = left_align
        ws.cell(row=r_idx, column=6, value=r.get("email", "")).alignment = left_align
        ws.cell(row=r_idx, column=7, value=r.get("college", "")).alignment = left_align
        ws.cell(row=r_idx, column=8, value=r.get("foundationLanguage", "")).alignment = center_align
        ws.cell(row=r_idx, column=9, value=r.get("streamTraining", "")).alignment = center_align
        ws.cell(row=r_idx, column=10, value=r.get("trainingStartDate", "")).alignment = center_align
        ws.cell(row=r_idx, column=11, value=r.get("trainingEndDate", "")).alignment = center_align
        ws.cell(row=r_idx, column=12, value=r.get("trainerName", "")).alignment = left_align
        ws.cell(row=r_idx, column=13, value=r.get("batchNo", "")).alignment = center_align
        ws.cell(row=r_idx, column=14, value=r.get("trainingStatus", "Active")).alignment = center_align

        # Scores MCQ 1-7 A-1/A-2
        c_score = 15
        for i in range(1, 8):
            ws.cell(row=r_idx, column=c_score, value=r.get(f"mcq{i}_a1")).alignment = center_align
            ws.cell(row=r_idx, column=c_score + 1, value=r.get(f"mcq{i}_a2")).alignment = center_align
            c_score += 2

        # Coding 1-7 A-1/A-2
        for i in range(1, 8):
            ws.cell(row=r_idx, column=c_score, value=r.get(f"coding{i}_a1")).alignment = center_align
            ws.cell(row=r_idx, column=c_score + 1, value=r.get(f"coding{i}_a2")).alignment = center_align
            c_score += 2

        # Projects
        ws.cell(row=r_idx, column=c_score, value=r.get("projectScore1_a1")).alignment = center_align
        ws.cell(row=r_idx, column=c_score + 1, value=r.get("projectScore1_a2")).alignment = center_align
        ws.cell(row=r_idx, column=c_score + 2, value=r.get("projectScore2_a1")).alignment = center_align
        ws.cell(row=r_idx, column=c_score + 3, value=r.get("projectScore2_a2")).alignment = center_align
        c_score += 4

        # Online Coding
        ws.cell(row=r_idx, column=c_score, value=r.get("onlineCoding_a1")).alignment = center_align
        ws.cell(row=r_idx, column=c_score + 1, value=r.get("onlineCoding_a2")).alignment = center_align
        c_score += 2

        # Final Status & Comments
        ws.cell(row=r_idx, column=c_score, value=r.get("finalStatus", "Cleared")).alignment = center_align
        c_score += 1
        ws.cell(row=r_idx, column=c_score, value=r.get("commentReason", "")).alignment = left_align
        c_score += 1

        # Attendance
        ws.cell(row=r_idx, column=c_score, value=r.get("totalDays", 0)).alignment = center_align
        ws.cell(row=r_idx, column=c_score + 1, value=r.get("presentDays", 0)).alignment = center_align
        ws.cell(row=r_idx, column=c_score + 2, value=r.get("absentDays", 0)).alignment = center_align
        
        pct_cell = ws.cell(row=r_idx, column=c_score + 3, value=f"=IF({get_column_letter(c_score)}{r_idx}>0, {get_column_letter(c_score+1)}{r_idx}/{get_column_letter(c_score)}{r_idx}, 0)")
        pct_cell.alignment = center_align
        pct_cell.number_format = '0%'

        for c_idx in range(1, col_idx):
            ws.cell(row=r_idx, column=c_idx).border = thin_border
            ws.cell(row=r_idx, column=c_idx).font = reg_font

    file_stream = io.BytesIO()
    wb.save(file_stream)
    file_stream.seek(0)
    
    filename = f"Stream_Report_{batch_name.replace(' ', '_')}.xlsx"
    return StreamingResponse(
        file_stream,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )

@router.post("/stream/{batch_id}/upload")
async def upload_stream_sheet(batch_id: str, file: UploadFile = File(...), current_user: dict = Depends(has_role("TRAINER", "COORDINATOR", "ADMIN"))):
    db = get_db()
    contents = await file.read()
    wb = openpyxl.load_workbook(io.BytesIO(contents))
    ws = wb.active
    
    updated_count = 0
    errors = []

    # Columns index references (derived from layout above)
    # col 5: Name, col 6: Registered Mail ID
    for r_idx in range(6, ws.max_row + 1):
        email = ws.cell(row=r_idx, column=6).value
        if not email:
            continue
        email = str(email).strip().lower()
        
        try:
            superset_id = ws.cell(row=r_idx, column=3).value
            emp_id = ws.cell(row=r_idx, column=4).value
            college = ws.cell(row=r_idx, column=7).value
            foundation_language = ws.cell(row=r_idx, column=8).value
            stream_training = ws.cell(row=r_idx, column=9).value
            training_status = ws.cell(row=r_idx, column=14).value

            def float_or_none(val):
                try: return float(val) if val is not None else None
                except: return None

            def int_or_zero(val):
                try: return int(val) if val is not None else 0
                except: return 0

            # Score extraction starts at column 15
            payload = {
                "superset_id": str(superset_id) if superset_id is not None else None,
                "emp_id": str(emp_id) if emp_id is not None else None,
                "college": str(college) if college is not None else None,
                "foundation_language": str(foundation_language) if foundation_language is not None else None,
                "stream_training": str(stream_training) if stream_training is not None else None,
                "training_status": str(training_status) if training_status is not None else "Active",
            }

            # MCQ 1-7 A-1/A-2
            c_score = 15
            for i in range(1, 8):
                payload[f"mcq{i}_a1"] = float_or_none(ws.cell(row=r_idx, column=c_score).value)
                payload[f"mcq{i}_a2"] = float_or_none(ws.cell(row=r_idx, column=c_score + 1).value)
                c_score += 2

            # Coding 1-7 A-1/A-2
            for i in range(1, 8):
                payload[f"coding{i}_a1"] = float_or_none(ws.cell(row=r_idx, column=c_score).value)
                payload[f"coding{i}_a2"] = float_or_none(ws.cell(row=r_idx, column=c_score + 1).value)
                c_score += 2

            # Projects
            payload["project_score1_a1"] = float_or_none(ws.cell(row=r_idx, column=c_score).value)
            payload["project_score1_a2"] = float_or_none(ws.cell(row=r_idx, column=c_score + 1).value)
            payload["project_score2_a1"] = float_or_none(ws.cell(row=r_idx, column=c_score + 2).value)
            payload["project_score2_a2"] = float_or_none(ws.cell(row=r_idx, column=c_score + 3).value)
            c_score += 4

            # Online Coding
            payload["online_coding_a1"] = float_or_none(ws.cell(row=r_idx, column=c_score).value)
            payload["online_coding_a2"] = float_or_none(ws.cell(row=r_idx, column=c_score + 1).value)
            c_score += 2

            # Final Status & Comments
            payload["final_status"] = str(ws.cell(row=r_idx, column=c_score).value or "Cleared")
            c_score += 1
            payload["comment_reason"] = str(ws.cell(row=r_idx, column=c_score).value or "")
            c_score += 1

            # Attendance
            payload["total_days"] = int_or_zero(ws.cell(row=r_idx, column=c_score).value)
            payload["present_days"] = int_or_zero(ws.cell(row=r_idx, column=c_score + 1).value)
            payload["absent_days"] = int_or_zero(ws.cell(row=r_idx, column=c_score + 2).value)

            if payload["total_days"] > 0:
                payload["attendance_percentage"] = payload["present_days"] / payload["total_days"]

            # Handle DOJ parse
            doj_raw = ws.cell(row=r_idx, column=2).value
            if doj_raw:
                try:
                    payload["doj"] = datetime.strptime(str(doj_raw), "%Y-%m-%d").isoformat()
                except:
                    try:
                        payload["doj"] = datetime.fromisoformat(str(doj_raw).replace('Z', '+00:00')).isoformat()
                    except:
                        pass

            db.table("stream_report_cards").update(payload).eq("batch_id", batch_id).eq("email", email).execute()
            updated_count += 1
        except Exception as e:
            errors.append(f"Row {r_idx} (email: {email}): {str(e)}")

    return {"updated": updated_count, "errors": errors}
