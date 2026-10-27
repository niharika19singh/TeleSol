"""
SENPAY Authentication & Access Control Service
═════════════════════════════════════════════════
Implements secure user authentication, password hashing, and token verification:
- Password Hashing: PBKDF2-HMAC-SHA256 (100,000 iterations + 16-byte cryptographic salt)
- Signed Session Tokens: Cryptographic HMAC-SHA256 URL-safe tokens with 24-hour expiration
- Persistent User Storage in SQLite DB
- Server-side input validation and timing-attack resistant comparisons
- Role-based access control (ADMIN, OPERATOR, ANALYST)
- Default seeded development operator account
"""

import os
import hmac
import base64
import json
import time
import secrets
import hashlib
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Header, status
from app.paypilot.db import db_session

logger = logging.getLogger("telesol.auth")

# Secret for signing session tokens; defaults to a persistent environment secret
AUTH_SECRET_KEY = os.getenv("SENPAY_AUTH_SECRET", "senpay-auth-token-signing-secret-2026-telecom-key")
TOKEN_EXPIRATION_SECONDS = 86400  # 24 hours


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
    """Verify that a plaintext password matches the stored hash."""
    expected_hash, _ = hash_password(plain_password, salt)
    return hmac.compare_digest(expected_hash, password_hash)


def create_access_token(user_id: str, username: str, email: str, role: str) -> str:
    """Generate a tamper-evident signed token containing user claims and expiration."""
    payload = {
        "uid": user_id,
        "usr": username,
        "eml": email,
        "rol": role,
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
        # Decode provided signature with padding
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
            
        return payload
    except Exception as e:
        logger.warning("[AUTH] Token verification error: %s", str(e))
        return None


class AuthService:
    """Manages user registration, authentication, and database persistence."""

    @staticmethod
    def register_user(username: str, email: str, password: str, full_name: str, role: str = "OPERATOR") -> Dict[str, Any]:
        """Create a new user account with hashed password and store in database."""
        username = username.strip().lower()
        email = email.strip().lower()
        
        if len(username) < 3:
            raise ValueError("Username must be at least 3 characters long.")
        if "@" not in email or "." not in email:
            raise ValueError("Invalid email address format.")
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters long.")

        pwd_hash, salt = hash_password(password)
        user_id = f"usr_{int(time.time())}_{secrets.token_hex(4)}"
        now_iso = datetime.now(timezone.utc).isoformat()

        with db_session() as conn:
            cursor = conn.cursor()
            # Check existing username or email
            cursor.execute("SELECT id FROM users WHERE username = ? OR email = ?", (username, email))
            existing = cursor.fetchone()
            if existing:
                raise ValueError("An account with this username or email already exists.")

            cursor.execute(
                """
                INSERT INTO users (id, username, email, password_hash, salt, full_name, role, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
                """,
                (user_id, username, email, pwd_hash, salt, full_name, role, now_iso)
            )
            conn.commit()

        logger.info("[AUTH] Registered new user %s (role: %s)", username, role)
        return {
            "id": user_id,
            "username": username,
            "email": email,
            "full_name": full_name,
            "role": role,
            "created_at": now_iso
        }

    @staticmethod
    def authenticate_user(login_identifier: str, password: str) -> Optional[Dict[str, Any]]:
        """
        Authenticate by username or email.
        Uses generic error returns to prevent account enumeration.
        """
        login_identifier = login_identifier.strip().lower()
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, username, email, password_hash, salt, full_name, role, is_active
                FROM users
                WHERE (username = ? OR email = ?) AND is_active = 1
                """,
                (login_identifier, login_identifier)
            )
            row = cursor.fetchone()

        if not row:
            # Constant-time dummy verification to mitigate timing attacks
            hash_password(password, "0" * 32)
            return None

        user = dict(row)
        if not verify_password(password, user["password_hash"], user["salt"]):
            return None

        # Update last login timestamp
        now_iso = datetime.now(timezone.utc).isoformat()
        with db_session() as conn:
            conn.execute("UPDATE users SET last_login_at = ? WHERE id = ?", (now_iso, user["id"]))
            conn.commit()

        token = create_access_token(user["id"], user["username"], user["email"], user["role"])
        return {
            "token": token,
            "token_type": "Bearer",
            "expires_in": TOKEN_EXPIRATION_SECONDS,
            "user": {
                "id": user["id"],
                "username": user["username"],
                "email": user["email"],
                "full_name": user["full_name"],
                "role": user["role"],
                "last_login_at": now_iso
            }
        }

    @staticmethod
    def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve user profile by ID without exposing password hash or salt."""
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, username, email, full_name, role, is_active, created_at, last_login_at FROM users WHERE id = ?",
                (user_id,)
            )
            row = cursor.fetchone()
        return dict(row) if row else None

    @staticmethod
    def seed_default_accounts():
        """Seed initial development and operator credentials safely if not present."""
        default_operator = {
            "username": "operator",
            "email": "operator@telesol.io",
            "password": "senpay-telecom-2026",
            "full_name": "SENPAY Lead NOC Engineer",
            "role": "OPERATOR"
        }
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM users WHERE username = ? OR email = ?", (default_operator["username"], default_operator["email"]))
            if not cursor.fetchone():
                AuthService.register_user(**default_operator)
                logger.info("[AUTH] Seeded default development operator account: operator@telesol.io")


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
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user account no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
