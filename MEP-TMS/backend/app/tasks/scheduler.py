from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, time, date, timedelta
from app.core.database import get_db
from app.services.email_service import EmailService
import logging

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

async def check_attendance_cutoff():
    """
    Job that runs daily at 10:00 AM to check if any batch attendance is missing.
    Sends alerts to coordinators.
    """
    logger.info("Running daily attendance cutoff check...")
    db = get_db()
    today_start = datetime.combine(date.today(), time.min).isoformat()
    today_end = datetime.combine(date.today(), time.max).isoformat()
    
    # Find all currently running batches
    running_batches_result = db.table("batches").select("*").eq("status", "RUNNING").execute()
    running_batches = running_batches_result.data
    
    for batch in running_batches:
        batch_id = batch["batch_id"]
        batch_name = batch.get("batch_name", batch_id)
        
        # Check if attendance exists for this batch today
        attendance_result = db.table("attendances").select("id") \
            .eq("batch_id", batch["id"]) \
            .gte("date", today_start) \
            .lte("date", today_end) \
            .limit(1) \
            .execute()
        
        if not attendance_result.data:
            logger.warning(f"Attendance missing for batch {batch_name}")
            # Find coordinator(s) for this batch
            coordinators_result = db.table("users").select("email").eq("role", "COORDINATOR").execute()
            coord_emails = [c["email"] for c in coordinators_result.data if c.get("email")]
            
            if coord_emails:
                subject = f"Alert: Missing Attendance for {batch_name}"
                body = f"Hello Coordinator,\n\nAttendance for batch '{batch_name}' has not been uploaded by the 10:00 AM cutoff.\nPlease follow up with the trainers.\n\nBest Regards,\nMEP-TMS"
                for email in coord_emails:
                    await EmailService.send_email(email, subject, body)

async def check_continuous_absence():
    """
    Job to run daily and check if candidates have been absent for 3 consecutive days.
    """
    logger.info("Running continuous absence check...")
    db = get_db()
    
    # Get all candidates
    candidates_result = db.table("candidates").select("*").execute()
    candidates = candidates_result.data
    
    for candidate in candidates:
        cand_id = candidate["id"]
        
        # Get last 3 attendances sorted by date descending
        recent_result = db.table("attendances").select("*") \
            .eq("candidate_id", cand_id) \
            .order("date", desc=True) \
            .limit(3) \
            .execute()
        recent_attendances = recent_result.data
        
        if len(recent_attendances) == 3 and all(a["status"] == "ABSENT" for a in recent_attendances):
            logger.warning(f"Candidate {candidate['full_name']} absent for 3 consecutive days.")
            
            # Send alert to Coordinator
            coordinators_result = db.table("users").select("email").eq("role", "COORDINATOR").execute()
            coord_emails = [c["email"] for c in coordinators_result.data if c.get("email")]
            
            if coord_emails:
                subject = f"Alert: Continuous Absence - {candidate['full_name']}"
                body = f"Hello Coordinator,\n\nCandidate {candidate['full_name']} (Reg: {candidate.get('registration_number', cand_id)}) has been absent for 3 consecutive days.\nPlease follow up.\n\nBest Regards,\nMEP-TMS"
                for email in coord_emails:
                    await EmailService.send_email(email, subject, body)

def start_scheduler():
    """Start the APScheduler background tasks"""
    # 10:00 AM Cutoff
    scheduler.add_job(
        check_attendance_cutoff,
        CronTrigger(hour=10, minute=0),
        id="attendance_cutoff_job",
        replace_existing=True
    )
    
    # End of day absence check (e.g., 6:00 PM)
    scheduler.add_job(
        check_continuous_absence,
        CronTrigger(hour=18, minute=0),
        id="continuous_absence_job",
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Scheduler started.")

def stop_scheduler():
    """Stop the scheduler"""
    scheduler.shutdown()
    logger.info("Scheduler stopped.")
