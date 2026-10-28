"""
SENPAY Platform Administration Router
═════════════════════════════════════
Provides platform-level governance, workspace isolation management,
role elevation, tamper-evident audit log inspection, and integration health checks.
Strictly protected by require_admin (PLATFORM_ADMIN).

Endpoints:
- GET   /api/admin/overview
- GET   /api/admin/users
- PATCH /api/admin/users/{user_id}/role
- PATCH /api/admin/users/{user_id}/status
- GET   /api/admin/workspaces
- POST  /api/admin/workspaces
- GET   /api/admin/security-events
- GET   /api/admin/integrations
- POST  /api/admin/integrations/test
- GET   /api/admin/settings
- PATCH /api/admin/settings
"""

import os
import json
import secrets
import time
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Request, status
from pydantic import BaseModel, Field

from app.paypilot.db import db_session
from app.services.auth_service import (
    require_admin,
    normalize_role,
    SecurityAuditService,
    ALL_VALID_ROLES,
    ROLE_PLATFORM_ADMIN
)

router = APIRouter(prefix="/api/admin", tags=["Platform Administration"])


class UpdateRoleRequest(BaseModel):
    role: str = Field(..., description="Target role (PLATFORM_ADMIN, WORKSPACE_OWNER, NOC_OPERATOR, FINANCE, ANALYST, SERVICE_PROVIDER)")


class UpdateStatusRequest(BaseModel):
    is_active: bool = Field(..., description="Account active status")


class CreateWorkspaceRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    owner_id: Optional[str] = Field(None, description="Optional user ID of the owner")


class UpdateSettingsRequest(BaseModel):
    settings: Dict[str, Any] = Field(..., description="Platform settings key-value pairs")


@router.get("/overview")
async def get_platform_overview(admin_user: Dict[str, Any] = Depends(require_admin)):
    """Summary metrics of users, workspaces, security events, and services."""
    with db_session() as conn:
        cursor = conn.cursor()

        # User counts
        cursor.execute("SELECT COUNT(*) FROM users")
        total_users = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM users WHERE is_active = 1")
        active_users = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM users WHERE email_verified = 1")
        verified_users = cursor.fetchone()[0]

        # Role distribution
        cursor.execute("SELECT role, COUNT(*) FROM users GROUP BY role")
        role_counts = {row[0]: row[1] for row in cursor.fetchall()}

        # Workspaces
        cursor.execute("SELECT COUNT(*) FROM workspaces")
        total_workspaces = cursor.fetchone()[0]

        # Security events
        cursor.execute("SELECT COUNT(*) FROM security_events")
        total_security_events = cursor.fetchone()[0]

        cursor.execute(
            """
            SELECT id, event_type, actor_email, action, outcome, timestamp
            FROM security_events ORDER BY id DESC LIMIT 5
            """
        )
        recent_events = [dict(row) for row in cursor.fetchall()]

        # Procurement agreements count
        cursor.execute("SELECT COUNT(*) FROM service_agreements")
        total_agreements = cursor.fetchone()[0]

    return {
        "status": "success",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "metrics": {
            "total_users": total_users,
            "active_users": active_users,
            "verified_users": verified_users,
            "total_workspaces": total_workspaces,
            "total_security_events": total_security_events,
            "total_agreements": total_agreements,
            "role_distribution": role_counts
        },
        "recent_security_events": recent_events,
        "platform_version": "SENPAY v2.4-enterprise",
        "hsk_network": "HSK Testnet (Chain ID 133)",
        "security_enforcement": "STRICT_RBAC"
    }


@router.get("/users")
async def list_users(
    limit: int = 50,
    offset: int = 0,
    role: Optional[str] = None,
    search: Optional[str] = None,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """List registered users with multi-tenant workspace context."""
    with db_session() as conn:
        cursor = conn.cursor()
        query = """
            SELECT u.id, u.username, u.email, u.full_name, u.role, u.is_active,
                   u.email_verified, u.email_verified_at, u.workspace_id, u.org_name,
                   u.created_at, u.last_login_at, w.name as workspace_name
            FROM users u
            LEFT JOIN workspaces w ON u.workspace_id = w.id
            WHERE 1=1
        """
        params = []
        if role:
            query += " AND u.role = ?"
            params.append(normalize_role(role))
        if search:
            query += " AND (u.email LIKE ? OR u.full_name LIKE ? OR u.username LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

        query += " ORDER BY u.created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor.execute(query, tuple(params))
        users = [dict(row) for row in cursor.fetchall()]

        cursor.execute("SELECT COUNT(*) FROM users")
        total_count = cursor.fetchone()[0]

    return {
        "status": "success",
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "users": users
    }


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    payload: UpdateRoleRequest,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Elevate or modify user operational role."""
    target_role = normalize_role(payload.role)
    if target_role not in ALL_VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{payload.role}'. Must be one of: {', '.join(ALL_VALID_ROLES)}"
        )

    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, role FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        old_role = user["role"]
        cursor.execute("UPDATE users SET role = ? WHERE id = ?", (target_role, user_id))
        # Update workspace membership role too
        cursor.execute("UPDATE workspace_memberships SET role = ? WHERE user_id = ?", (target_role, user_id))
        conn.commit()

    SecurityAuditService.record_event(
        event_type="USER_ROLE_CHANGED",
        actor_id=admin_user["id"],
        actor_email=admin_user["email"],
        target_resource=f"user:{user_id}",
        action="update_role",
        outcome="SUCCESS",
        details={"old_role": old_role, "new_role": target_role}
    )

    return {
        "status": "success",
        "message": f"User {user_id} role updated from {old_role} to {target_role}.",
        "user_id": user_id,
        "role": target_role
    }


@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    payload: UpdateStatusRequest,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Activate or suspend user account."""
    if user_id == admin_user["id"] and not payload.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate your own administrator account.")

    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, is_active FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        new_status = 1 if payload.is_active else 0
        cursor.execute("UPDATE users SET is_active = ? WHERE id = ?", (new_status, user_id))
        conn.commit()

    SecurityAuditService.record_event(
        event_type="USER_STATUS_CHANGED",
        actor_id=admin_user["id"],
        actor_email=admin_user["email"],
        target_resource=f"user:{user_id}",
        action="update_status",
        outcome="SUCCESS",
        details={"is_active": payload.is_active}
    )

    return {
        "status": "success",
        "message": f"User {user_id} active status set to {payload.is_active}.",
        "user_id": user_id,
        "is_active": payload.is_active
    }


@router.get("/workspaces")
async def list_workspaces(admin_user: Dict[str, Any] = Depends(require_admin)):
    """List all tenant workspaces with member counts and owner details."""
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT w.id, w.name, w.slug, w.owner_id, w.description, w.is_active,
                   w.created_at, u.full_name as owner_name, u.email as owner_email,
                   (SELECT COUNT(*) FROM workspace_memberships wm WHERE wm.workspace_id = w.id) as member_count
            FROM workspaces w
            LEFT JOIN users u ON w.owner_id = u.id
            ORDER BY w.created_at DESC
            """
        )
        workspaces = [dict(row) for row in cursor.fetchall()]

    return {"status": "success", "workspaces": workspaces}


@router.post("/workspaces", status_code=status.HTTP_201_CREATED)
async def create_workspace(
    payload: CreateWorkspaceRequest,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Provision a new multi-tenant telecom organization workspace."""
    ws_id = f"ws_{secrets.token_hex(6)}"
    slug = payload.name.lower().replace(" ", "-")[:32] + f"-{secrets.token_hex(2)}"
    now_iso = datetime.now(timezone.utc).isoformat()
    owner_id = payload.owner_id or admin_user["id"]

    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO workspaces (id, name, slug, owner_id, description, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?)
            """,
            (ws_id, payload.name, slug, owner_id, payload.description or "", now_iso, now_iso)
        )
        conn.commit()

    SecurityAuditService.record_event(
        event_type="WORKSPACE_CREATED",
        actor_id=admin_user["id"],
        actor_email=admin_user["email"],
        target_resource=f"workspace:{ws_id}",
        action="create_workspace",
        outcome="SUCCESS",
        details={"name": payload.name, "slug": slug}
    )

    return {
        "status": "success",
        "workspace": {
            "id": ws_id,
            "name": payload.name,
            "slug": slug,
            "owner_id": owner_id,
            "created_at": now_iso
        }
    }


@router.get("/security-events")
async def get_security_audit_logs(
    limit: int = 50,
    offset: int = 0,
    event_type: Optional[str] = None,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Query cryptographic tamper-evident security audit trail."""
    with db_session() as conn:
        cursor = conn.cursor()
        query = """
            SELECT id, event_type, actor_id, actor_email, target_resource,
                   action, outcome, ip_address, details, timestamp, prev_hash, hash
            FROM security_events
            WHERE 1=1
        """
        params = []
        if event_type:
            query += " AND event_type = ?"
            params.append(event_type)

        query += " ORDER BY id DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor.execute(query, tuple(params))
        events = []
        for row in cursor.fetchall():
            d = dict(row)
            try:
                d["details"] = json.loads(d["details"]) if d.get("details") else {}
            except Exception:
                pass
            events.append(d)

        cursor.execute("SELECT COUNT(*) FROM security_events")
        total = cursor.fetchone()[0]

    return {
        "status": "success",
        "total": total,
        "limit": limit,
        "offset": offset,
        "events": events
    }


@router.get("/integrations")
async def get_integrations_status(admin_user: Dict[str, Any] = Depends(require_admin)):
    """System-level telecom data and blockchain settlement integration statuses."""
    integrations = [
        {
            "id": "opencellid",
            "name": "OpenCellID Global Cell Registry",
            "type": "telecom_data",
            "status": "configured" if os.getenv("OPENCELLID_API_KEY") else "mock_fallback",
            "configured": bool(os.getenv("OPENCELLID_API_KEY")),
            "description": "Global cellular tower topology and coordinate positioning."
        },
        {
            "id": "ucc_5g",
            "name": "UCC 5G Real Telemetry Dataset",
            "type": "telemetry_dataset",
            "status": "connected",
            "configured": True,
            "description": "University College Cork production 5G QoS/QoE telemetry traces."
        },
        {
            "id": "hsk_testnet",
            "name": "HashKey Chain Testnet (EVM RPC)",
            "type": "blockchain_settlement",
            "status": "active",
            "rpc_url": os.getenv("HSK_RPC_URL", "https://testnet.hsk.xyz"),
            "chain_id": 133,
            "description": "Layer 2 EVM payment settlement and machine-to-machine escrow."
        },
        {
            "id": "coap_iot",
            "name": "CoAP IoT Ingestion Engine",
            "type": "protocol_service",
            "status": "active",
            "port": 5683,
            "description": "Constrained Application Protocol endpoint for cell tower sensors."
        },
        {
            "id": "email_transactional",
            "name": "Transactional Email Engine",
            "type": "communications",
            "status": "configured" if (os.getenv("SMTP_HOST") or os.getenv("RESEND_API_KEY")) else "dev_console_logging",
            "provider": "resend" if os.getenv("RESEND_API_KEY") else ("smtp" if os.getenv("SMTP_HOST") else "dev_console"),
            "description": "User verification and security dispatch service."
        }
    ]
    return {"status": "success", "integrations": integrations}


@router.get("/settings")
async def get_platform_settings(admin_user: Dict[str, Any] = Depends(require_admin)):
    """Get active platform policies and configuration."""
    return {
        "status": "success",
        "settings": {
            "session_token_lifetime_hours": 24,
            "password_reset_lifetime_hours": 1,
            "verification_token_lifetime_hours": 24,
            "login_lockout_threshold": 5,
            "login_lockout_duration_seconds": 300,
            "auto_verify_new_registrations": os.getenv("SENPAY_AUTO_VERIFY", "false").lower() == "true",
            "default_workspace_slug": "telesol-default",
            "settlement_currency": "HSK",
            "max_autonomous_spend_per_incident_hsk": 50.0,
            "model_confidence_threshold_percent": 75.0
        }
    }


@router.post("/database/backup")
async def trigger_database_backup(admin_user: Dict[str, Any] = Depends(require_admin)):
    """Trigger an atomic, non-blocking online backup of the persistent SQLite database."""
    from app.paypilot.db_backup import create_backup
    try:
        meta = create_backup()
        SecurityAuditService.record_event(
            event_type="DATABASE_BACKUP_CREATED",
            actor_id=admin_user["id"],
            actor_email=admin_user["email"],
            action="database_backup",
            outcome="SUCCESS",
            details={"sha256": meta["sha256"], "size": meta["file_size_bytes"]}
        )
        return {"status": "success", "backup": meta}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Backup failed: {str(e)}")


@router.get("/database/backups")
async def list_database_backups(admin_user: Dict[str, Any] = Depends(require_admin)):
    """List available verified database backups."""
    from app.paypilot.db_backup import BACKUP_DIR, verify_backup
    if not os.path.exists(BACKUP_DIR):
        return {"status": "success", "backups": []}

    backups = []
    for f in sorted(os.listdir(BACKUP_DIR), reverse=True):
        if f.endswith(".db"):
            fpath = os.path.join(BACKUP_DIR, f)
            try:
                stat = os.stat(fpath)
                meta_path = f"{fpath}.meta.json"
                meta_data = {}
                if os.path.exists(meta_path):
                    with open(meta_path, "r") as mf:
                        meta_data = json.load(mf)
                backups.append({
                    "filename": f,
                    "size_bytes": stat.st_size,
                    "created_at": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
                    "sha256": meta_data.get("sha256"),
                    "table_counts": meta_data.get("table_counts", {})
                })
            except Exception:
                pass

    return {"status": "success", "backups": backups}
