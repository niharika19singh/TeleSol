"""
Unit & Integration Tests for Role-Based Access Control and Admin Separation (Workstream 2)
"""

import unittest
import secrets
from fastapi.testclient import TestClient
from app.main import app
from app.paypilot.db import init_db
from app.services.auth_service import AuthService, ROLE_PLATFORM_ADMIN, ROLE_NOC_OPERATOR, ROLE_ANALYST, ROLE_FINANCE


class TestRBACAndAdminSeparation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)

        # 1. Ensure admin account is available
        cls.admin_email = "admin@telesol.io"
        cls.admin_pass = "SenPayAdmin2026!"
        cls.admin_login = cls.client.post("/api/auth/login", json={
            "username_or_email": cls.admin_email,
            "password": cls.admin_pass
        })
        cls.admin_token = cls.admin_login.json().get("token")

        # 2. Create standard operator account
        cls.operator_login = cls.client.post("/api/auth/login", json={
            "username_or_email": "operator@telesol.io",
            "password": "senpay-telecom-2026"
        })
        cls.operator_token = cls.operator_login.json().get("token")

        # 3. Create analyst account
        cls.analyst_email = f"analyst_{secrets.token_hex(3)}@telesol.io"
        cls.analyst_pass = "AnalystSecure2026!"
        reg_res = cls.client.post("/api/auth/register", json={
            "email": cls.analyst_email,
            "password": cls.analyst_pass,
            "full_name": "Telecom Analyst",
            "role": "ANALYST",
            "auto_verify": True
        })
        login_res = cls.client.post("/api/auth/login", json={
            "username_or_email": cls.analyst_email,
            "password": cls.analyst_pass
        })
        cls.analyst_token = login_res.json().get("token")

    def test_01_admin_endpoints_require_admin_role(self):
        """Verify that /api/admin/* endpoints strictly reject unauthenticated or non-admin access."""
        # Unauthenticated request -> 401
        res_unauth = self.client.get("/api/admin/overview")
        self.assertEqual(res_unauth.status_code, 401)

        # Operator request -> 403 Forbidden
        headers_op = {"Authorization": f"Bearer {self.operator_token}"}
        res_op = self.client.get("/api/admin/overview", headers=headers_op)
        self.assertEqual(res_op.status_code, 403)
        self.assertIn("Access denied", res_op.json()["detail"])

        # Analyst request -> 403 Forbidden
        headers_an = {"Authorization": f"Bearer {self.analyst_token}"}
        res_an = self.client.get("/api/admin/users", headers=headers_an)
        self.assertEqual(res_an.status_code, 403)

    def test_02_admin_can_access_platform_governance(self):
        """Verify that PLATFORM_ADMIN can view metrics, users, workspaces, and audit events."""
        headers_admin = {"Authorization": f"Bearer {self.admin_token}"}

        # 1. Platform overview metrics
        res_ov = self.client.get("/api/admin/overview", headers=headers_admin)
        self.assertEqual(res_ov.status_code, 200)
        ov_data = res_ov.json()
        self.assertIn("metrics", ov_data)
        self.assertGreaterEqual(ov_data["metrics"]["total_users"], 1)

        # 2. Users list
        res_users = self.client.get("/api/admin/users", headers=headers_admin)
        self.assertEqual(res_users.status_code, 200)
        self.assertIn("users", res_users.json())

        # 3. Workspaces
        res_ws = self.client.get("/api/admin/workspaces", headers=headers_admin)
        self.assertEqual(res_ws.status_code, 200)
        self.assertIn("workspaces", res_ws.json())

        # 4. Security events
        res_sec = self.client.get("/api/admin/security-events", headers=headers_admin)
        self.assertEqual(res_sec.status_code, 200)
        self.assertIn("events", res_sec.json())

        # 5. Integrations status
        res_integ = self.client.get("/api/admin/integrations", headers=headers_admin)
        self.assertEqual(res_integ.status_code, 200)
        self.assertIn("integrations", res_integ.json())

    def test_03_admin_user_role_and_status_management(self):
        """Verify that admin can modify roles and activate/deactivate accounts."""
        headers_admin = {"Authorization": f"Bearer {self.admin_token}"}

        # Register a target user to manage
        target_email = f"user_{secrets.token_hex(3)}@telesol.io"
        reg = self.client.post("/api/auth/register", json={
            "email": target_email,
            "password": "TemporaryPassword2026!",
            "full_name": "Target User",
            "auto_verify": True
        })
        user_id = reg.json()["user"]["id"]

        # Elevate to FINANCE role
        elevate_res = self.client.patch(
            f"/api/admin/users/{user_id}/role",
            json={"role": "FINANCE"},
            headers=headers_admin
        )
        self.assertEqual(elevate_res.status_code, 200)
        self.assertEqual(elevate_res.json()["role"], "FINANCE")

        # Suspend account
        suspend_res = self.client.patch(
            f"/api/admin/users/{user_id}/status",
            json={"is_active": False},
            headers=headers_admin
        )
        self.assertEqual(suspend_res.status_code, 200)
        self.assertFalse(suspend_res.json()["is_active"])

        # Suspended user cannot log in
        login_res = self.client.post("/api/auth/login", json={
            "username_or_email": target_email,
            "password": "TemporaryPassword2026!"
        })
        self.assertEqual(login_res.status_code, 401)

        # Reactivate account
        react_res = self.client.patch(
            f"/api/admin/users/{user_id}/status",
            json={"is_active": True},
            headers=headers_admin
        )
        self.assertEqual(react_res.status_code, 200)
        self.assertTrue(react_res.json()["is_active"])

    def test_04_analyst_cannot_execute_financial_payments(self):
        """Verify that ANALYST role is blocked from executing financial payments."""
        headers_analyst = {"Authorization": f"Bearer {self.analyst_token}"}

        res = self.client.post("/api/paypilot/execute", json={
            "mandate_id": "man_dummy_test",
            "wallet_signature": "0x1234567890abcdef1234567890abcdef",
            "signer_address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
        }, headers=headers_analyst)

        # Must be 403 Forbidden
        self.assertEqual(res.status_code, 403)
        self.assertIn("not authorized to execute or authorize financial payments", res.json()["detail"])


if __name__ == "__main__":
    unittest.main()
