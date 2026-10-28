"""
SENPAY Transactional Email Service
══════════════════════════════════
Provides reliable transactional email delivery for user registration,
email verification, and password reset workflows.

Supported Providers:
1. SMTP (Generic / Postmark / SendGrid / Amazon SES / Mailgun)
   Configuration: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, SMTP_TLS
2. Resend API (HTTP-based)
   Configuration: RESEND_API_KEY, RESEND_FROM
3. Local/Development Fallback:
   Logs email messages and tokens to the console/logger securely for testing.
"""

import os
import smtplib
import ssl
import time
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, Any, Optional, Callable

logger = logging.getLogger("telesol.email")

# In-memory rate limiting for transactional emails: {email: [timestamp, ...]}
_EMAIL_RATE_LIMITS: Dict[str, list[float]] = {}
COOLDOWN_SECONDS = 60.0  # 1 minute between consecutive emails to same address
MAX_HOURLY_EMAILS = 5    # Max 5 emails per hour per address


class EmailRateLimitExceeded(Exception):
    """Raised when an email dispatch is blocked by rate limiting."""
    pass


class EmailService:
    """Dispatches transactional emails with rate-limiting, provider abstraction, and credential safety."""

    _mock_delivery_handler: Optional[Callable] = None

    @classmethod
    def set_mock_handler(cls, handler: Optional[Callable]) -> None:
        """Inject a mock handler for automated tests to verify email behavior without real credentials."""
        cls._mock_delivery_handler = handler

    @staticmethod
    def _mask_email(email: str) -> str:
        """Sanitize email address for logs: 'operator@telesol.io' -> 'ope***@telesol.io'."""
        try:
            parts = email.strip().split("@")
            if len(parts) == 2:
                name, domain = parts
                masked = name[:3] + "***" if len(name) >= 3 else name[0] + "***"
                return f"{masked}@{domain}"
        except Exception:
            pass
        return "***@***"

    @staticmethod
    def validate_configuration() -> Dict[str, Any]:
        """Validate transactional email configuration without leaking secret keys or passwords."""
        is_production = os.getenv("ENVIRONMENT", "").strip().lower() in ("production", "prod")
        resend_key = os.getenv("RESEND_API_KEY")
        smtp_host = os.getenv("SMTP_HOST")
        smtp_user = os.getenv("SMTP_USER")
        smtp_pass = os.getenv("SMTP_PASSWORD")

        has_resend = bool(resend_key and len(resend_key.strip()) > 8)
        has_smtp = bool(smtp_host and smtp_user and smtp_pass)

        if has_resend:
            active_provider = "resend"
        elif has_smtp:
            active_provider = "smtp"
        elif not is_production:
            active_provider = "development_console"
        else:
            active_provider = "unconfigured"

        is_valid = bool(has_resend or has_smtp or (not is_production))

        return {
            "is_valid": is_valid,
            "active_provider": active_provider,
            "is_production": is_production,
            "has_resend": has_resend,
            "has_smtp": has_smtp,
            "from_address": os.getenv("SMTP_FROM") or os.getenv("RESEND_FROM", "SENPAY Security <security@telesol.io>"),
            "rate_limiting": {
                "cooldown_seconds": COOLDOWN_SECONDS,
                "max_hourly_emails": MAX_HOURLY_EMAILS
            }
        }

    @staticmethod
    def _check_rate_limit(recipient_email: str) -> None:
        """Enforce rate limits per recipient email to prevent abuse."""
        now = time.time()
        recipient_email = recipient_email.strip().lower()
        history = _EMAIL_RATE_LIMITS.get(recipient_email, [])

        # Filter out timestamps older than 1 hour (3600s)
        history = [t for t in history if now - t < 3600]

        if history:
            # Check cooldown since last send
            time_since_last = now - history[-1]
            if time_since_last < COOLDOWN_SECONDS:
                remaining = int(COOLDOWN_SECONDS - time_since_last)
                raise EmailRateLimitExceeded(
                    f"Please wait {remaining} seconds before requesting another email."
                )

        if len(history) >= MAX_HOURLY_EMAILS:
            raise EmailRateLimitExceeded(
                "Hourly email limit exceeded for this address. Please try again later."
            )

        history.append(now)
        _EMAIL_RATE_LIMITS[recipient_email] = history

    @staticmethod
    def send_email(
        recipient_email: str,
        subject: str,
        text_content: str,
        html_content: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send an email via configured provider (SMTP, Resend, or Dev/Console mode).
        Never logs authentication tokens, raw passwords, or full sensitive email content.
        """
        recipient_email = recipient_email.strip().lower()
        EmailService._check_rate_limit(recipient_email)

        # 0. Mock Handler for automated tests
        if EmailService._mock_delivery_handler is not None:
            return EmailService._mock_delivery_handler(recipient_email, subject, text_content, html_content)

        smtp_host = os.getenv("SMTP_HOST")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER")
        smtp_password = os.getenv("SMTP_PASSWORD")
        smtp_from = os.getenv("SMTP_FROM", "SENPAY Security <security@telesol.io>")
        resend_key = os.getenv("RESEND_API_KEY")

        # 1. Try Resend if configured
        if resend_key:
            try:
                import urllib.request
                import json

                url = "https://api.resend.com/emails"
                headers = {
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "from": os.getenv("RESEND_FROM", smtp_from),
                    "to": [recipient_email],
                    "subject": subject,
                    "text": text_content,
                }
                if html_content:
                    payload["html"] = html_content

                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers=headers,
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    resp_data = json.loads(resp.read().decode("utf-8"))
                    logger.info(
                        "[EMAIL] Message accepted by Resend for %s | Subject: %s | ID: %s",
                        EmailService._mask_email(recipient_email), subject, resp_data.get("id")
                    )
                    return {"status": "provider_accepted", "provider": "resend", "id": resp_data.get("id")}
            except Exception as e:
                # Sanitize error message to avoid disclosing URLs or query parameters
                sanitized_error = str(e).split("?")[0]
                logger.error("[EMAIL] Resend delivery rejected for %s: %s", EmailService._mask_email(recipient_email), sanitized_error)
                # Fall through to SMTP or dev mode

        # 2. Try SMTP if configured
        if smtp_host and smtp_user and smtp_password:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = smtp_from
                msg["To"] = recipient_email

                part1 = MIMEText(text_content, "plain")
                msg.attach(part1)
                if html_content:
                    part2 = MIMEText(html_content, "html")
                    msg.attach(part2)

                context = ssl.create_default_context()
                with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                    if os.getenv("SMTP_TLS", "true").lower() in ("true", "1", "yes"):
                        server.starttls(context=context)
                    server.login(smtp_user, smtp_password)
                    server.sendmail(smtp_from, recipient_email, msg.as_string())

                logger.info("[EMAIL] Message accepted by SMTP relay for %s | Subject: %s", EmailService._mask_email(recipient_email), subject)
                return {"status": "relay_accepted", "provider": "smtp"}
            except Exception as e:
                sanitized_error = str(e).split("?")[0]
                logger.error("[EMAIL] SMTP delivery failed for %s: %s", EmailService._mask_email(recipient_email), sanitized_error)
                # Fall through to dev mode

        # 3. Environment Check: Fail-closed in production
        is_production = os.getenv("ENVIRONMENT", "").strip().lower() in ("production", "prod")
        if is_production:
            logger.error(
                "[EMAIL] Production transactional email unconfigured for %s: no live provider confirmed acceptance.",
                EmailService._mask_email(recipient_email)
            )
            return {
                "status": "unconfigured_in_production",
                "provider": "none",
                "error": "No verified transactional email provider (SMTP or Resend) confirmed acceptance in production environment.",
                "recipient": recipient_email
            }

        # 4. Development / Local Fallback Mode (Token never logged to logs/console)
        logger.info(
            "[EMAIL:DEV_MODE] Dispatched to %s | Subject: %s | Mode: development_console",
            EmailService._mask_email(recipient_email), subject
        )
        return {
            "status": "dev_mode_dispatched",
            "provider": "development_console",
            "recipient": recipient_email,
            "subject": subject
        }

    @staticmethod
    def send_verification_email(
        recipient_email: str,
        full_name: str,
        verification_token: str,
        app_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """Dispatch account verification email with single-use token."""
        base_url = app_url or os.getenv("APP_URL", "http://localhost:5173")
        verify_url = f"{base_url}/verify-email?token={verification_token}"

        subject = "Verify your SENPAY Telecom Operations Account"
        text = (
            f"Hello {full_name},\n\n"
            f"Thank you for registering for the SENPAY Telecom Operations and Autonomous Procurement platform.\n\n"
            f"Please verify your email address by visiting the link below (valid for 24 hours):\n"
            f"{verify_url}\n\n"
            f"Verification Code: {verification_token}\n\n"
            f"If you did not create this account, please disregard this message.\n\n"
            f"— The SENPAY Security Team\n"
        )
        html = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; color: #09090b; border: 1px solid #e4e4e7; border-radius: 8px;">
            <div style="border-bottom: 2px solid #000000; padding-bottom: 12px; margin-bottom: 20px;">
                <h1 style="font-size: 20px; font-weight: 700; margin: 0; letter-spacing: -0.02em; color: #000000;">SENPAY // TeleSol Sentinel</h1>
                <p style="font-size: 12px; color: #71717a; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.05em;">Autonomous Telecom Procurement & Operations</p>
            </div>
            <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>{full_name}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #3f3f46; margin: 0 0 20px 0;">
                Your account registration has been received. To access the operational console, verify your email address using the button below. This link is valid for 24 hours.
            </p>
            <div style="margin: 24px 0; text-align: center;">
                <a href="{verify_url}" style="display: inline-block; background: #000000; color: #ffffff; padding: 12px 28px; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 6px; letter-spacing: 0.02em;">
                    Verify Account Access
                </a>
            </div>
            <p style="font-size: 12px; color: #71717a; margin: 20px 0 8px 0;">Or paste this link into your browser:</p>
            <div style="background: #f4f4f5; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 12px; color: #18181b;">
                {verify_url}
            </div>
            <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e4e4e7; font-size: 11px; color: #a1a1aa; line-height: 1.5;">
                Token ID: <span style="font-family: monospace;">{verification_token[:12]}...</span><br/>
                If you did not request this registration, no further action is required.
            </div>
        </div>
        """
        return EmailService.send_email(recipient_email, subject, text, html)

    @staticmethod
    def send_password_reset_email(
        recipient_email: str,
        full_name: str,
        reset_token: str,
        app_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """Dispatch password reset email with single-use token."""
        base_url = app_url or os.getenv("APP_URL", "http://localhost:5173")
        reset_url = f"{base_url}/reset-password?token={reset_token}"

        subject = "Reset your SENPAY Account Password"
        text = (
            f"Hello {full_name},\n\n"
            f"We received a request to reset the password for your SENPAY account.\n\n"
            f"Click the link below to set a new password (valid for 1 hour):\n"
            f"{reset_url}\n\n"
            f"Reset Code: {reset_token}\n\n"
            f"If you did not request a password reset, you can safely ignore this email.\n\n"
            f"— The SENPAY Security Team\n"
        )
        html = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; color: #09090b; border: 1px solid #e4e4e7; border-radius: 8px;">
            <div style="border-bottom: 2px solid #000000; padding-bottom: 12px; margin-bottom: 20px;">
                <h1 style="font-size: 20px; font-weight: 700; margin: 0; letter-spacing: -0.02em; color: #000000;">SENPAY // Security Operations</h1>
                <p style="font-size: 12px; color: #71717a; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.05em;">Credential Management</p>
            </div>
            <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>{full_name}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #3f3f46; margin: 0 0 20px 0;">
                A password reset request was initiated for your account. Click the button below to choose a new password. This link is valid for 1 hour.
            </p>
            <div style="margin: 24px 0; text-align: center;">
                <a href="{reset_url}" style="display: inline-block; background: #000000; color: #ffffff; padding: 12px 28px; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 6px; letter-spacing: 0.02em;">
                    Reset Password
                </a>
            </div>
            <p style="font-size: 12px; color: #71717a; margin: 20px 0 8px 0;">Or paste this link into your browser:</p>
            <div style="background: #f4f4f5; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 12px; color: #18181b;">
                {reset_url}
            </div>
            <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e4e4e7; font-size: 11px; color: #a1a1aa; line-height: 1.5;">
                If you did not initiate this request, your account may be under reconnaissance. You can report suspicious activity to security@telesol.io.
            </div>
        </div>
        """
        return EmailService.send_email(recipient_email, subject, text, html)
