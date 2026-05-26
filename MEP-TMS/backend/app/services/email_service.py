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
                server = smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=30.0)
                server.login(settings.EMAIL_USER, settings.EMAIL_PASSWORD)
            else:
                server = smtplib.SMTP(settings.EMAIL_SERVICE, 587, timeout=30.0)
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

    @staticmethod
    async def send_feedback_request(candidate_email: str, candidate_name: str, batch_name: str) -> bool:
        """Send feedback request email"""
        subject = f"Feedback Request for Batch - {batch_name}"
        body = f"""
        Dear {candidate_name},
        
        Your batch '{batch_name}' is concluding soon. We would highly appreciate it if you could share your feedback about the training, materials, and overall experience.
        
        Please visit the dashboard to submit your feedback, or reply directly to this email with your suggestions.
        
        Thank you for your cooperation!
        
        Best Regards,
        MEP-TMS Management Team
        """
        return await EmailService.send_email(candidate_email, subject, body)

    @staticmethod
    async def send_trainee_credentials(candidate_email: str, candidate_name: str, employee_id: str, temp_password: str) -> bool:
        """Send onboarding credentials to trainee"""
        subject = "Welcome to Maverick One - Your Onboarding Credentials"
        body = f"""
        Dear {candidate_name},
        
        Welcome to the Maverick One Training System!
        
        An account has been created for you. Here are your credentials:
        
        Employee ID: {employee_id}
        Temporary Password: {temp_password}
        
        Please sign in to the Trainee Dashboard to update your password and access your dashboard:
        http://localhost:3000/trainee-login
        
        Best Regards,
        MEP-TMS Management Team
        """
        return await EmailService.send_email(candidate_email, subject, body)

    @staticmethod
    async def send_staff_credentials(email: str, full_name: str, role: str, temp_password: str) -> bool:
        """Send onboarding credentials to coordinator or trainer"""
        subject = f"Welcome to Maverick One - Your {role.capitalize()} Account Credentials"
        body = f"""
        Dear {full_name},
        
        Welcome to the Maverick One Training System!
        
        An account with the role of {role.capitalize()} has been created for you by the Administrator. Here are your login details:
        
        Email Address: {email}
        Temporary Password: {temp_password}
        
        Please sign in to the Maverick One dashboard:
        http://localhost:5173/login
        
        We suggest you change your password after logging in.
        
        Best Regards,
        MEP-TMS Management Team
        """
        return await EmailService.send_email(email, subject, body)

