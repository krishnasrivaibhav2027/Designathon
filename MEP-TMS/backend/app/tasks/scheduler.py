from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, time, date, timedelta
from app.core.database import get_db
from app.core.config import settings
from app.services.email_service import EmailService
import logging

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

async def check_attendance_cutoff():
    """
    Job that runs daily at the configured cutoff time to check if any batch
    attendance is missing. Sends alerts to all coordinators.
    """
    logger.info("Running daily attendance cutoff check...")
    db = get_db()
    today_start = datetime.combine(date.today(), time.min).isoformat()
    today_end = datetime.combine(date.today(), time.max).isoformat()
    
    # Find all currently running batches
    running_batches_result = db.table("batches").select("*").eq("status", "RUNNING").execute()
    running_batches = running_batches_result.data
    
    for batch in running_batches:
        batch_id = batch["id"]
        batch_name = batch.get("batch_name", batch_id)
        
        # Check if attendance exists for this batch today
        attendance_result = db.table("attendances").select("id") \
            .eq("batch_id", batch_id) \
            .gte("date", today_start) \
            .lte("date", today_end) \
            .limit(1) \
            .execute()
        
        if not attendance_result.data:
            logger.warning(f"Attendance missing for batch {batch_name}")
            # Find coordinator(s) for this batch
            coordinators_result = db.table("users").select("email", "full_name") \
                .eq("role", "COORDINATOR").execute()
            coord_emails = [c["email"] for c in coordinators_result.data if c.get("email")]
            
            if coord_emails:
                subject = f"Alert: Missing Attendance for {batch_name}"
                body = (
                    f"Hello Coordinator,\n\n"
                    f"Attendance for batch '{batch_name}' has not been uploaded by the "
                    f"{settings.ATTENDANCE_CUTOFF_TIME} cutoff.\n"
                    f"Please follow up with the assigned trainer(s).\n\n"
                    f"Best Regards,\nMEP-TMS"
                )
                for email in coord_emails:
                    await EmailService.send_email(email, subject, body)

async def check_continuous_absence():
    """
    Job to run daily and check if candidates have been absent for
    ABSENT_ALERT_DAYS (configurable, default 3) consecutive days.
    Sends an alert to all coordinators for each such candidate.
    """
    absent_days_threshold = settings.ABSENT_ALERT_DAYS
    logger.info(f"Running continuous absence check (threshold: {absent_days_threshold} days)...")
    db = get_db()
    
    # Run pool cleanup first
    from app.services.pool_cleanup import clean_and_sync_pool
    clean_and_sync_pool(db)
    
    # Get all candidates
    candidates_result = db.table("candidates").select("*").execute()
    candidates = candidates_result.data
    
    for candidate in candidates:
        cand_id = candidate["id"]
        
        # Get last N attendances sorted by date descending
        recent_result = db.table("attendances").select("*") \
            .eq("candidate_id", cand_id) \
            .order("date", desc=True) \
            .limit(absent_days_threshold) \
            .execute()
        recent_attendances = recent_result.data
        
        if (
            len(recent_attendances) == absent_days_threshold
            and all(a["status"] == "ABSENT" for a in recent_attendances)
        ):
            logger.warning(
                f"Candidate {candidate.get('full_name')} absent for "
                f"{absent_days_threshold} consecutive days."
            )
            
            # Send alert to all Coordinators
            coordinators_result = db.table("users").select("email") \
                .eq("role", "COORDINATOR").execute()
            coord_emails = [c["email"] for c in coordinators_result.data if c.get("email")]
            
            if coord_emails:
                subject = f"Alert: Continuous Absence — {candidate.get('full_name', cand_id)}"
                body = (
                    f"Hello Coordinator,\n\n"
                    f"Candidate {candidate.get('full_name', cand_id)} "
                    f"(Reg: {candidate.get('registration_number', cand_id)}) "
                    f"has been absent for {absent_days_threshold} consecutive days.\n"
                    f"Please follow up for attendance regularisation.\n\n"
                    f"Best Regards,\nMEP-TMS"
                )
                for email in coord_emails:
                    await EmailService.send_email(email, subject, body)

def start_scheduler():
    """Start the APScheduler background tasks"""
    # Parse cutoff time from config (e.g. "10:00")
    try:
        cutoff_hour, cutoff_minute = map(int, settings.ATTENDANCE_CUTOFF_TIME.split(":"))
    except Exception:
        cutoff_hour, cutoff_minute = 10, 0

    # Attendance cutoff check — runs at the configured cutoff time
    scheduler.add_job(
        check_attendance_cutoff,
        CronTrigger(hour=cutoff_hour, minute=cutoff_minute),
        id="attendance_cutoff_job",
        replace_existing=True
    )
    
    # End-of-day consecutive absence check (6:00 PM)
    scheduler.add_job(
        check_continuous_absence,
        CronTrigger(hour=18, minute=0),
        id="continuous_absence_job",
        replace_existing=True
    )
    
    scheduler.start()
    logger.info(
        f"Scheduler started. Cutoff check at {settings.ATTENDANCE_CUTOFF_TIME}, "
        f"absence check at 18:00 (threshold: {settings.ABSENT_ALERT_DAYS} days)."
    )

def stop_scheduler():
    """Stop the scheduler"""
    scheduler.shutdown()
    logger.info("Scheduler stopped.")
