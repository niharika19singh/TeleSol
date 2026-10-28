"""
SENPAY Authentication Router
═══════════════════════════════
Provides real login, registration, email verification, password reset,
session inspection, and secure administrator bootstrap:
- POST /api/auth/login
- POST /api/auth/register
- POST /api/auth/verify-email
- GET  /api/auth/verify-email
- POST /api/auth/resend-verification
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- GET  /api/auth/me
- POST /api/auth/logout
- POST /api/auth/bootstrap-admin
"""

import os
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Request, status
from pydantic import BaseModel, Field, EmailStr

from app.services.auth_service import (
    AuthService,
    SecurityAuditService,
    get_current_user,
    create_access_token,
    ROLE_PLATFORM_ADMIN,
    ROLE_NOC_OPERATOR,
    ROLE_WORKSPACE_OWNER
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username_or_email: str = Field(..., description="Username or registered email address")
    password: str = Field(..., min_length=6, description="Account password")


class RegisterRequest(BaseModel):
    email: str = Field(..., description="Valid operator or organization email address")
    password: str = Field(..., min_length=8, description="Strong password (at least 8 chars)")
    full_name: str = Field(..., min_length=2, max_length=100, description="User full name")
    username: Optional[str] = Field(None, max_length=50, description="Optional unique username")
    organization_name: Optional[str] = Field(None, max_length=100, description="Organization or workspace name")
    role: Optional[str] = Field(None, description="Requested role (defaults to NOC_OPERATOR or WORKSPACE_OWNER)")
    auto_verify: Optional[bool] = Field(False, description="Auto-verify account (for testing environments)")


class VerifyEmailRequest(BaseModel):
    token: str = Field(..., min_length=16, description="Single-use email verification token")


class ResendVerificationRequest(BaseModel):
    email: str = Field(..., description="Registered email address")


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., description="Registered email address")


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=16, description="Single-use password reset token")
    new_password: str = Field(..., min_length=8, description="New strong password")


class BootstrapAdminRequest(BaseModel):
    email: str = Field(..., description="Admin email address")
    password: str = Field(..., min_length=8, description="Admin password")
    full_name: str = Field(..., min_length=2, description="Admin full name")
    bootstrap_token: Optional[str] = Field(None, description="One-time system bootstrap token if configured")


def get_client_ip(request: Request) -> str:
    """Extract client IP address safely from headers."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


@router.post("/login")
async def login(payload: LoginRequest, request: Request):
    """
    Authenticate an operator or user with username/email and password.
    Returns a signed cryptographic JWT session token on success.
    """
    client_ip = get_client_ip(request)
    auth_result = AuthService.authenticate_user(
        login_identifier=payload.username_or_email,
        password=payload.password,
        ip_address=client_ip
    )
    if not auth_result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {
        "status": "success",
        "message": "Authentication successful",
        **auth_result
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, request: Request):
    """
    Register a new user or organization workspace.
    Validates input constraints, hashes password with PBKDF2, and creates verification token.
    """
    client_ip = get_client_ip(request)
    try:
        user = AuthService.register_user(
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
            username=payload.username,
            organization_name=payload.organization_name,
            role=payload.role,
            auto_verify=payload.auto_verify or (os.getenv("SENPAY_AUTO_VERIFY", "false").lower() == "true"),
            ip_address=client_ip
        )
        token = None
        if user.get("email_verified"):
            token = create_access_token(
                user_id=user["id"],
                username=user["username"],
                email=user["email"],
                role=user["role"],
                workspace_id=user["workspace_id"],
                org_name=user["organization_name"]
            )
        return {
            "status": "success",
            "message": "Account successfully registered. Please verify your email." if not token else "Account successfully registered.",
            "token": token,
            "access_token": token,
            "token_type": "Bearer" if token else None,
            "expires_in": 86400 if token else None,
            "user": user,
            **user
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/verify-email")
async def verify_email_post(payload: VerifyEmailRequest, request: Request):
    """Verify email address with single-use verification token."""
    client_ip = get_client_ip(request)
    try:
        result = AuthService.verify_email(token=payload.token, ip_address=client_ip)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/verify-email")
async def verify_email_get(token: str, request: Request):
    """Verify email address via GET query param (direct browser link)."""
    client_ip = get_client_ip(request)
    try:
        result = AuthService.verify_email(token=token, ip_address=client_ip)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/resend-verification")
async def resend_verification(payload: ResendVerificationRequest, request: Request):
    """Resend email verification token with rate limiting."""
    client_ip = get_client_ip(request)
    return AuthService.resend_verification(email=payload.email, ip_address=client_ip)


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, request: Request):
    """Request a password reset link (constant-time generic response to prevent user enumeration)."""
    client_ip = get_client_ip(request)
    return AuthService.request_password_reset(email=payload.email, ip_address=client_ip)


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, request: Request):
    """Reset password using single-use reset token."""
    client_ip = get_client_ip(request)
    try:
        return AuthService.reset_password(token=payload.token, new_password=payload.new_password, ip_address=client_ip)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/me")
async def get_current_user_profile(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get profile of the currently authenticated user.
    Requires 'Authorization: Bearer <token>' header.
    """
    return {
        "status": "authenticated",
        "user": user,
        **user
    }


@router.post("/logout")
async def logout(request: Request, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Terminate session, revoke JWT token in blacklist, and record logout event in security audit trail.
    """
    client_ip = get_client_ip(request)
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        AuthService.revoke_token(token, user_id=user["id"])

    SecurityAuditService.record_event(
        event_type="LOGOUT",
        actor_id=user["id"],
        actor_email=user["email"],
        action="logout",
        outcome="SUCCESS",
        ip_address=client_ip
    )
    return {
        "status": "success",
        "message": "Session successfully terminated.",
        "user_id": user["id"]
    }


@router.post("/bootstrap-admin")
async def bootstrap_admin_endpoint(payload: BootstrapAdminRequest, request: Request):
    """
    Guarded endpoint to initialize the primary platform administrator.
    Permanently disabled once any PLATFORM_ADMIN account exists, or requires SENPAY_BOOTSTRAP_TOKEN.
    """
    from app.cli.bootstrap_admin import bootstrap_admin
    from app.paypilot.db import db_session

    env_bootstrap_token = os.getenv("SENPAY_BOOTSTRAP_TOKEN")
    if env_bootstrap_token and payload.bootstrap_token != env_bootstrap_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid bootstrap token.")

    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE role IN ('PLATFORM_ADMIN', 'ADMIN') AND is_active = 1")
        existing = cursor.fetchall()
        if existing and not env_bootstrap_token:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Platform administrator already bootstrapped. Further admin accounts must be created from the Admin Console."
            )

    success = bootstrap_admin(payload.email, payload.password, payload.full_name, force=bool(env_bootstrap_token))
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin bootstrap failed.")

    return {"status": "success", "message": f"Administrator {payload.email} provisioned successfully."}
