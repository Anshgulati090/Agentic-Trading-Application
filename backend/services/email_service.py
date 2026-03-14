import logging
import smtplib
from email.message import EmailMessage

from backend.config.settings import get_settings


logger = logging.getLogger("agentic.email")


class EmailService:
    def __init__(self) -> None:
        self._settings = get_settings()

    def send_verification_email(self, email: str, verification_url: str) -> None:
        if not self._settings.SMTP_HOST or not self._settings.SMTP_USERNAME:
            logger.info(
                "verification_email_not_sent_smtp_missing",
                extra={"extra_data": {"email": email, "verification_url": verification_url}},
            )
            return

        message = EmailMessage()
        message["Subject"] = "Verify your AgenticTrading account"
        message["From"] = self._settings.SMTP_FROM_EMAIL or self._settings.SMTP_USERNAME
        message["To"] = email
        message.set_content(
            f"Welcome to AgenticTrading.\n\nVerify your email by visiting:\n{verification_url}\n\nIf you did not create this account, you can ignore this message."
        )

        with smtplib.SMTP(self._settings.SMTP_HOST, self._settings.SMTP_PORT, timeout=10) as server:
            if self._settings.SMTP_USE_TLS:
                server.starttls()
            if self._settings.SMTP_PASSWORD:
                server.login(self._settings.SMTP_USERNAME, self._settings.SMTP_PASSWORD)
            server.send_message(message)
