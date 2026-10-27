"""
Comprehensive API Endpoint Connectivity & Status Verification
══════════════════════════════════════════════════════════════
Tests every single documented endpoint in the SENPAY FastAPI application.
"""

import sys
from fastapi.testclient import TestClient

sys.path.insert(0, "/Users/user/Documents/TeleSol-mac-release/backend")
from app.main import app

client = TestClient(app)

endpoints_to_test = [
    # Dashboard & Sensor Endpoints
    ("GET", "/api/stats", None, None),
    ("GET", "/api/sensors/health", None, None),
    ("GET", "/api/sensors/live", None, None),
    ("GET", "/api/crs/calculate", None, None),
    ("GET", "/api/alerts", None, None),
    ("GET", "/api/dashboard/all", None, None),
    ("GET", "/api/channels", None, None),
    ("GET", "/api/protocols/status", None, None),
    ("GET", "/api/sentinel/status", None, None),
    ("POST", "/api/sentinel/control", {"action": "start", "scenario": "congestion"}, None),
    ("GET", "/api/ai/forecast", None, None),
    ("GET", "/api/tinyfish/status", None, None),

    # Authentication Endpoints
    ("POST", "/api/auth/login", {"username_or_email": "operator@telesol.io", "password": "senpay-telecom-2026"}, None),
    
    # ML Intelligence Endpoints
    ("GET", "/api/ml/model-info", None, None),
    ("GET", "/api/ml/datasets", None, None),
    ("POST", "/api/ml/predict", {"rsrp": -105.0, "rsrq": -14.0, "snr": 3.0, "cqi": 8.0, "dl_bitrate": 8000.0}, None),

    # PayPilot 2.0 & Procurement Endpoints
    ("GET", "/api/paypilot/dashboard", None, None),
    ("GET", "/api/paypilot/discovery", None, None),
    ("GET", "/api/paypilot/agents", None, None),
    ("GET", "/api/paypilot/service-agreements", None, None),
    ("GET", "/api/paypilot/delegations", None, None),
    ("GET", "/api/paypilot/evidence-bundles", None, None),
    ("GET", "/api/paypilot/disputes", None, None),
    ("GET", "/api/paypilot/audit", None, None),
    ("POST", "/api/paypilot/simulate", {
        "agent_id": "agent_sentinel_optimizer",
        "provider_id": "prov_edge_mesh_01",
        "agreement_id": "agr_seed_001",
        "amount": 12.5,
        "asset": "HSK"
    }, None),
]

def run_tests():
    print(f"{'METHOD':<7} {'ENDPOINT':<40} {'STATUS':<8} {'RESULT'}")
    print("-" * 70)
    passed = 0
    failed = 0

    # Obtain token first
    login_res = client.post("/api/auth/login", json={
        "username_or_email": "operator@telesol.io",
        "password": "senpay-telecom-2026"
    })
    token = login_res.json().get("token")
    auth_headers = {"Authorization": f"Bearer {token}"} if token else {}

    # Add protected endpoints
    endpoints_to_test.append(("GET", "/api/auth/me", None, auth_headers))
    endpoints_to_test.append(("POST", "/api/auth/logout", {}, auth_headers))

    for method, path, body, headers in endpoints_to_test:
        try:
            if method == "GET":
                r = client.get(path, headers=headers)
            elif method == "POST":
                r = client.post(path, json=body or {}, headers=headers)
            elif method == "PATCH":
                r = client.patch(path, json=body or {}, headers=headers)

            if r.status_code in [200, 201]:
                print(f"{method:<7} {path:<40} {r.status_code:<8} PASS")
                passed += 1
            else:
                print(f"{method:<7} {path:<40} {r.status_code:<8} FAIL ({r.text[:50]})")
                failed += 1
        except Exception as e:
            print(f"{method:<7} {path:<40} ERR      EXCEPTION ({str(e)})")
            failed += 1

    print("-" * 70)
    print(f"TOTAL: {passed} PASSED, {failed} FAILED across {len(endpoints_to_test)} endpoints.")
    assert failed == 0, f"{failed} endpoints failed"

if __name__ == "__main__":
    run_tests()
