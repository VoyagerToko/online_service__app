"""
Email service — wraps fastapi-mail for sending transactional emails.
In dev, MailHog intercepts all emails at localhost:1025.
"""
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.config import settings

_conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=bool(settings.MAIL_USERNAME),
    VALIDATE_CERTS=settings.is_production,
)

_mailer = FastMail(_conf)


async def send_verification_email(to: str, token: str, name: str):
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    body = f"""
    <h2>Welcome to Servify, {name}!</h2>
    <p>Click the link below to verify your email address:</p>
    <a href="{verify_url}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;">
      Verify Email
    </a>
    <p>This link expires in 24 hours.</p>
    <p>If you didn't sign up for Servify, you can safely ignore this email.</p>
    """
    msg = MessageSchema(
        subject="Verify your Servify account",
        recipients=[to],
        body=body,
        subtype=MessageType.html,
    )
    await _mailer.send_message(msg)


async def send_password_reset_email(to: str, token: str):
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    body = f"""
    <h2>Reset your Servify password</h2>
    <p>We received a request to reset the password for your account.</p>
    <a href="{reset_url}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;">
      Reset Password
    </a>
    <p>This link expires in 1 hour. If you didn't request a password reset, ignore this email.</p>
    """
    msg = MessageSchema(
        subject="Reset your Servify password",
        recipients=[to],
        body=body,
        subtype=MessageType.html,
    )
    await _mailer.send_message(msg)


async def send_booking_confirmation_email(to: str, booking_id: str, service_name: str, date: str, slot: str):
    body = f"""
    <h2>Booking Confirmed! 🎉</h2>
    <p>Your booking for <strong>{service_name}</strong> has been confirmed.</p>
    <ul>
      <li><strong>Booking ID:</strong> {booking_id[:8].upper()}</li>
      <li><strong>Date:</strong> {date}</li>
      <li><strong>Time Slot:</strong> {slot}</li>
    </ul>
    <p>You can track your service live from the <a href="{settings.FRONTEND_URL}/dashboard">Dashboard</a>.</p>
    """
    msg = MessageSchema(
        subject=f"Booking Confirmed — {service_name}",
        recipients=[to],
        body=body,
        subtype=MessageType.html,
    )
    await _mailer.send_message(msg)
