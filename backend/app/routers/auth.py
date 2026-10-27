"""
SENPAY Authentication Router
═══════════════════════════════
Provides real login, registration, and user session verification:
- POST /api/auth/login (Authenticates operator, returns JWT token)
- POST /api/auth/register (Registers new user with validation)
- GET  /api/auth/me (Returns authenticated user profile)
- POST /api/auth/logout (Session logout confirmation)
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field

from app.services.auth_service import AuthService, get_current_user, create_access_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username_or_email: str = Field(..., description="Username or registered email address")
    password: str = Field(..., min_length=6, description="Account password")


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", description="Valid operator email address")
    password: str = Field(..., min_length=8, description="Strong password (at least 8 chars)")
    full_name: str = Field(..., min_length=2, max_length=100, description="Operator full name")
    role: Optional[str] = Field("OPERATOR", description="Account role: ADMIN, OPERATOR, or ANALYST")


@router.post("/login")
async def login(payload: LoginRequest):
    """
    Authenticate an operator or user with username/email and password.
    Returns a signed cryptographic JWT session token on success.
    """
    auth_result = AuthService.authenticate_user(
        login_identifier=payload.username_or_email,
        password=payload.password
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
async def register(payload: RegisterRequest):
    """
    Register a new user or operator.
    Validates input constraints, hashes password with PBKDF2, and persists account.
    Returns access token for immediate seamless authentication.
    """
    try:
        user = AuthService.register_user(
            username=payload.username,
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
            role=payload.role or "OPERATOR"
        )
        token = create_access_token(user["id"], user["username"], user["email"], user["role"])
        return {
            "status": "success",
            "message": "Account successfully created.",
            "token": token,
            "access_token": token,
            "token_type": "Bearer",
            "expires_in": 86400,
            "user": user,
            **user
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/me")
async def get_current_user_profile(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get profile of the currently authenticated operator.
    Requires 'Authorization: Bearer <token>' header.
    """
    return {
        "status": "authenticated",
        "user": user,
        **user
    }


@router.post("/logout")
async def logout(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Log out the current user and invalidate the frontend session.
    """
    return {
        "status": "success",
        "message": f"User {user.get('username')} logged out successfully."
    }
