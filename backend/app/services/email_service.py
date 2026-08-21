import smtplib
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import os
from email.mime.base import MIMEBase
from email import encoders

SENDER_EMAIL = "hassanhuda.dev@gmail.com"
SENDER_PASSWORD = "zedf dlhk ssto rppx"

def send_smtp_email_sync(recipient_email: str, subject: str, body: str, attachment_paths: list[str] = None):
    """Synchronous function to send email via Gmail SMTP with optional file attachments."""
    message = MIMEMultipart()
    message["From"] = SENDER_EMAIL
    message["To"] = recipient_email
    message["Subject"] = subject
    message.attach(MIMEText(body, "plain"))

    if attachment_paths:
        for path in attachment_paths:
            if os.path.exists(path):
                filename = os.path.basename(path)
                try:
                    with open(path, "rb") as attachment:
                        part = MIMEBase("application", "octet-stream")
                        part.set_payload(attachment.read())
                        encoders.encode_base64(part)
                        part.add_header(
                            "Content-Disposition",
                            f"attachment; filename= {filename}",
                        )
                        message.attach(part)
                except Exception as e:
                    print(f"Error attaching file {path}: {e}")

    server = None
    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, recipient_email, message.as_string())
        print(f"Successfully sent email to {recipient_email}")
        return True
    except Exception as e:
        print(f"Error sending email to {recipient_email}: {e}")
        return False
    finally:
        if server:
            try:
                server.quit()
            except:
                pass

async def send_smtp_email(recipient_email: str, subject: str, body: str, attachment_paths: list[str] = None):
    """Asynchronous wrapper for send_smtp_email_sync using asyncio.to_thread."""
    return await asyncio.to_thread(send_smtp_email_sync, recipient_email, subject, body, attachment_paths)
