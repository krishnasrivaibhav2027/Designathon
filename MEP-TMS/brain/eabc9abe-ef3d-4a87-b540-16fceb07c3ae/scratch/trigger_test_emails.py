import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import sys

print("Initializing SMTP Debug Test...")
EMAIL_USER = "gksvaibav99@gmail.com"
EMAIL_PASSWORD = "nojywusttghskwtq"
RECIPIENT = "vasudevguptha@gmail.com"

def send_test_email(subject, body, is_html=False):
    print(f"\n--- Sending email: {subject} ---")
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = EMAIL_USER
        msg['To'] = RECIPIENT
        
        part = MIMEText(body, 'html' if is_html else 'plain')
        msg.attach(part)
        
        # Connect with ssl
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=30.0)
        # Enable full SMTP communication log
        server.set_debuglevel(1)
        
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        print("Success! Email sent transaction completed.")
        return True
    except Exception as e:
        print(f"SMTP Error: {e}")
        import traceback
        traceback.print_exc()
        return False

# Trigger 3 test emails:
# 1. Plain Text Test
send_test_email(
    subject="MEP-TMS SMTP Test #1: Plain Text",
    body="Hello Vasudev,\n\nThis is a plain text test email triggered to verify if SMTP delivery to your Gmail is functioning correctly."
)

# 2. HTML Formatting Test
html_body = """
<html>
  <body style="font-family: sans-serif; padding: 20px; background-color: #f8fafc; color: #0f172a;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
      <h2 style="color: #f9a51b;">MEP-TMS Test #2: HTML Email</h2>
      <p>Hello Vasudev,</p>
      <p>This email tests HTML styling delivery. If you can read this styled card, HTML emails are loading correctly.</p>
    </div>
  </body>
</html>
"""
send_test_email(
    subject="MEP-TMS SMTP Test #2: HTML styled",
    body=html_body,
    is_html=True
)

# 3. Plain Text Password Reset format
send_test_email(
    subject="MEP-TMS SMTP Test #3: Password Reset Format Test",
    body="Dear Vasudev,\n\nThis is test #3 mimicking a password reset message. Please check if this email arrived in your main inbox or your spam folder."
)
