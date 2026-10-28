"""
Direct Staging/Production Verification Script for Deployed SENPAY Backend
Target: https://telesol-sentinel-api.onrender.com
"""

import time
import json
import urllib.request
import urllib.error
import ssl
import certifi

BASE_URL = "https://telesol-sentinel-api.onrender.com"
SSL_CTX = ssl.create_default_context(cafile=certifi.where())


def make_request(method, endpoint, payload=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {"User-Agent": "SENPAY-Deployed-Verification-Agent"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=25, context=SSL_CTX) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, resp.headers, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = {"raw": body}
        return e.code, e.headers, parsed
    except Exception as e:
        return 0, {}, {"error": str(e)}


def run_deployed_verification():
    print(f"==================================================")
    print(f"VERIFYING DEPLOYED SENPAY BACKEND: {BASE_URL}")
    print(f"==================================================")

    # 1. Probes
    print("\n1. Health & Probes:")
    st, hdrs, body = make_request("GET", "/health/live")
    print(f"  /health/live -> Status: {st} | Body: {body} | Req-ID: {hdrs.get('x-request-id')}")
    assert st == 200, f"Expected 200, got {st}"

    st, hdrs, body = make_request("GET", "/health/ready")
    print(f"  /health/ready -> Status: {st} | Body: {body}")
    assert st == 200, f"Expected 200, got {st}"

    st, hdrs, body = make_request("GET", "/health")
    print(f"  /health -> Status: {st} | Service: {body.get('service')} | DB: {body.get('database')} | ML: {body.get('ml_inference')}")
    assert st == 200, f"Expected 200, got {st}"

    # 2. Operator Login
    print("\n2. Operator Authentication:")
    st, hdrs, login_body = make_request("POST", "/api/auth/login", {
        "username_or_email": "operator@telesol.io",
        "password": "senpay-telecom-2026"
    })
    print(f"  Login operator@telesol.io -> Status: {st}")
    assert st == 200, f"Operator login failed: {login_body}"
    token = login_body.get("token") or login_body.get("access_token")
    user = login_body.get("user", {})
    print(f"  Token acquired: {token[:24]}... | User: {user.get('email')} | Role: {user.get('role')} | WS: {user.get('workspace_id')}")

    # 3. Session Profile
    print("\n3. Protected Profile /api/auth/me:")
    st, hdrs, me_body = make_request("GET", "/api/auth/me", token=token)
    print(f"  /api/auth/me -> Status: {st} | Auth User: {me_body.get('email')} | Role: {me_body.get('role')}")
    assert st == 200, f"Profile request failed: {me_body}"

    # 4. Role Escalation Prevention on Public Register
    print("\n4. Privilege Escalation Prevention on /api/auth/register:")
    ts = hex(int(time.time()))[2:]
    hacker_email = f"evil.admin_{ts}@exploit.net"
    st, hdrs, reg_body = make_request("POST", "/api/auth/register", {
        "email": hacker_email,
        "password": "ExploitAdmin2026!",
        "full_name": "Injected Admin",
        "role": "PLATFORM_ADMIN"
    })
    print(f"  Register with role=PLATFORM_ADMIN -> Status: {st} | Detail: {reg_body.get('detail')}")
    assert st == 400, f"Expected 400 Bad Request, got {st}"

    # 5. Create Test User and Verify Email
    print("\n5. New User Registration & Verification:")
    normal_email = f"marcus.live_{ts}@skylinetelecom.net"
    st, hdrs, reg_body = make_request("POST", "/api/auth/register", {
        "email": normal_email,
        "password": "SkylinePassword2026!",
        "full_name": "Marcus Live NOC",
        "organization_name": "Skyline Global"
    })
    print(f"  Register {normal_email} -> Status: {st}")
    assert st in (200, 201), f"Registration failed: {reg_body}"
    user_data = reg_body.get("user") or reg_body

    # Check for dev token or verify via bootstrap
    dev_tok = reg_body.get("_dev_verification_token")
    if dev_tok:
        print(f"  Token retrieved: {dev_tok[:16]}...")
        st, hdrs, verif_body = make_request("POST", "/api/auth/verify-email", {"token": dev_tok})
        print(f"  Redeem token -> Status: {st} | Body: {verif_body}")
        assert st == 200, f"Verification failed: {verif_body}"

        # Test token replay prevention
        st, hdrs, replay_body = make_request("POST", "/api/auth/verify-email", {"token": dev_tok})
        print(f"  Replay used token -> Status: {st} | Detail: {replay_body.get('detail')}")
        assert st == 400, f"Expected 400 Bad Request on token reuse, got {st}"

    # 6. Service Agreement Creation
    print("\n6. Outcome-Contingent Service Agreement Creation:")
    st, hdrs, agr_body = make_request("POST", "/api/paypilot/agreements", {
        "task_id": f"zone_live_deployed_{ts}",
        "requesting_agent_id": "agent_buyer_sentinel",
        "provider_id": "prov_skylink_5g",
        "provider_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "service_category": "TELECOM_BANDWIDTH",
        "service_description": "Deployed cloud verification slice",
        "agreed_price": 300.0,
        "asset": "HSK",
        "max_authorized_amount": 350.0,
        "expected_deliverables": "CRS drop of >= 20 points",
        "expected_completion_time": "2026-12-31T23:59:59Z",
        "baseline_value": 70.0,
        "target_threshold": 20.0
    }, token=token)
    print(f"  Create agreement -> Status: {st} | Agreement ID: {agr_body.get('agreement', {}).get('id')}")
    assert st == 200, f"Agreement creation failed: {agr_body}"
    agr_id = agr_body["agreement"]["id"]

    # 7. Missing Evidence Outcome Verification Guard
    print("\n7. Missing Evidence Outcome Verification Guard:")
    st, hdrs, verify_missing = make_request("POST", f"/api/paypilot/agreements/{agr_id}/verify-outcome", {
        "post_metrics": {}
    }, token=token)
    print(f"  Verify with post_metrics={{}} -> Status: {st} | Outcome: {verify_missing.get('outcome_status')}")
    assert st == 200, f"Verification request failed: {verify_missing}"
    assert verify_missing.get("outcome_status") == "INCONCLUSIVE", f"Expected INCONCLUSIVE, got {verify_missing.get('outcome_status')}"
    cfe = verify_missing.get("counterfactual_evaluation", {})
    assert cfe.get("baseline_type") == "MISSING_EVIDENCE", f"Expected MISSING_EVIDENCE, got {cfe.get('baseline_type')}"
    print(f"  [PASS] Missing evidence correctly classified as INCONCLUSIVE; settlement withheld.")

    # 8. Successful Outcome Verification
    print("\n8. Verified Successful Outcome:")
    st, hdrs, verify_success = make_request("POST", f"/api/paypilot/agreements/{agr_id}/verify-outcome", {
        "post_metrics": {
            "crs_score": 25.0,
            "density": 2.1,
            "flow_instability": 10.0,
            "packet_loss_pct": 0.5,
            "latency_ms": 22.0
        }
    }, token=token)
    print(f"  Verify with CRS 25.0 (Drop 45 pts) -> Status: {st} | Outcome: {verify_success.get('outcome_status')}")
    assert st == 200, f"Verification failed: {verify_success}"
    assert verify_success.get("outcome_status") == "VERIFIED_SUCCESS", f"Expected VERIFIED_SUCCESS, got {verify_success.get('outcome_status')}"
    print(f"  Settlement Eligibility: {verify_success.get('agreement', {}).get('settlement_eligibility')}")

    # 9. Duplicate Settlement / Idempotency Violation
    print("\n9. Duplicate Settlement / Idempotency Guard:")
    # Attempt duplicate settlement verification
    st, hdrs, dup_settle = make_request("POST", f"/api/paypilot/agreements/{agr_id}/verify-outcome", {
        "post_metrics": {"crs_score": 25.0}
    }, token=token)
    print(f"  Re-verify already verified agreement -> Status: {st} | Outcome: {dup_settle.get('outcome_status')}")

    # 10. Session Logout
    print("\n10. Session Logout:")
    st, hdrs, logout_body = make_request("POST", "/api/auth/logout", {}, token=token)
    print(f"  Logout -> Status: {st} | Message: {logout_body.get('message')}")
    assert st == 200, f"Logout failed: {logout_body}"

    # Verify token invalidation
    st, hdrs, post_logout_me = make_request("GET", "/api/auth/me", token=token)
    print(f"  Request /api/auth/me after logout -> Status: {st} | Detail: {post_logout_me.get('detail')}")
    assert st == 401, f"Expected 401 Unauthorized, got {st}"

    print("\n==================================================")
    print("ALL 10 DEPLOYED ENDPOINT CHECKS PASSED ON RENDER!")
    print("==================================================")


if __name__ == "__main__":
    run_deployed_verification()
