"""
Tests for SENPAY Real Authentication & Machine Learning Pipeline
═════════════════════════════════════════════════════════════════
Verifies:
1. PBKDF2-HMAC-SHA256 cryptographic password hashing & salt generation
2. URL-safe HMAC-SHA256 session token issuing and verification
3. POST /api/auth/login (success with seeded operator, rejection with bad credentials)
4. POST /api/auth/register (user creation, duplicate detection)
5. GET /api/auth/me (authenticated user profile retrieval, 401 guard)
6. GET /api/ml/model-info (RandomForest + GradientBoosting metrics & feature importances)
7. GET /api/ml/datasets (UCC 5G Production Dataset provenance & class distribution)
8. POST /api/ml/predict (Continuous CRS prediction & congestion severity classification)
"""

import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.services.auth_service import (
    AuthService, hash_password, verify_password,
    create_access_token, verify_access_token
)
from app.ml.inference import predict_congestion_risk


class TestAuthAndMLPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_password_hashing_pbkdf2(self):
        """Verify PBKDF2-HMAC-SHA256 password hashing with salt."""
        password = "test-secure-password-2026"
        p_hash, salt = hash_password(password)
        self.assertEqual(len(salt), 32)  # 16 bytes hex-encoded
        self.assertEqual(len(p_hash), 64)  # 32 bytes hex-encoded
        # Verify correct password matches
        self.assertTrue(verify_password(password, p_hash, salt))
        # Verify incorrect password is rejected
        self.assertFalse(verify_password("wrong-password", p_hash, salt))

    def test_02_session_token_cryptography(self):
        """Verify session token issuing, cryptographic HMAC signature, and validation."""
        token = create_access_token(
            user_id="usr_test_99",
            username="test_operator",
            email="test@telesol.io",
            role="operator"
        )
        self.assertIsInstance(token, str)
        self.assertIn(".", token)
        # Verify valid token
        payload = verify_access_token(token)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["uid"], "usr_test_99")
        self.assertEqual(payload["eml"], "test@telesol.io")
        self.assertEqual(payload["rol"], "operator")
        # Verify tampered token fails
        tampered_token = token[:-5] + "XXXXX"
        self.assertIsNone(verify_access_token(tampered_token))

    def test_03_auth_login_seeded_operator(self):
        """Verify POST /api/auth/login with pre-seeded operator credentials."""
        res = self.client.post("/api/auth/login", json={
            "username_or_email": "operator@telesol.io",
            "password": "senpay-telecom-2026"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        token = data.get("token") or data.get("access_token")
        self.assertIsNotNone(token)
        self.assertEqual(data["token_type"].lower(), "bearer")
        self.assertEqual(data["user"]["email"], "operator@telesol.io")

        # Test invalid credentials
        bad_res = self.client.post("/api/auth/login", json={
            "username_or_email": "operator@telesol.io",
            "password": "incorrect-password"
        })
        self.assertEqual(bad_res.status_code, 401)

    def test_04_auth_register_and_protected_route(self):
        """Verify POST /api/auth/register and GET /api/auth/me authentication guard."""
        unique_id = "test_user_7788"
        reg_payload = {
            "username": unique_id,
            "email": f"{unique_id}@carrier-domain.com",
            "password": "secure-operator-password-123",
            "full_name": "Test Telecom Operator",
            "role": "operator"
        }
        res = self.client.post("/api/auth/register", json=reg_payload)
        self.assertIn(res.status_code, [200, 201, 400])
        if res.status_code in [200, 201]:
            data = res.json()
            token = data.get("token") or data.get("access_token")

            # Test GET /api/auth/me with Bearer token
            me_res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
            self.assertEqual(me_res.status_code, 200)
            self.assertEqual(me_res.json()["username"], unique_id)

        # Test GET /api/auth/me without token -> 401 Unauthorized
        unauth_res = self.client.get("/api/auth/me")
        self.assertEqual(unauth_res.status_code, 401)

    def test_05_ml_model_info_contract(self):
        """Verify GET /api/ml/model-info returns active model metrics and feature importances."""
        res = self.client.get("/api/ml/model-info")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("model_version"), "SENPAY-5G-CRS-v1.0-RF-GB")
        self.assertIn("classification_metrics", data)
        self.assertGreaterEqual(data["classification_metrics"]["accuracy"], 0.95)
        self.assertIn("regression_metrics", data)
        self.assertLessEqual(data["regression_metrics"]["mean_absolute_error"], 1.5)
        self.assertIn("feature_importances", data)
        self.assertTrue(len(data["feature_importances"]) > 0)

    def test_06_ml_datasets_provenance_contract(self):
        """Verify GET /api/ml/datasets returns UCC 5G dataset metadata and class counts."""
        res = self.client.get("/api/ml/datasets")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        active = data.get("active_dataset", {})
        self.assertIn("UCC 5G Production Trace Dataset", active.get("dataset_name", ""))
        self.assertEqual(active.get("license"), "GNU General Public License v3.0 (GPL-3.0)")
        self.assertGreaterEqual(active.get("accepted_rows", 0), 90000)
        self.assertIn("class_distribution", active)
        self.assertIn("NORMAL (0)", active["class_distribution"])
        self.assertIn("CONGESTED (1)", active["class_distribution"])

    def test_07_ml_predict_live_inference(self):
        """Verify POST /api/ml/predict returns CRS, severity class, and risk factors."""
        # 1. Critical telemetry (poor signal, low throughput)
        crit_res = self.client.post("/api/ml/predict", json={
            "rsrp": -118.0,
            "rsrq": -18.5,
            "snr": -4.0,
            "cqi": 3.0,
            "dl_bitrate": 450.0,
            "zone_id": "zone-gate-c"
        })
        self.assertEqual(crit_res.status_code, 200)
        crit_data = crit_res.json()
        self.assertEqual(crit_data["status"], "success")
        self.assertGreaterEqual(crit_data["predicted_crs"], 70.0)
        self.assertIn(crit_data["congestion_severity"], ["CONGESTED", "CRITICAL"])
        self.assertGreater(len(crit_data["contributing_risk_factors"]), 0)

        # 2. Normal telemetry (excellent signal, high throughput)
        norm_res = self.client.post("/api/ml/predict", json={
            "rsrp": -78.0,
            "rsrq": -7.5,
            "snr": 22.0,
            "cqi": 14.0,
            "dl_bitrate": 85000.0,
            "zone_id": "zone-gate-a"
        })
        self.assertEqual(norm_res.status_code, 200)
        norm_data = norm_res.json()
        self.assertEqual(norm_data["status"], "success")
        self.assertLessEqual(norm_data["predicted_crs"], 40.0)
        self.assertEqual(norm_data["congestion_severity"], "NORMAL")


if __name__ == "__main__":
    unittest.main()
