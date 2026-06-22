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
    async def send_feedback_request(candidate_email: str, candidate_name: str, batch_name: str,
                                    batch_id: str = "", feedback_form_url: str = "") -> bool:
        """Send feedback request email with a direct link to the feedback form."""
        subject = f"Feedback Request — {batch_name}"
        form_link = feedback_form_url or f"http://127.0.0.1:3001/feedback/form?batchId={batch_id}"
        body = f"""
Dear {candidate_name},

Your training batch "{batch_name}" is concluding soon and we'd love to hear from you!

Please take 5 minutes to share your feedback using the link below. Your responses help us improve the training programme for future cohorts.

👉 Submit Feedback: {form_link}

The feedback window will close on the batch end date, so please respond at your earliest convenience.

Thank you for your time and participation!

Best Regards,
MEP-TMS Training Team
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
        http://127.0.0.1:3001/trainee-login
        
        Best Regards,
        MEP-TMS Management Team
        """
        return await EmailService.send_email(candidate_email, subject, body)

    @staticmethod
    async def send_staff_credentials(email: str, full_name: str, role: str, temp_password: str, employee_id: str) -> bool:
        """Send onboarding credentials to coordinator or trainer"""
        subject = f"Welcome to Maverick One - Your {role.capitalize()} Account Credentials"
        body = f"""
        Dear {full_name},
        
        Welcome to the Maverick One Training System!
        
        An account with the role of {role.capitalize()} has been created for you by the Administrator. Here are your login details:
        
        Employee ID: {employee_id}
        Email Address: {email}
        Temporary Password: {temp_password}
        
         Please sign in to the Maverick One dashboard:
        http://127.0.0.1:3001/login
        
        We suggest you change your password after logging in.
        
        Best Regards,
        MEP-TMS Management Team
        """
        return await EmailService.send_email(email, subject, body)

    @staticmethod
    async def send_permanent_onboarding_letter(candidate_email: str, candidate_name: str, employee_id: str) -> bool:
        """Send permanent employee onboarding welcome greeting and offer letter"""
        subject = "Congratulations! Welcome to Maverick One as a Permanent Employee"
        
        # HTML template for a professional greeting and embedded offer letter
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #dddddd; border-radius: 8px; background-color: #ffffff;">
                <div style="text-align: center; border-bottom: 2px solid #1f497d; padding-bottom: 10px; margin-bottom: 20px;">
                    <h2 style="color: #1f497d; margin: 0;">MAVERICK EXECUTION PLATFORM</h2>
                    <p style="font-size: 12px; color: #555555; margin: 5px 0 0 0;">CONFIRMATION OF PERMANENT EMPLOYMENT</p>
                </div>
                
                <p>Dear <strong>{candidate_name}</strong>,</p>
                
                <p>We are absolutely thrilled to extend our warmest congratulations to you! Based on your outstanding consistency and performance during your training track on the Maverick Execution Platform, you have officially been converted into a <strong>Permanent Employee</strong> at Maverick One.</p>
                
                <p>Your dedication, problem-solving skills, and adherence to milestone timelines have shown us that you embody the true spirit of a Maverick. Below, you will find your official confirmation details and formal Offer Letter terms.</p>
                
                <div style="background-color: #f9f9f9; border-left: 4px solid #1f497d; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <h3 style="margin-top: 0; color: #1f497d;">Employment Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 5px 0; font-weight: bold; width: 40%;">Employee ID:</td>
                            <td style="padding: 5px 0;">{employee_id}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; font-weight: bold;">Employment Status:</td>
                            <td style="padding: 5px 0; color: #2ecc71; font-weight: bold;">Full-Time Permanent (FTE)</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; font-weight: bold;">Effective Date:</td>
                            <td style="padding: 5px 0;">Immediate</td>
                        </tr>
                    </table>
                </div>

                <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 25px 0;" />

                <div style="border: 1px dashed #cccccc; padding: 20px; background-color: #fafafa; border-radius: 6px;">
                    <h3 style="text-align: center; color: #1f497d; margin-top: 0; text-transform: uppercase; letter-spacing: 1px;">Formal Letter of Offer</h3>
                    <p style="font-size: 13px; text-align: justify;">
                        We are pleased to offer you the position of <strong>Associate Software Engineer</strong> at Maverick One. In this role, you will be expected to design, build, and support high-quality software systems, adhering to strict coding and execution parameters.
                    </p>
                    <p style="font-size: 13px; text-align: justify;">
                        <strong>Compensation:</strong> Your compensation packages and details will be updated under your permanent profile in the HR system. You will receive standard executive benefits, medical health coverage, and access to performance bonuses.
                    </p>
                    <p style="font-size: 13px; text-align: justify;">
                        <strong>Agreement:</strong> By accepting this offer, you agree to continue executing deliverables with the same high standard of speed, efficiency, and quality that you demonstrated throughout your training phases.
                    </p>
                    <p style="font-size: 12px; color: #777777; text-align: center; margin-top: 20px;">
                        <em>*Digitally generated and approved by the Maverick Onboarding Board.*</em>
                    </p>
                </div>
                
                <p style="margin-top: 25px;">Welcome to the next chapter of your journey at Maverick. We look forward to seeing the great things you will build!</p>
                
                <p style="margin-bottom: 0;">Warmest Regards,</p>
                <p style="margin-top: 5px; font-weight: bold; color: #1f497d;">MEP Onboarding & HR Board<br/>Maverick Execution Platform</p>
            </div>
        </body>
        </html>
        """
        
        # Send email as HTML
        return await EmailService.send_email(candidate_email, subject, html_body, is_html=True)
