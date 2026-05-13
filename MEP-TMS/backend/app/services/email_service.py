import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings
from typing import List, Optional

class EmailService:
    """Email service for sending notifications"""
    
    @staticmethod
    async def send_email(to_email: str, subject: str, body: str, is_html: bool = False) -> bool:
        """Send email"""
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = settings.EMAIL_USER
            msg['To'] = to_email
            
            if is_html:
                part = MIMEText(body, 'html')
            else:
                part = MIMEText(body, 'plain')
            
            msg.attach(part)
            
            # For Gmail
            if settings.EMAIL_SERVICE == "gmail":
                server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
                server.login(settings.EMAIL_USER, settings.EMAIL_PASSWORD)
            else:
                server = smtplib.SMTP(settings.EMAIL_SERVICE, 587)
                server.starttls()
                server.login(settings.EMAIL_USER, settings.EMAIL_PASSWORD)
            
            server.send_message(msg)
            server.quit()
            return True
        except Exception as e:
            print(f"Error sending email: {e}")
            return False

    @staticmethod
    async def send_attendance_alert(candidate_email: str, candidate_name: str, absent_days: int) -> bool:
        """Send attendance alert email"""
        subject = f"Attendance Alert - {candidate_name}"
        body = f"""
        Dear {candidate_name},
        
        This is to notify you that you have been absent for {absent_days} consecutive days.
        Please contact your coordinator immediately to regularize your attendance.
        
        Best Regards,
        MEP-TMS Management
        """
        return await EmailService.send_email(candidate_email, subject, body)

    @staticmethod
    async def send_assessment_result(candidate_email: str, candidate_name: str, assessment_name: str, score: int, total: int, result: str) -> bool:
        """Send assessment result email"""
        percentage = (score / total * 100) if total > 0 else 0
        subject = f"Assessment Result - {assessment_name}"
        body = f"""
        Dear {candidate_name},
        
        Your assessment results for {assessment_name}:
        Score: {score}/{total} ({percentage:.2f}%)
        Result: {result}
        
        Best Regards,
        MEP-TMS Management
        """
        return await EmailService.send_email(candidate_email, subject, body)

    @staticmethod
    async def send_batch_update(email_list: List[str], batch_name: str, update_message: str) -> bool:
        """Send batch update to multiple users"""
        subject = f"Batch Update - {batch_name}"
        body = f"""
        Dear Trainee,
        
        There is an update for your batch {batch_name}:
        {update_message}
        
        Best Regards,
        MEP-TMS Management
        """
        
        success = True
        for email in email_list:
            result = await EmailService.send_email(email, subject, body)
            if not result:
                success = False
        
        return success
