import logging
import smtplib
from email.message import EmailMessage

from backend.config.settings import get_settings


logger = logging.getLogger("agentic.email")


def build_verification_link(token: str) -> str:
    settings = get_settings()
    base_url = settings.APP_BASE_URL.rstrip("/")
    return f"{base_url}/verify-email?token={token}"


def send_verification_email(email: str, token: str) -> None:
    settings = get_settings()
    verify_url = build_verification_link(token)

    if not (settings.SMTP_HOST and settings.SMTP_FROM_EMAIL):
        logger.info("verification_email_preview", extra={"extra_data": {"email": email, "verify_url": verify_url}})
        return

    message = EmailMessage()
    message["Subject"] = "Verify your AgenticTrading account"
    message["From"] = settings.SMTP_FROM_EMAIL
    message["To"] = email
    message.set_content(
        "Welcome to AgenticTrading.\n\n"
        f"Verify your email by opening this link:\n{verify_url}\n\n"
        "If you did not create this account, you can ignore this email."
    )

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as smtp:
        if settings.SMTP_USE_TLS:
            smtp.starttls()
        if settings.SMTP_USERNAME:
            smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        smtp.send_message(message)
