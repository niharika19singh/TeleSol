"""
Unit & Integration Tests for User Registration, Authentication & Security Workstream
"""

import unittest
import time
import secrets
from fastapi.testclient import TestClient
from app.main import app
from app.paypilot.db import init_db, db_session
from app.services.auth_service import AuthService, verify_access_token, _FAILED_LOGINS


class TestUserRegistrationAndAuth(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)

    def setUp(self):
        _FAILED_LOGINS.clear()

    def test_01_registration_validation_and_token(self):
        """Test user registration with password constraints and verification token generation."""
        # 1. Reject weak password (Pydantic / validation returns 422 or 400)
        res_weak = self.client.post("/api/auth/register", json={
            "email": "noc_weak@telesol.io",
            "password": "short",
            "full_name": "NOC Engineer"
        })
        self.assertIn(res_weak.status_code, [400, 422])

        # 2. Reject self-assignment of PLATFORM_ADMIN
        res_admin = self.client.post("/api/auth/register", json={
            "email": f"hacker_{secrets.token_hex(3)}@telesol.io",
            "password": "ValidPassword2026!",
            "full_name": "Unauthorized Admin",
            "role": "PLATFORM_ADMIN"
        })
        self.assertEqual(res_admin.status_code, 400)
        self.assertIn("prohibited", res_admin.json()["detail"])

        # 3. Successful registration with organization name
        alice_email = f"engineer.alice_{secrets.token_hex(4)}@telesol.io"
        res = self.client.post("/api/auth/register", json={
            "email": alice_email,
            "password": "EngineeringPass2026!",
            "full_name": "Alice Telecom Lead",
            "organization_name": "TeleSol Cork NOC"
        })
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertIn("user", data)
        self.assertEqual(data["user"]["email"], alice_email)
        self.assertEqual(data["user"]["role"], "WORKSPACE_OWNER")
        self.assertFalse(data["user"]["email_verified"])
        self.assertIn("_dev_verification_token", data)

        dev_token = data["_dev_verification_token"]

        # 4. Verify email with valid token
        verify_res = self.client.post("/api/auth/verify-email", json={"token": dev_token})
        self.assertEqual(verify_res.status_code, 200)
        self.assertEqual(verify_res.json()["status"], "success")

        # 5. Reused token must be rejected
        reused_res = self.client.post("/api/auth/verify-email", json={"token": dev_token})
        self.assertEqual(reused_res.status_code, 400)
        self.assertIn("already been used", reused_res.json()["detail"])

    def test_02_password_reset_flow(self):
        """Test full password reset cycle from request to new credential authentication."""
        bob_email = f"bob.finance_{secrets.token_hex(4)}@telesol.io"
        # Register user
        reg_res = self.client.post("/api/auth/register", json={
            "email": bob_email,
            "password": "InitialPassword2026!",
            "full_name": "Bob Finance",
            "auto_verify": True
        })
        self.assertEqual(reg_res.status_code, 201)

        # Request password reset
        reset_req = self.client.post("/api/auth/forgot-password", json={"email": bob_email})
        self.assertEqual(reset_req.status_code, 200)
        reset_data = reset_req.json()
        self.assertIn("_dev_reset_token", reset_data)
        reset_token = reset_data["_dev_reset_token"]

        # Complete reset
        confirm_res = self.client.post("/api/auth/reset-password", json={
            "token": reset_token,
            "new_password": "BrandNewPassword2026!"
        })
        self.assertEqual(confirm_res.status_code, 200)

        # Old password must fail
        old_login = self.client.post("/api/auth/login", json={
            "username_or_email": bob_email,
            "password": "InitialPassword2026!"
        })
        self.assertEqual(old_login.status_code, 401)

        # New password must succeed
        new_login = self.client.post("/api/auth/login", json={
            "username_or_email": bob_email,
            "password": "BrandNewPassword2026!"
        })
        self.assertEqual(new_login.status_code, 200)
        self.assertIn("token", new_login.json())

    def test_03_login_lockout_rate_limit(self):
        """Test that 5 consecutive failed attempts trigger temporary lockout."""
        target_email = f"lockout_{secrets.token_hex(4)}@telesol.io"
        self.client.post("/api/auth/register", json={
            "email": target_email,
            "password": "CorrectPassword2026!",
            "full_name": "Lockout Test User",
            "auto_verify": True
        })

        # Submit 5 incorrect attempts
        for i in range(5):
            res = self.client.post("/api/auth/login", json={
                "username_or_email": target_email,
                "password": f"wrong_password_{i}"
            })
            self.assertEqual(res.status_code, 401)

        # 6th attempt should be blocked with 429 Too Many Requests
        lockout_res = self.client.post("/api/auth/login", json={
            "username_or_email": target_email,
            "password": "CorrectPassword2026!"
        })
        self.assertEqual(lockout_res.status_code, 429)
        self.assertIn("locked", lockout_res.json()["detail"])

    def test_04_tamper_evident_security_events(self):
        """Verify that authentication events are appended to the security_events audit chain."""
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM security_events")
            count_before = cursor.fetchone()[0]

        # Trigger an auth event
        self.client.post("/api/auth/login", json={
            "username_or_email": "operator@telesol.io",
            "password": "senpay-telecom-2026"
        })

        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, event_type, actor_email, prev_hash, hash FROM security_events ORDER BY id DESC LIMIT 1")
            latest = cursor.fetchone()

        self.assertIsNotNone(latest)
        self.assertEqual(latest["event_type"], "LOGIN_SUCCESS")
        self.assertEqual(latest["actor_email"], "operator@telesol.io")
        self.assertIsNotNone(latest["hash"])
        self.assertEqual(len(latest["hash"]), 64)


if __name__ == "__main__":
    unittest.main()
