import os
import sys
import asyncio

sys.path.append(r'c:\Users\Designathon\Downloads\Designathon\MEP-TMS\backend')

from dotenv import load_dotenv
load_dotenv(r'c:\Users\Designathon\Downloads\Designathon\MEP-TMS\backend\.env')

from app.services.email_service import EmailService

async def main():
    print("Testing EmailService.send_email with gksvaibav99@gmail.com...")
    res = await EmailService.send_email(
        to_email="gksvaibav99@gmail.com",
        subject="MEP-TMS Service Test",
        body="This is a test of EmailService.send_email",
    )
    print("Result:", res)

asyncio.run(main())
