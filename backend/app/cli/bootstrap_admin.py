"""
SENPAY Administrator Bootstrap CLI
══════════════════════════════════
Securely initializes the primary PLATFORM_ADMIN account for SENPAY.

Usage:
    python -m app.cli.bootstrap_admin --email admin@telesol.io --password "MySecretPass123!" --name "Platform Administrator"
    
Environment Variable Fallbacks:
    SENPAY_ADMIN_EMAIL
    SENPAY_ADMIN_PASSWORD
    SENPAY_ADMIN_NAME
"""

import sys
import os
import argparse
import secrets
import time
from datetime import datetime, timezone

from app.paypilot.db import db_session
from app.services.auth_service import (
    hash_password,
    ROLE_PLATFORM_ADMIN,
    SecurityAuditService
)


def bootstrap_admin(email: str, password: str, full_name: str, force: bool = False) -> bool:
    """Create the initial platform administrator if one does not exist."""
    email = email.strip().lower()
    full_name = full_name.strip()

    if len(password) < 8:
        print("[ERROR] Password must be at least 8 characters long.", file=sys.stderr)
        return False

    with db_session() as conn:
        cursor = conn.cursor()
        
        # Check if an administrator already exists
        cursor.execute(
            "SELECT id, username, email FROM users WHERE role IN ('PLATFORM_ADMIN', 'ADMIN') AND is_active = 1"
        )
        existing_admins = cursor.fetchall()
        
        if existing_admins and not force:
            print(f"[SECURITY] Platform administrator already exists ({len(existing_admins)} found):", file=sys.stderr)
            for adm in existing_admins:
                print(f"  - User: {adm['username']} <{adm['email']}> (ID: {adm['id']})", file=sys.stderr)
            print("[INFO] Use --force if you intentionally wish to provision an additional administrator.", file=sys.stderr)
            return False

        # Check if target email exists
        cursor.execute("SELECT id, role FROM users WHERE email = ?", (email,))
        existing_user = cursor.fetchone()

        now_iso = datetime.now(timezone.utc).isoformat()
        pwd_hash, salt = hash_password(password)

        if existing_user:
            # Upgrade existing user
            user_id = existing_user["id"]
            cursor.execute(
                """
                UPDATE users
                SET role = ?, password_hash = ?, salt = ?, full_name = ?,
                    email_verified = 1, email_verified_at = ?, is_active = 1
                WHERE id = ?
                """,
                (ROLE_PLATFORM_ADMIN, pwd_hash, salt, full_name, now_iso, user_id)
            )
            print(f"[SUCCESS] Upgraded existing user {email} (ID: {user_id}) to {ROLE_PLATFORM_ADMIN}.")
        else:
            # Create fresh admin user
            user_id = f"usr_admin_{int(time.time())}_{secrets.token_hex(3)}"
            username = email.split("@")[0].replace(".", "_") + "_admin"
            workspace_id = "ws_telesol_default"

            cursor.execute(
                """
                INSERT INTO users (
                    id, username, email, password_hash, salt, full_name,
                    role, is_active, created_at, email_verified, email_verified_at,
                    workspace_id, org_name
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 1, ?, ?, 'TeleSol Global Infrastructure')
                """,
                (
                    user_id, username, email, pwd_hash, salt, full_name,
                    ROLE_PLATFORM_ADMIN, now_iso, now_iso, workspace_id
                )
            )

            # Add to workspace memberships
            cursor.execute(
                """
                INSERT INTO workspace_memberships (id, workspace_id, user_id, role, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, 1, ?, ?)
                """,
                (f"mem_{secrets.token_hex(6)}", workspace_id, user_id, ROLE_PLATFORM_ADMIN, now_iso, now_iso)
            )
            print(f"[SUCCESS] Created new {ROLE_PLATFORM_ADMIN}: {email} (User ID: {user_id}).")

        conn.commit()

    SecurityAuditService.record_event(
        event_type="ADMIN_BOOTSTRAPPED_CLI",
        actor_id=user_id,
        actor_email=email,
        target_resource=f"user:{user_id}",
        action="bootstrap_admin",
        outcome="SUCCESS",
        details={"cli": True, "force": force}
    )
    return True


def main():
    parser = argparse.ArgumentParser(description="SENPAY Platform Administrator Provisioning CLI")
    parser.add_argument("--email", default=os.getenv("SENPAY_ADMIN_EMAIL", "admin@telesol.io"), help="Administrator email address")
    parser.add_argument("--password", default=os.getenv("SENPAY_ADMIN_PASSWORD", "SenPayAdmin2026!"), help="Administrator initial password")
    parser.add_argument("--name", default=os.getenv("SENPAY_ADMIN_NAME", "SENPAY Platform Administrator"), help="Administrator full name")
    parser.add_argument("--force", action="store_true", help="Force provision even if an admin already exists")

    args = parser.parse_args()
    success = bootstrap_admin(args.email, args.password, args.name, args.force)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
