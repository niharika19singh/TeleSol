"""
SENPAY Authentication & Access Control Service
═════════════════════════════════════════════════
Implements production-grade authentication, multi-tenant workspace isolation,
role-based access control (RBAC), tamper-evident security audit logging,
email verification, password reset, and brute-force rate-limiting.

Supported Roles:
- PLATFORM_ADMIN: Full system governance, workspace and integration management
- WORKSPACE_OWNER: Workspace management, user invitation, budget and mandate authority
- NOC_OPERATOR: Sentinel incident response, network monitoring, mitigation triggering
- FINANCE: Budget delegation, settlement authorization, financial audit review
- ANALYST: Read-only telemetry, digital twin inspection, ML model evaluation
- SERVICE_PROVIDER: Third-party slice provider reporting and fulfillment inspection
"""

import os
import hmac
import base64
import json
import time
import secrets
import hashlib
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta

from fastapi import Depends, HTTPException, Header, Request, status
from app.paypilot.db import db_session
from app.services.email_service import EmailService, EmailRateLimitExceeded

logger = logging.getLogger("telesol.auth")

# Signing secrets
AUTH_SECRET_KEY = os.getenv("SENPAY_AUTH_SECRET", "senpay-auth-token-signing-secret-2026-telecom-key")
TOKEN_EXPIRATION_SECONDS = int(os.getenv("SENPAY_TOKEN_EXPIRATION_SECONDS", "86400"))  # 24 hours
VERIFICATION_TOKEN_LIFETIME_HOURS = 24
RESET_TOKEN_LIFETIME_HOURS = 1

# Standard Role Constants
ROLE_PLATFORM_ADMIN = "PLATFORM_ADMIN"
ROLE_WORKSPACE_OWNER = "WORKSPACE_OWNER"
ROLE_NOC_OPERATOR = "NOC_OPERATOR"
ROLE_FINANCE = "FINANCE"
ROLE_ANALYST = "ANALYST"
ROLE_SERVICE_PROVIDER = "SERVICE_PROVIDER"

# Role normalizations for legacy backwards compatibility
ROLE_ALIASES = {
    "ADMIN": ROLE_PLATFORM_ADMIN,
    "OPERATOR": ROLE_NOC_OPERATOR,
}

ALL_VALID_ROLES = [
    ROLE_PLATFORM_ADMIN,
    ROLE_WORKSPACE_OWNER,
    ROLE_NOC_OPERATOR,
    ROLE_FINANCE,
    ROLE_ANALYST,
    ROLE_SERVICE_PROVIDER,
    "ADMIN",
    "OPERATOR"
]

# In-memory failed login tracking for lockout protection: {identifier: [timestamp, ...]}
_FAILED_LOGINS: Dict[str, list[float]] = {}
LOCKOUT_THRESHOLD = 5
LOCKOUT_WINDOW_SECONDS = 300  # 5 minutes
LOCKOUT_DURATION_SECONDS = 300  # 5 minutes lockout

# In-memory registration rate limits: {ip_or_key: [timestamp, ...]}
_REGISTRATION_RATE_LIMITS: Dict[str, list[float]] = {}
MAX_REGISTRATIONS_PER_IP_PER_HOUR = 30


def normalize_role(role: str) -> str:
    """Normalize role string to standard uppercase role."""
    r = role.strip().upper()
    return ROLE_ALIASES.get(r, r)


def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    """
    Hash a plaintext password using PBKDF2-HMAC-SHA256.
    Returns (hex_hash, hex_salt).
    """
    if not salt:
        salt_bytes = secrets.token_bytes(16)
        salt = salt_bytes.hex()
    else:
        salt_bytes = bytes.fromhex(salt)

    iterations = 100_000
    hash_bytes = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_bytes, iterations)
    return hash_bytes.hex(), salt


def verify_password(plain_password: str, password_hash: str, salt: str) -> bool:
    """Verify that a plaintext password matches the stored hash in constant time."""
    expected_hash, _ = hash_password(plain_password, salt)
    return hmac.compare_digest(expected_hash, password_hash)


def create_access_token(
    user_id: str,
    username: str,
    email: str,
    role: str,
    workspace_id: Optional[str] = None,
    org_name: Optional[str] = None
) -> str:
    """Generate a tamper-evident signed token containing user claims and expiration."""
    payload = {
        "uid": user_id,
        "usr": username,
        "eml": email,
        "rol": role,
        "ws_id": workspace_id or "ws_telesol_default",
        "org": org_name or "TeleSol Global",
        "iat": int(time.time()),
        "exp": int(time.time()) + TOKEN_EXPIRATION_SECONDS,
    }
    json_bytes = json.dumps(payload, separators=(',', ':')).encode("utf-8")
    b64_payload = base64.urlsafe_b64encode(json_bytes).decode("ascii").rstrip("=")
    
    # Sign payload with HMAC-SHA256
    sig = hmac.new(AUTH_SECRET_KEY.encode("utf-8"), b64_payload.encode("utf-8"), hashlib.sha256).digest()
    b64_sig = base64.urlsafe_b64encode(sig).decode("ascii").rstrip("=")
    
    return f"{b64_payload}.{b64_sig}"


def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify a signed token and return the payload if valid and not expired."""
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        b64_payload, b64_sig = parts
        
        # Verify signature
        expected_sig = hmac.new(AUTH_SECRET_KEY.encode("utf-8"), b64_payload.encode("utf-8"), hashlib.sha256).digest()
        padding = 4 - (len(b64_sig) % 4) if len(b64_sig) % 4 != 0 else 0
        actual_sig = base64.urlsafe_b64decode(b64_sig + ("=" * padding))
        
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
            
        # Decode payload
        p_padding = 4 - (len(b64_payload) % 4) if len(b64_payload) % 4 != 0 else 0
        payload_json = base64.urlsafe_b64decode(b64_payload + ("=" * p_padding)).decode("utf-8")
        payload = json.loads(payload_json)
        
        # Check expiration
        if payload.get("exp", 0) < int(time.time()):
            logger.warning("[AUTH] Token expired for user %s", payload.get("usr"))
            return None

        # Check token blacklist (revoked on logout)
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1 FROM revoked_tokens WHERE token_hash = ?", (token_hash,))
            if cursor.fetchone():
                logger.warning("[AUTH] Revoked token used for user %s", payload.get("usr"))
                return None
            
        return payload
    except Exception as e:
        logger.warning("[AUTH] Token verification error: %s", str(e))
        return None


class SecurityAuditService:
    """Records tamper-evident chained audit records in the security_events table."""

    @staticmethod
    def record_event(
        event_type: str,
        actor_id: Optional[str] = None,
        actor_email: Optional[str] = None,
        target_resource: Optional[str] = None,
        action: Optional[str] = None,
        outcome: str = "SUCCESS",
        ip_address: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> str:
        """Append an event to the chained cryptographic audit log."""
        timestamp = datetime.now(timezone.utc).isoformat()
        details_json = json.dumps(details or {}, sort_keys=True)
        event_id = f"sec_ev_{int(time.time() * 1000)}_{secrets.token_hex(4)}"

        with db_session() as conn:
            cursor = conn.cursor()
            # Fetch latest hash
            cursor.execute("SELECT hash FROM security_events ORDER BY id DESC LIMIT 1")
            row = cursor.fetchone()
            prev_hash = row[0] if row and row[0] else "0" * 64

            # Compute new hash
            content_to_hash = f"{prev_hash}|{event_id}|{event_type}|{actor_id}|{action}|{outcome}|{timestamp}|{details_json}"
            current_hash = hashlib.sha256(content_to_hash.encode("utf-8")).hexdigest()

            cursor.execute(
                """
                INSERT INTO security_events (
                    id, event_type, actor_id, actor_email, target_resource,
                    action, outcome, ip_address, details, timestamp, prev_hash, hash
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event_id, event_type, actor_id, actor_email, target_resource,
                    action, outcome, ip_address, details_json, timestamp, prev_hash, current_hash
                )
            )
            conn.commit()

        logger.info("[AUDIT] %s | %s by %s -> %s (hash: %s)", event_type, action, actor_email or actor_id or "system", outcome, current_hash[:12])
        return current_hash


class AuthService:
    """Manages secure registration, email verification, login lockout, and RBAC."""

    @staticmethod
    def _check_login_rate_limit(identifier: str) -> None:
        """Enforce rate limits and temporary lockouts on login attempts."""
        now = time.time()
        identifier = identifier.strip().lower()
        attempts = _FAILED_LOGINS.get(identifier, [])
        # Keep attempts within lockout window
        attempts = [t for t in attempts if now - t < LOCKOUT_WINDOW_SECONDS]
        _FAILED_LOGINS[identifier] = attempts

        if len(attempts) >= LOCKOUT_THRESHOLD:
            oldest_relevant = attempts[0]
            remaining_lockout = int(LOCKOUT_DURATION_SECONDS - (now - oldest_relevant))
            if remaining_lockout > 0:
                SecurityAuditService.record_event(
                    event_type="ACCOUNT_LOCKOUT_TRIGGERED",
                    actor_email=identifier,
                    action="authenticate",
                    outcome="LOCKED_OUT",
                    details={"remaining_seconds": remaining_lockout}
                )
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Too many failed login attempts. Account temporarily locked for {remaining_lockout} seconds."
                )

    @staticmethod
    def _record_failed_login(identifier: str, ip_address: Optional[str] = None) -> None:
        """Record a failed login timestamp."""
        identifier = identifier.strip().lower()
        now = time.time()
        attempts = _FAILED_LOGINS.get(identifier, [])
        attempts.append(now)
        _FAILED_LOGINS[identifier] = attempts

        SecurityAuditService.record_event(
            event_type="LOGIN_FAILED",
            actor_email=identifier,
            action="authenticate",
            outcome="FAILURE",
            ip_address=ip_address,
            details={"failed_count": len(attempts)}
        )

    @staticmethod
    def _clear_failed_logins(identifier: str) -> None:
        """Clear failed login record on successful authentication."""
        identifier = identifier.strip().lower()
        _FAILED_LOGINS.pop(identifier, None)

    @staticmethod
    def revoke_token(token: str, user_id: Optional[str] = None) -> None:
        """Revoke a token immediately by recording its SHA-256 fingerprint in the blacklist."""
        clean_token = token.strip()
        token_hash = hashlib.sha256(clean_token.encode("utf-8")).hexdigest()
        now_iso = datetime.now(timezone.utc).isoformat()
        exp = int(time.time()) + TOKEN_EXPIRATION_SECONDS
        try:
            parts = clean_token.split(".")
            if len(parts) == 2:
                p_padding = 4 - (len(parts[0]) % 4) if len(parts[0]) % 4 != 0 else 0
                payload = json.loads(base64.urlsafe_b64decode(parts[0] + ("=" * p_padding)).decode("utf-8"))
                exp = payload.get("exp", exp)
                user_id = user_id or payload.get("uid")
        except Exception:
            pass

        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR IGNORE INTO revoked_tokens (token_hash, user_id, revoked_at, expires_at)
                VALUES (?, ?, ?, ?);
                """,
                (token_hash, user_id, now_iso, exp)
            )
            conn.commit()
        logger.info("[AUTH] Token revoked for user %s (hash: %s)", user_id or "unknown", token_hash[:12])

    @staticmethod
    def _check_registration_rate_limit(ip_address: Optional[str]) -> None:
        """Enforce rate limits on registration requests per IP to mitigate abuse."""
        if not ip_address:
            return
        now = time.time()
        history = _REGISTRATION_RATE_LIMITS.get(ip_address, [])
        history = [t for t in history if now - t < 3600]
        if len(history) >= MAX_REGISTRATIONS_PER_IP_PER_HOUR:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Registration rate limit exceeded for this network. Please try again later."
            )
        history.append(now)
        _REGISTRATION_RATE_LIMITS[ip_address] = history

    @staticmethod
    def register_user(
        email: str,
        password: str,
        full_name: str,
        username: Optional[str] = None,
        organization_name: Optional[str] = None,
        role: Optional[str] = None,
        auto_verify: bool = False,
        app_url: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Register a new user account with secure password hashing and email verification.
        Does NOT allow public registration of PLATFORM_ADMIN.
        """
        email = email.strip().lower()
        full_name = full_name.strip()
        AuthService._check_registration_rate_limit(ip_address)
        
        if not username:
            # Derive username from email prefix or full name
            base_user = email.split("@")[0].replace(".", "_")
            username = f"{base_user}_{secrets.token_hex(2)}"
        username = username.strip().lower()

        # Validation
        if len(username) < 3:
            raise ValueError("Username must be at least 3 characters long.")
        if "@" not in email or "." not in email:
            raise ValueError("Invalid email address format.")
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if len(full_name) < 2:
            raise ValueError("Full name is required.")

        # Role assignment - strictly disallow public self-assignment to PLATFORM_ADMIN
        requested_role = normalize_role(role) if role else None
        if requested_role in [ROLE_PLATFORM_ADMIN, "ADMIN"]:
            raise ValueError("Direct registration as PLATFORM_ADMIN is prohibited. Contact system administrator.")

        # Default role: If creating a new organization/workspace, WORKSPACE_OWNER; otherwise NOC_OPERATOR
        if organization_name and organization_name.strip():
            assigned_role = requested_role or ROLE_WORKSPACE_OWNER
        else:
            assigned_role = requested_role or ROLE_NOC_OPERATOR

        pwd_hash, salt = hash_password(password)
        user_id = f"usr_{int(time.time())}_{secrets.token_hex(4)}"
        now_iso = datetime.now(timezone.utc).isoformat()
        
        # Workspace management
        workspace_id = "ws_telesol_default"
        org_display_name = organization_name.strip() if organization_name else "TeleSol Global"
        
        with db_session() as conn:
            cursor = conn.cursor()
            # Check unique username and email
            cursor.execute("SELECT id FROM users WHERE username = ? OR email = ?", (username, email))
            if cursor.fetchone():
                raise ValueError("An account with this email or username already exists.")

            # If user provided a specific organization name, create a dedicated workspace
            if organization_name and organization_name.strip():
                workspace_id = f"ws_{secrets.token_hex(6)}"
                slug = organization_name.lower().replace(" ", "-")[:32]
                cursor.execute(
                    """
                    INSERT INTO workspaces (id, name, slug, owner_id, description, is_active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
                    """,
                    (workspace_id, organization_name.strip(), f"{slug}-{secrets.token_hex(3)}", user_id, f"Workspace for {organization_name.strip()}", now_iso, now_iso)
                )

            # Insert user record
            email_verified_flag = 1 if auto_verify else 0
            email_verified_at_val = now_iso if auto_verify else None

            cursor.execute(
                """
                INSERT INTO users (
                    id, username, email, password_hash, salt, full_name,
                    role, is_active, created_at, email_verified, email_verified_at,
                    workspace_id, org_name
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
                """,
                (
                    user_id, username, email, pwd_hash, salt, full_name,
                    assigned_role, now_iso, email_verified_flag, email_verified_at_val,
                    workspace_id, org_display_name
                )
            )

            # Insert workspace membership
            cursor.execute(
                """
                INSERT INTO workspace_memberships (id, workspace_id, user_id, role, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, 1, ?, ?)
                """,
                (f"mem_{secrets.token_hex(6)}", workspace_id, user_id, assigned_role, now_iso, now_iso)
            )

            # Create email verification token if not auto-verified
            verification_token = None
            if not auto_verify:
                verification_token = secrets.token_urlsafe(32)
                expires_at = (datetime.now(timezone.utc) + timedelta(hours=VERIFICATION_TOKEN_LIFETIME_HOURS)).isoformat()
                cursor.execute(
                    """
                    INSERT INTO verification_tokens (id, user_id, token, token_type, expires_at, created_at)
                    VALUES (?, ?, ?, 'EMAIL_VERIFY', ?, ?)
                    """,
                    (f"tok_{secrets.token_hex(6)}", user_id, verification_token, expires_at, now_iso)
                )

            conn.commit()

        # Audit Event
        SecurityAuditService.record_event(
            event_type="USER_REGISTERED",
            actor_id=user_id,
            actor_email=email,
            target_resource=f"user:{user_id}",
            action="register",
            outcome="SUCCESS",
            ip_address=ip_address,
            details={"role": assigned_role, "workspace_id": workspace_id, "auto_verified": auto_verify}
        )

        # Dispatch verification email if not auto-verified
        email_dispatch_result = None
        if not auto_verify and verification_token:
            try:
                email_dispatch_result = EmailService.send_verification_email(
                    recipient_email=email,
                    full_name=full_name,
                    verification_token=verification_token,
                    app_url=app_url
                )
            except Exception as e:
                logger.error("[AUTH] Verification email sending error: %s", str(e))

        logger.info("[AUTH] Registered new user %s (%s) with role %s", username, email, assigned_role)
        
        response_data = {
            "id": user_id,
            "username": username,
            "email": email,
            "full_name": full_name,
            "role": assigned_role,
            "workspace_id": workspace_id,
            "organization_name": org_display_name,
            "email_verified": bool(email_verified_flag),
            "created_at": now_iso
        }
        # In test / dev environments where email might not reach an inbox, include dev token in response for convenience
        if os.getenv("ENVIRONMENT", "development") != "production" and verification_token:
            response_data["_dev_verification_token"] = verification_token

        return response_data

    @staticmethod
    def verify_email(token: str, ip_address: Optional[str] = None) -> Dict[str, Any]:
        """Verify an email verification token and activate the user."""
        token = token.strip()
        now_iso = datetime.now(timezone.utc).isoformat()

        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, user_id, expires_at, used_at
                FROM verification_tokens
                WHERE token = ? AND token_type = 'EMAIL_VERIFY'
                """,
                (token,)
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("Invalid verification token.")

            tok_id, user_id, expires_at, used_at = row
            if used_at:
                raise ValueError("Verification token has already been used.")

            if expires_at < now_iso:
                raise ValueError("Verification token has expired. Please request a new one.")

            # Mark token as used
            cursor.execute("UPDATE verification_tokens SET used_at = ? WHERE id = ?", (now_iso, tok_id))

            # Mark user as verified
            cursor.execute(
                """
                UPDATE users
                SET email_verified = 1, email_verified_at = ?
                WHERE id = ?
                """,
                (now_iso, user_id)
            )
            conn.commit()

            cursor.execute("SELECT email, username, full_name, role, workspace_id FROM users WHERE id = ?", (user_id,))
            user = cursor.fetchone()

        SecurityAuditService.record_event(
            event_type="EMAIL_VERIFIED",
            actor_id=user_id,
            actor_email=user["email"] if user else None,
            target_resource=f"user:{user_id}",
            action="verify_email",
            outcome="SUCCESS",
            ip_address=ip_address
        )

        return {
            "status": "success",
            "message": "Email address successfully verified. You may now access the operational console.",
            "user_id": user_id,
            "email": user["email"] if user else None
        }

    @staticmethod
    def resend_verification(email: str, app_url: Optional[str] = None, ip_address: Optional[str] = None) -> Dict[str, Any]:
        """Generate and dispatch a new verification token for an unverified user."""
        email = email.strip().lower()
        now_iso = datetime.now(timezone.utc).isoformat()

        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, full_name, email_verified FROM users WHERE email = ?", (email,))
            user = cursor.fetchone()

            if not user:
                # Return generic message to prevent account enumeration
                return {"status": "success", "message": "If an unverified account exists with that email, a verification link has been sent."}

            if user["email_verified"]:
                return {"status": "success", "message": "This account is already verified. You can log in directly."}

            user_id = user["id"]
            full_name = user["full_name"]

            # Invalidate older verification tokens for this user
            cursor.execute(
                "UPDATE verification_tokens SET used_at = ? WHERE user_id = ? AND token_type = 'EMAIL_VERIFY' AND used_at IS NULL",
                (now_iso, user_id)
            )

            # Create fresh token
            new_token = secrets.token_urlsafe(32)
            expires_at = (datetime.now(timezone.utc) + timedelta(hours=VERIFICATION_TOKEN_LIFETIME_HOURS)).isoformat()
            cursor.execute(
                """
                INSERT INTO verification_tokens (id, user_id, token, token_type, expires_at, created_at)
                VALUES (?, ?, ?, 'EMAIL_VERIFY', ?, ?)
                """,
                (f"tok_{secrets.token_hex(6)}", user_id, new_token, expires_at, now_iso)
            )
            conn.commit()

        # Send email
        try:
            EmailService.send_verification_email(
                recipient_email=email,
                full_name=full_name,
                verification_token=new_token,
                app_url=app_url
            )
        except EmailRateLimitExceeded as e:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(e))
        except Exception as e:
            logger.error("[AUTH] Resend verification email failed: %s", str(e))

        SecurityAuditService.record_event(
            event_type="VERIFICATION_RESENT",
            actor_id=user_id,
            actor_email=email,
            action="resend_verification",
            outcome="SUCCESS",
            ip_address=ip_address
        )

        res = {"status": "success", "message": "Verification email sent."}
        if os.getenv("ENVIRONMENT", "development") != "production":
            res["_dev_verification_token"] = new_token
        return res

    @staticmethod
    def request_password_reset(email: str, app_url: Optional[str] = None, ip_address: Optional[str] = None) -> Dict[str, Any]:
        """Initiate password reset flow. Returns generic message to prevent account enumeration."""
        email = email.strip().lower()
        now_iso = datetime.now(timezone.utc).isoformat()
        reset_token = None

        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, full_name, is_active FROM users WHERE email = ?", (email,))
            user = cursor.fetchone()

            if user and user["is_active"]:
                user_id = user["id"]
                full_name = user["full_name"]

                # Invalidate existing unused password reset tokens
                cursor.execute(
                    "UPDATE verification_tokens SET used_at = ? WHERE user_id = ? AND token_type = 'PASSWORD_RESET' AND used_at IS NULL",
                    (now_iso, user_id)
                )

                # Create 1-hour single-use reset token
                reset_token = secrets.token_urlsafe(32)
                expires_at = (datetime.now(timezone.utc) + timedelta(hours=RESET_TOKEN_LIFETIME_HOURS)).isoformat()
                cursor.execute(
                    """
                    INSERT INTO verification_tokens (id, user_id, token, token_type, expires_at, created_at)
                    VALUES (?, ?, ?, 'PASSWORD_RESET', ?, ?)
                    """,
                    (f"tok_{secrets.token_hex(6)}", user_id, reset_token, expires_at, now_iso)
                )
                conn.commit()

                # Dispatch reset email
                try:
                    EmailService.send_password_reset_email(
                        recipient_email=email,
                        full_name=full_name,
                        reset_token=reset_token,
                        app_url=app_url
                    )
                except EmailRateLimitExceeded as e:
                    raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(e))
                except Exception as e:
                    logger.error("[AUTH] Password reset email dispatch failed: %s", str(e))

                SecurityAuditService.record_event(
                    event_type="PASSWORD_RESET_REQUESTED",
                    actor_id=user_id,
                    actor_email=email,
                    action="request_password_reset",
                    outcome="SUCCESS",
                    ip_address=ip_address
                )

        # Always return generic message
        res = {
            "status": "success",
            "message": "If an active account exists for this email address, password reset instructions have been dispatched."
        }
        if os.getenv("ENVIRONMENT", "development") != "production" and reset_token:
            res["_dev_reset_token"] = reset_token
        return res

    @staticmethod
    def reset_password(token: str, new_password: str, ip_address: Optional[str] = None) -> Dict[str, Any]:
        """Complete password reset using valid single-use token."""
        token = token.strip()
        now_iso = datetime.now(timezone.utc).isoformat()

        if len(new_password) < 8:
            raise ValueError("New password must be at least 8 characters long.")

        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, user_id, expires_at, used_at
                FROM verification_tokens
                WHERE token = ? AND token_type = 'PASSWORD_RESET'
                """,
                (token,)
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("Invalid or expired password reset token.")

            tok_id, user_id, expires_at, used_at = row
            if used_at:
                raise ValueError("This password reset token has already been used.")

            if expires_at < now_iso:
                raise ValueError("This password reset token has expired. Please request a new one.")

            # Invalidate token
            cursor.execute("UPDATE verification_tokens SET used_at = ? WHERE id = ?", (now_iso, tok_id))

            # Hash new password with fresh salt
            new_hash, new_salt = hash_password(new_password)
            cursor.execute(
                "UPDATE users SET password_hash = ?, salt = ? WHERE id = ?",
                (new_hash, new_salt, user_id)
            )
            conn.commit()

            cursor.execute("SELECT email FROM users WHERE id = ?", (user_id,))
            user_row = cursor.fetchone()

        SecurityAuditService.record_event(
            event_type="PASSWORD_RESET_COMPLETED",
            actor_id=user_id,
            actor_email=user_row["email"] if user_row else None,
            action="reset_password",
            outcome="SUCCESS",
            ip_address=ip_address
        )

        return {"status": "success", "message": "Password successfully updated. You may now log in with your new credentials."}

    @staticmethod
    def authenticate_user(
        login_identifier: str,
        password: str,
        ip_address: Optional[str] = None,
        enforce_email_verified: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Authenticate by username or email.
        Applies lockout rate-limiting and constant-time dummy comparisons.
        """
        login_identifier = login_identifier.strip().lower()
        AuthService._check_login_rate_limit(login_identifier)

        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, username, email, password_hash, salt, full_name, role,
                       is_active, email_verified, workspace_id, org_name
                FROM users
                WHERE (username = ? OR email = ?) AND is_active = 1
                """,
                (login_identifier, login_identifier)
            )
            row = cursor.fetchone()

        if not row:
            # Constant-time dummy verification to mitigate timing attacks
            hash_password(password, "0" * 32)
            AuthService._record_failed_login(login_identifier, ip_address)
            return None

        user = dict(row)
        if not verify_password(password, user["password_hash"], user["salt"]):
            AuthService._record_failed_login(login_identifier, ip_address)
            return None

        # Check if email verification is enforced
        if enforce_email_verified and not user.get("email_verified"):
            SecurityAuditService.record_event(
                event_type="LOGIN_REJECTED_UNVERIFIED",
                actor_id=user["id"],
                actor_email=user["email"],
                action="authenticate",
                outcome="REJECTED_UNVERIFIED",
                ip_address=ip_address
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email address has not been verified. Please verify your email before accessing the console."
            )

        # Clear failed login history upon success
        AuthService._clear_failed_logins(login_identifier)

        # Update last login timestamp
        now_iso = datetime.now(timezone.utc).isoformat()
        with db_session() as conn:
            conn.execute("UPDATE users SET last_login_at = ? WHERE id = ?", (now_iso, user["id"]))
            conn.commit()

        normalized_role = normalize_role(user["role"])
        token = create_access_token(
            user_id=user["id"],
            username=user["username"],
            email=user["email"],
            role=normalized_role,
            workspace_id=user.get("workspace_id"),
            org_name=user.get("org_name")
        )

        SecurityAuditService.record_event(
            event_type="LOGIN_SUCCESS",
            actor_id=user["id"],
            actor_email=user["email"],
            action="authenticate",
            outcome="SUCCESS",
            ip_address=ip_address,
            details={"role": normalized_role, "workspace_id": user.get("workspace_id")}
        )

        return {
            "token": token,
            "token_type": "Bearer",
            "expires_in": TOKEN_EXPIRATION_SECONDS,
            "user": {
                "id": user["id"],
                "username": user["username"],
                "email": user["email"],
                "full_name": user["full_name"],
                "role": normalized_role,
                "workspace_id": user.get("workspace_id", "ws_telesol_default"),
                "org_name": user.get("org_name", "TeleSol Global"),
                "email_verified": bool(user.get("email_verified", 1)),
                "last_login_at": now_iso
            }
        }

    @staticmethod
    def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve user profile by ID without exposing password hash or salt."""
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, username, email, full_name, role, is_active,
                       email_verified, workspace_id, org_name, created_at, last_login_at
                FROM users WHERE id = ?
                """,
                (user_id,)
            )
            row = cursor.fetchone()
        if not row:
            return None
        res = dict(row)
        res["role"] = normalize_role(res["role"])
        res["email_verified"] = bool(res.get("email_verified", 0))
        return res

    @staticmethod
    def seed_default_accounts():
        """Seed initial development and operator credentials safely if not present."""
        default_operator = {
            "username": "operator",
            "email": "operator@telesol.io",
            "password": "senpay-telecom-2026",
            "full_name": "SENPAY Lead NOC Engineer",
            "role": ROLE_NOC_OPERATOR,
            "auto_verify": True
        }
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM users WHERE username = ? OR email = ?", (default_operator["username"], default_operator["email"]))
            if not cursor.fetchone():
                AuthService.register_user(**default_operator)
                logger.info("[AUTH] Seeded default development operator account: operator@telesol.io")

            # Also seed default development administrator for sandbox evaluation
            default_admin_email = os.getenv("SENPAY_ADMIN_EMAIL", "admin@telesol.io").strip().lower()
            default_admin_pass = os.getenv("SENPAY_ADMIN_PASSWORD", "SenPayAdmin2026!")
            cursor.execute("SELECT id FROM users WHERE email = ? OR username = 'admin'", (default_admin_email,))
            if not cursor.fetchone():
                now_iso = datetime.now(timezone.utc).isoformat()
                pwd_hash, salt = hash_password(default_admin_pass)
                user_id = f"usr_admin_{secrets.token_hex(4)}"
                cursor.execute(
                    """
                    INSERT INTO users (
                        id, username, email, password_hash, salt, full_name,
                        role, is_active, email_verified, workspace_id, created_at, updated_at
                    ) VALUES (?, 'admin', ?, ?, ?, 'SENPAY Platform Administrator', ?, 1, 1, 'ws_telesol_default', ?, ?)
                    """,
                    (user_id, default_admin_email, pwd_hash, salt, ROLE_PLATFORM_ADMIN, now_iso, now_iso)
                )
                conn.commit()
                logger.info("[AUTH] Seeded default development admin account: %s", default_admin_email)


# FastAPI Dependency for protecting authenticated endpoints
async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Extract and validate Bearer token from Authorization header."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided. Include 'Authorization: Bearer <token>' header.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Expected 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = parts[1]
    claims = verify_access_token(token)
    if not claims:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid, expired, or tampered access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = AuthService.get_user_by_id(claims["uid"])
    if not user or not user.get("is_active"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user account is inactive or no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_role(allowed_roles: List[str]):
    """Factory dependency to enforce role requirements on endpoints."""
    normalized_allowed = [normalize_role(r) for r in allowed_roles]

    async def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = normalize_role(current_user.get("role", ""))
        if user_role not in normalized_allowed and user_role != ROLE_PLATFORM_ADMIN:
            SecurityAuditService.record_event(
                event_type="UNAUTHORIZED_ACCESS_BLOCKED",
                actor_id=current_user.get("id"),
                actor_email=current_user.get("email"),
                action="role_check",
                outcome="FORBIDDEN",
                details={"user_role": user_role, "required_roles": normalized_allowed}
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {', '.join(normalized_allowed)}"
            )
        return current_user

    return role_checker


# Specific role dependencies for fast routing guards
require_admin = require_role([ROLE_PLATFORM_ADMIN])
require_noc_or_admin = require_role([ROLE_PLATFORM_ADMIN, ROLE_WORKSPACE_OWNER, ROLE_NOC_OPERATOR])
require_finance_or_admin = require_role([ROLE_PLATFORM_ADMIN, ROLE_WORKSPACE_OWNER, ROLE_FINANCE])
require_analyst_or_above = require_role([ROLE_PLATFORM_ADMIN, ROLE_WORKSPACE_OWNER, ROLE_NOC_OPERATOR, ROLE_FINANCE, ROLE_ANALYST])
