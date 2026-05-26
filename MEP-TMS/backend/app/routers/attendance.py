from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from typing import List
from datetime import datetime, date as date_type
from app.schemas.schemas import (
    AttendanceCreate, AttendanceUpdate, AttendanceResponse,
    AttendanceBatchResponse
)
from app.core.database import get_db
from app.core.security import get_current_user, has_role
from app.models.models import Attendance, AttendanceStatus, row_to_api
import csv
import io

router = APIRouter(prefix="/api/attendance", tags=["attendance"])

@router.post("/mark", response_model=AttendanceResponse)
async def mark_attendance(attendance_data: AttendanceCreate, current_user: dict = Depends(has_role("TRAINER", "COORDINATOR", "TRAINEE"))):
    """Mark attendance for a candidate"""
    db = get_db()
    
    if current_user.get("role") == "TRAINEE":
        cand_res = db.table("candidates").select("id").eq("email", current_user.get("email").strip().lower()).execute()
        cand_ids = {c.get("id") for c in cand_res.data} if cand_res.data else set()
        if not cand_res.data or (attendance_data.candidateId not in cand_ids and "cand-mock-id" != attendance_data.candidateId):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Trainees can only mark their own attendance")
            
    try:
        # Check if attendance already marked for today
        today_start = datetime.combine(date_type.today(), datetime.min.time()).isoformat()
        today_end = datetime.combine(date_type.today(), datetime.max.time()).isoformat()
        
        existing = db.table("attendances").select("*") \
            .eq("batch_id", attendance_data.batchId) \
            .eq("candidate_id", attendance_data.candidateId) \
            .gte("date", today_start) \
            .lt("date", today_end) \
            .execute()
        
        if existing.data:
            # Update existing attendance
            record = existing.data[0]
            result = db.table("attendances").update({
                "status": attendance_data.status.value,
                "version": record.get("version", 1) + 1
            }).eq("id", record["id"]).execute()
            
            if not result.data:
                raise HTTPException(status_code=500, detail="Failed to update attendance")
            
            return AttendanceResponse(**row_to_api(result.data[0]))
        
        # Create new attendance record
        attendance = Attendance(
            batchId=attendance_data.batchId,
            candidateId=attendance_data.candidateId,
            date=attendance_data.date,
            status=attendance_data.status
        )
        
        result = db.table("attendances").insert(attendance.to_dict()).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to mark attendance")
        
        ret_val = AttendanceResponse(**row_to_api(result.data[0]))

        # Log ATTENDANCE_UPLOAD if marked by Trainer
        if current_user.get("role") == "TRAINER":
            try:
                batch_res = db.table("batches").select("batch_name").eq("id", attendance_data.batchId).execute()
                batch_name = batch_res.data[0]["batch_name"] if batch_res.data else "Unknown"
                db.table("notifications").insert({
                    "type": "ATTENDANCE_UPLOAD",
                    "message": f"Trainer {current_user.get('fullName', 'Trainer')} marked/updated attendance for Batch '{batch_name}'.",
                    "is_read": False,
                    "created_at": datetime.utcnow().isoformat()
                }).execute()
            except Exception as notif_err:
                print(f"[Warn] Failed to create ATTENDANCE_UPLOAD notification: {notif_err}")

        return ret_val
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/bulk-upload")
async def bulk_upload_attendance(
    batch_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(has_role("COORDINATOR"))
):
    """Bulk upload attendance from CSV"""
    db = get_db()
    
    try:
        # Read CSV file
        contents = await file.read()
        reader = csv.DictReader(io.StringIO(contents.decode('utf-8')))
        
        uploaded_count = 0
        errors = []
        
        for row_num, row in enumerate(reader, start=2):
            try:
                candidate_id = row.get("candidateId")
                attendance_date = datetime.fromisoformat(row.get("date"))
                att_status = row.get("status").upper()
                
                if att_status not in ["PRESENT", "ABSENT", "LEAVE"]:
                    errors.append(f"Row {row_num}: Invalid status '{att_status}'")
                    continue
                
                attendance = Attendance(
                    batchId=batch_id,
                    candidateId=candidate_id,
                    date=attendance_date,
                    status=AttendanceStatus[att_status]
                )
                
                db.table("attendances").insert(attendance.to_dict()).execute()
                uploaded_count += 1
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        return {
            "uploaded": uploaded_count,
            "errors": errors
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/candidate/{candidate_id}", response_model=List[AttendanceResponse])
async def get_candidate_attendance(
    candidate_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get attendance records for a candidate"""
    db = get_db()
    
    try:
        result = db.table("attendances").select("*").eq("candidate_id", candidate_id).execute()
        return [AttendanceResponse(**row_to_api(att)) for att in result.data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/batch/{batch_id}/sheet")
async def get_batch_attendance_sheet(batch_id: str, current_user: dict = Depends(get_current_user)):
    """Generate and download the Excel attendance sheet for a batch"""
    db = get_db()
    
    if current_user.get("role") not in ["TRAINER", "COORDINATOR", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized to access attendance sheets")
        
    try:
        batch_res = db.table("batches").select("*").eq("id", batch_id).execute()
        if not batch_res.data:
            batch_res = db.table("batches").select("*").eq("batch_id", batch_id).execute()
            if not batch_res.data:
                raise HTTPException(status_code=404, detail="Batch not found")
                
        batch_data = row_to_api(batch_res.data[0])
        batch_uuid = batch_res.data[0]["id"]
        
        session_dates = batch_data.get("sessionDates", [])
        if not session_dates:
            from datetime import datetime as datetime_cls
            from datetime import timedelta
            start_dt = datetime_cls.fromisoformat(batch_data["startDate"].replace('Z', '+00:00')) if isinstance(batch_data["startDate"], str) else batch_data["startDate"]
            end_dt = datetime_cls.fromisoformat(batch_data["endDate"].replace('Z', '+00:00')) if isinstance(batch_data["endDate"], str) else batch_data["endDate"]
            
            curr = start_dt
            while curr <= end_dt:
                if curr.weekday() < 5:
                    session_dates.append(curr.strftime("%Y-%m-%d"))
                curr += timedelta(days=1)
                
        cand_res = db.table("candidates").select("*").eq("batch_id", batch_uuid).execute()
        candidates = [row_to_api(c) for c in cand_res.data]
        candidates.sort(key=lambda x: x.get("fullName", "").lower())
        
        att_res = db.table("attendances").select("*").eq("batch_id", batch_uuid).execute()
        attendances = [row_to_api(a) for a in att_res.data]
        
        att_map = {}
        for att in attendances:
            cand_id = att.get("candidateId")
            try:
                date_str = datetime.fromisoformat(att.get("date").replace('Z', '+00:00')).strftime("%Y-%m-%d")
                att_map[(cand_id, date_str)] = att.get("status")
            except Exception:
                pass
                
        from openpyxl import Workbook
        from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
        from openpyxl.utils import get_column_letter
        from fastapi.responses import StreamingResponse
        import io
        
        wb = Workbook()
        ws = wb.active
        ws.title = "Attendance"
        ws.views.sheetView[0].showGridLines = True
        
        title_font = Font(name="Calibri", size=16, bold=True, color="1F497D")
        header_font = Font(name="Calibri", size=11, bold=True, color="000000")
        bold_font = Font(name="Calibri", size=11, bold=True)
        regular_font = Font(name="Calibri", size=11)
        
        center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
        left_align = Alignment(horizontal="left", vertical="center")
        
        thin_side = Side(border_style="thin", color="D3D3D3")
        thin_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
        
        name_email_fill = PatternFill(start_color="FADBD8", end_color="FADBD8", fill_type="solid")
        stat_label_fill = PatternFill(start_color="FAD0C4", end_color="FAD0C4", fill_type="solid")
        stat_header_fill = PatternFill(start_color="E5E7E9", end_color="E5E7E9", fill_type="solid")
        present_cell_fill = PatternFill(start_color="D4EFDF", end_color="D4EFDF", fill_type="solid")
        absent_cell_fill = PatternFill(start_color="FADBD8", end_color="FADBD8", fill_type="solid")
        leave_cell_fill = PatternFill(start_color="FCF3CF", end_color="FCF3CF", fill_type="solid")
        
        headers = [
            ("Sr no", 8),
            ("Name", 24),
            ("Email ID", 28),
            ("Total No of Training Connects (Planned)", 18),
            ("Total Days completed", 14),
            ("Remaining Training Days", 14),
            ("# Training Days Conducted", 14),
            ("# Training Days attended", 14),
            ("Attendance %", 14)
        ]
        
        ws.merge_cells("A1:I3")
        title_cell = ws["A1"]
        title_cell.value = "Attendance Tracker - " + batch_data.get("batchName", "Cohort")
        title_cell.font = title_font
        title_cell.alignment = center_align
        
        for r in range(1, 4):
            for c in range(1, 10):
                ws.cell(row=r, column=c).border = thin_border
                
        num_candidates = len(candidates)
        start_row_cand = 5
        end_row_cand = start_row_cand + num_candidates - 1
        
        for idx, date_str in enumerate(session_dates):
            col_idx = 10 + idx
            col_letter = get_column_letter(col_idx)
            
            ws.cell(row=1, column=col_idx, value=f'=COUNTIF({col_letter}{start_row_cand}:{col_letter}{end_row_cand}, "P")')
            ws.cell(row=1, column=col_idx).font = bold_font
            ws.cell(row=1, column=col_idx).alignment = center_align
            ws.cell(row=1, column=col_idx).border = thin_border
            ws.cell(row=1, column=col_idx).fill = stat_header_fill
            
            ws.cell(row=2, column=col_idx, value=f'=COUNTIF({col_letter}{start_row_cand}:{col_letter}{end_row_cand}, "A")')
            ws.cell(row=2, column=col_idx).font = bold_font
            ws.cell(row=2, column=col_idx).alignment = center_align
            ws.cell(row=2, column=col_idx).border = thin_border
            ws.cell(row=2, column=col_idx).fill = stat_header_fill
            
            ws.cell(row=3, column=col_idx, value=f'=IF((COUNTIF({col_letter}{start_row_cand}:{col_letter}{end_row_cand}, "P")+COUNTIF({col_letter}{start_row_cand}:{col_letter}{end_row_cand}, "A"))>0, COUNTIF({col_letter}{start_row_cand}:{col_letter}{end_row_cand}, "P")/(COUNTIF({col_letter}{start_row_cand}:{col_letter}{end_row_cand}, "P")+COUNTIF({col_letter}{start_row_cand}:{col_letter}{end_row_cand}, "A")), 0)')
            ws.cell(row=3, column=col_idx).font = bold_font
            ws.cell(row=3, column=col_idx).alignment = center_align
            ws.cell(row=3, column=col_idx).border = thin_border
            ws.cell(row=3, column=col_idx).number_format = '0%'
            ws.cell(row=3, column=col_idx).fill = stat_header_fill
            
        for col_idx, (header_text, width) in enumerate(headers, 1):
            cell = ws.cell(row=4, column=col_idx, value=header_text)
            cell.font = header_font
            cell.alignment = center_align
            cell.border = thin_border
            ws.column_dimensions[get_column_letter(col_idx)].width = width
            if col_idx in [1, 2, 3]:
                cell.fill = name_email_fill
            else:
                cell.fill = stat_label_fill
                
        session_colors = [
            PatternFill(start_color="D6EAF8", end_color="D6EAF8", fill_type="solid"),
            PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid"),
            PatternFill(start_color="FCF3CF", end_color="FCF3CF", fill_type="solid"),
            PatternFill(start_color="D4EFDF", end_color="D4EFDF", fill_type="solid"),
            PatternFill(start_color="EBDEF0", end_color="EBDEF0", fill_type="solid"),
        ]
        
        for idx, date_str in enumerate(session_dates):
            col_idx = 10 + idx
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            formatted_date = dt.strftime("%m-%d-%y")
            
            cell = ws.cell(row=4, column=col_idx, value=formatted_date)
            cell.font = header_font
            cell.alignment = center_align
            cell.border = thin_border
            cell.fill = session_colors[idx % len(session_colors)]
            ws.column_dimensions[get_column_letter(col_idx)].width = 12
            
        last_col_letter = get_column_letter(10 + len(session_dates) - 1) if session_dates else "I"
        
        for r_idx, trainee in enumerate(candidates, start_row_cand):
            trainee_id = trainee.get("id")
            
            cell = ws.cell(row=r_idx, column=1, value=r_idx - start_row_cand + 1)
            cell.font = regular_font
            cell.alignment = center_align
            cell.border = thin_border
            
            cell = ws.cell(row=r_idx, column=2, value=trainee.get("fullName"))
            cell.font = regular_font
            cell.alignment = left_align
            cell.border = thin_border
            
            cell = ws.cell(row=r_idx, column=3, value=trainee.get("email"))
            cell.font = regular_font
            cell.alignment = left_align
            cell.border = thin_border
            
            ws.cell(row=r_idx, column=4, value=f'=COUNTA(J{r_idx}:{last_col_letter}{r_idx})' if session_dates else 0)
            ws.cell(row=r_idx, column=4).font = bold_font
            ws.cell(row=r_idx, column=4).alignment = center_align
            ws.cell(row=r_idx, column=4).border = thin_border
            
            ws.cell(row=r_idx, column=5, value=f'=COUNTIF(J{r_idx}:{last_col_letter}{r_idx}, "P")+COUNTIF(J{r_idx}:{last_col_letter}{r_idx}, "A")+COUNTIF(J{r_idx}:{last_col_letter}{r_idx}, "L")' if session_dates else 0)
            ws.cell(row=r_idx, column=5).font = regular_font
            ws.cell(row=r_idx, column=5).alignment = center_align
            ws.cell(row=r_idx, column=5).border = thin_border
            
            ws.cell(row=r_idx, column=6, value=f'=D{r_idx}-E{r_idx}')
            ws.cell(row=r_idx, column=6).font = regular_font
            ws.cell(row=r_idx, column=6).alignment = center_align
            ws.cell(row=r_idx, column=6).border = thin_border
            
            ws.cell(row=r_idx, column=7, value=f'=E{r_idx}')
            ws.cell(row=r_idx, column=7).font = regular_font
            ws.cell(row=r_idx, column=7).alignment = center_align
            ws.cell(row=r_idx, column=7).border = thin_border
            
            ws.cell(row=r_idx, column=8, value=f'=COUNTIF(J{r_idx}:{last_col_letter}{r_idx}, "P")' if session_dates else 0)
            ws.cell(row=r_idx, column=8).font = regular_font
            ws.cell(row=r_idx, column=8).alignment = center_align
            ws.cell(row=r_idx, column=8).border = thin_border
            
            ws.cell(row=r_idx, column=9, value=f'=IF(G{r_idx}>0, H{r_idx}/G{r_idx}, 0)')
            ws.cell(row=r_idx, column=9).font = bold_font
            ws.cell(row=r_idx, column=9).alignment = center_align
            ws.cell(row=r_idx, column=9).border = thin_border
            ws.cell(row=r_idx, column=9).number_format = '0%'
            
            for idx, date_str in enumerate(session_dates):
                col_idx = 10 + idx
                status_raw = att_map.get((trainee_id, date_str))
                
                val = ""
                cell_fill = None
                if status_raw == "PRESENT":
                    val = "P"
                    cell_fill = present_cell_fill
                elif status_raw == "ABSENT":
                    val = "A"
                    cell_fill = absent_cell_fill
                elif status_raw == "LEAVE":
                    val = "L"
                    cell_fill = leave_cell_fill
                else:
                    from datetime import date as date_cls
                    today_str = date_cls.today().strftime("%Y-%m-%d")
                    if date_str < today_str:
                        val = "A"
                        cell_fill = absent_cell_fill
                        
                cell = ws.cell(row=r_idx, column=col_idx, value=val)
                cell.font = regular_font
                cell.alignment = center_align
                cell.border = thin_border
                if cell_fill:
                    cell.fill = cell_fill
                    
        file_stream = io.BytesIO()
        wb.save(file_stream)
        file_stream.seek(0)
        
        filename = f"Attendance_Sheet_{batch_data.get('batchName', 'Batch').replace(' ', '_')}.xlsx"
        headers = {
            'Content-Disposition': f'attachment; filename="{filename}"'
        }
        return StreamingResponse(
            file_stream,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers=headers
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/batch/{batch_id}", response_model=List[AttendanceResponse])
async def get_batch_attendance(
    batch_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all attendance records for a batch"""
    db = get_db()
    
    try:
        result = db.table("attendances").select("*").eq("batch_id", batch_id).execute()
        return [AttendanceResponse(**row_to_api(att)) for att in result.data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{attendance_id}", response_model=AttendanceResponse)
async def update_attendance(
    attendance_id: str,
    attendance_data: AttendanceUpdate,
    current_user: dict = Depends(has_role("TRAINER", "COORDINATOR"))
):
    """Update attendance record"""
    db = get_db()
    
    try:
        # Get current record to increment version
        current = db.table("attendances").select("version").eq("id", attendance_id).execute()
        
        if not current.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance record not found"
            )
        
        current_version = current.data[0].get("version", 1)
        
        result = db.table("attendances").update({
            "status": attendance_data.status.value,
            "version": current_version + 1
        }).eq("id", attendance_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance record not found"
            )
        
        ret_val = AttendanceResponse(**row_to_api(result.data[0]))

        # Log ATTENDANCE_UPLOAD if updated by Trainer
        if current_user.get("role") == "TRAINER":
            try:
                batch_id = current.data[0].get("batch_id") if current.data else None
                if batch_id:
                    batch_res = db.table("batches").select("batch_name").eq("id", batch_id).execute()
                    batch_name = batch_res.data[0]["batch_name"] if batch_res.data else "Unknown"
                    db.table("notifications").insert({
                        "type": "ATTENDANCE_UPLOAD",
                        "message": f"Trainer {current_user.get('fullName', 'Trainer')} updated attendance record for Batch '{batch_name}'.",
                        "is_read": False,
                        "created_at": datetime.utcnow().isoformat()
                    }).execute()
            except Exception as notif_err:
                print(f"[Warn] Failed to create ATTENDANCE_UPLOAD notification: {notif_err}")

        return ret_val
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
