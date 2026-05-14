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
    today = datetime.combine(date.today(), time.min)
    end_of_today = datetime.combine(date.today(), time.max)
    
    # Find all currently running batches
    running_batches = await db["batches"].find({"status": "RUNNING"}).to_list(None)
    
    for batch in running_batches:
        batch_id = batch["batchId"]
        batch_name = batch.get("batchName", batch_id)
        
        # Check if attendance exists for this batch today
        attendance_exists = await db["attendances"].find_one({
            "batchId": batch_id,
            "date": {"$gte": today, "$lte": end_of_today}
        })
        
        if not attendance_exists:
            logger.warning(f"Attendance missing for batch {batch_name}")
            # Find coordinator(s) for this batch
            trainers = batch.get("trainers", [])
            # As per BRD, alert is sent to Coordinator. Let's send to all Coordinators or Admin
            coordinators = await db["users"].find({"role": "COORDINATOR"}).to_list(None)
            coord_emails = [c["email"] for c in coordinators if c.get("email")]
            
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
    
    # We need to find candidates who have status="ABSENT" for the last 3 working days.
    # For simplicity, we check if the candidate has 3 recent attendances as "ABSENT".
    candidates = await db["candidates"].find().to_list(None)
    
    for candidate in candidates:
        cand_id = str(candidate["_id"])
        
        # Get last 3 attendances sorted by date descending
        recent_attendances = await db["attendances"].find({"candidateId": cand_id}).sort("date", -1).limit(3).to_list(None)
        
        if len(recent_attendances) == 3 and all(a["status"] == "ABSENT" for a in recent_attendances):
            logger.warning(f"Candidate {candidate['fullName']} absent for 3 consecutive days.")
            
            # Send alert to Coordinator
            coordinators = await db["users"].find({"role": "COORDINATOR"}).to_list(None)
            coord_emails = [c["email"] for c in coordinators if c.get("email")]
            
            if coord_emails:
                subject = f"Alert: Continuous Absence - {candidate['fullName']}"
                body = f"Hello Coordinator,\n\nCandidate {candidate['fullName']} (Reg: {candidate.get('registrationNumber', cand_id)}) has been absent for 3 consecutive days.\nPlease follow up.\n\nBest Regards,\nMEP-TMS"
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
