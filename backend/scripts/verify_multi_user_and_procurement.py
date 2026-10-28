"""
SENPAY Multi-User, Role Separation & Outcome-Driven Procurement Browser CDP Verification
"""

import asyncio
import json
import os
import sys
import time
import base64
import urllib.request
import websockets

sys.path.insert(0, "/Users/user/Documents/TeleSol-mac-release/backend")
from app.services.auth_service import create_access_token, ROLE_PLATFORM_ADMIN, ROLE_NOC_OPERATOR

ARTIFACT_DIR = "/Users/user/.gemini/antigravity/brain/0e2f0d3e-6e2c-4850-bfad-9935511b02a6"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

async def run_verification():
    # Discover Chrome target on 9222
    with urllib.request.urlopen("http://127.0.0.1:9222/json", timeout=5) as resp:
        targets = json.loads(resp.read().decode())
        ws_url = None
        for t in targets:
            if t.get("type") == "page":
                ws_url = t.get("webSocketDebuggerUrl")
                break
        if not ws_url and targets:
            ws_url = targets[0].get("webSocketDebuggerUrl")

    if not ws_url:
        print("[ERROR] Could not find page target on Chrome CDP port 9222")
        return

    print(f"[CDP] Connecting to {ws_url}")
    async with websockets.connect(ws_url, max_size=20_000_000) as ws:
        msg_id = 0

        async def send(method, params=None):
            nonlocal msg_id
            msg_id += 1
            payload = {"id": msg_id, "method": method, "params": params or {}}
            await ws.send(json.dumps(payload))
            while True:
                raw = await ws.recv()
                msg = json.loads(raw)
                if msg.get("id") == msg_id:
                    return msg.get("result", {})

        await send("Page.enable")
        await send("Runtime.enable")
        await send("Emulation.setDeviceMetricsOverride", {
            "width": 1440,
            "height": 920,
            "deviceScaleFactor": 1,
            "mobile": False
        })

        async def capture(filename, desc):
            await asyncio.sleep(1.2)
            res = await send("Page.captureScreenshot", {"format": "png"})
            filepath = os.path.join(ARTIFACT_DIR, filename)
            with open(filepath, "wb") as f:
                f.write(base64.b64decode(res["data"]))
            print(f"[SCREENSHOT] Saved {filename} ({desc})")

        async def set_theme(theme_name):
            # 'light' or 'dark'
            expr = f"""
            localStorage.setItem('senpay_theme', '{theme_name}');
            if (window.dispatchEvent) {{
                window.dispatchEvent(new Event('storage'));
            }}
            document.documentElement.classList.toggle('dark', '{theme_name}' === 'dark');
            document.documentElement.setAttribute('data-theme', '{theme_name}');
            """
            await send("Runtime.evaluate", {"expression": expr})
            await asyncio.sleep(0.5)

        async def clear_auth():
            expr = """
            localStorage.removeItem('senpay_auth_token');
            localStorage.removeItem('senpay_auth_user');
            """
            await send("Runtime.evaluate", {"expression": expr})

        async def set_auth(user_obj, role):
            token = create_access_token(
                user_id=user_obj["id"],
                username=user_obj["username"],
                email=user_obj["email"],
                role=role,
                workspace_id=user_obj.get("workspace_id", "ws_telesol_default"),
                org_name=user_obj.get("org_name", "TeleSol Global")
            )
            expr = f"""
            localStorage.setItem('senpay_auth_token', '{token}');
            localStorage.setItem('senpay_auth_user', JSON.stringify({json.dumps(user_obj)}));
            """
            await send("Runtime.evaluate", {"expression": expr})

        # ── 1. SIGNUP PAGE ──
        print("\n--- 1. Testing Registration (Signup Page) ---")
        await clear_auth()
        await send("Page.navigate", {"url": "http://127.0.0.1:5173/#signup"})
        await asyncio.sleep(1.5)

        await set_theme("light")
        await capture("signup_porcelain_light.png", "Registration Page (Porcelain Light)")

        await set_theme("dark")
        await capture("signup_obsidian_dark.png", "Registration Page (Obsidian Dark)")

        # ── 2. VERIFY EMAIL PAGE ──
        print("\n--- 2. Testing Email Verification ---")
        await send("Page.navigate", {"url": "http://127.0.0.1:5173/#verify-email?token=SAMPLE_TOKEN_DEMO_2026"})
        await asyncio.sleep(1.0)
        await set_theme("dark")
        await capture("verify_email_obsidian_dark.png", "Verify Email Screen (Obsidian Dark)")
        await set_theme("light")
        await capture("verify_email_porcelain_light.png", "Verify Email Screen (Porcelain Light)")

        # ── 3. FORGOT & RESET PASSWORD PAGES ──
        print("\n--- 3. Testing Password Recovery ---")
        await send("Page.navigate", {"url": "http://127.0.0.1:5173/#forgot-password"})
        await asyncio.sleep(1.0)
        await set_theme("dark")
        await capture("forgot_password_obsidian_dark.png", "Forgot Password Screen (Obsidian Dark)")

        await send("Page.navigate", {"url": "http://127.0.0.1:5173/#reset-password?token=RESET_DEMO_CODE"})
        await asyncio.sleep(1.0)
        await set_theme("light")
        await capture("reset_password_porcelain_light.png", "Reset Password Screen (Porcelain Light)")

        # ── 4. UNAUTHORIZED BOUNDARY (RBAC) ──
        print("\n--- 4. Testing Unauthorized Access Boundary (RBAC) ---")
        operator_user = {
            "id": "usr_operator_eval",
            "username": "operator",
            "email": "operator@telesol.io",
            "full_name": "SENPAY Lead NOC Engineer",
            "role": ROLE_NOC_OPERATOR,
            "workspace_id": "ws_telesol_default",
            "org_name": "TeleSol Cork NOC"
        }
        await set_auth(operator_user, ROLE_NOC_OPERATOR)
        # Attempt to access #admin with operator account
        await send("Page.navigate", {"url": "http://127.0.0.1:5173/#admin"})
        await asyncio.sleep(1.5)
        await set_theme("dark")
        await capture("unauthorized_obsidian_dark.png", "403 Forbidden Access Boundary (Obsidian Dark)")
        await set_theme("light")
        await capture("unauthorized_porcelain_light.png", "403 Forbidden Access Boundary (Porcelain Light)")

        # ── 5. PLATFORM ADMINISTRATION CONSOLE ──
        print("\n--- 5. Testing Platform Administration Console ---")
        admin_user = {
            "id": "usr_admin_root",
            "username": "admin",
            "email": "admin@telesol.io",
            "full_name": "Platform Administrator",
            "role": ROLE_PLATFORM_ADMIN,
            "workspace_id": "ws_telesol_default",
            "org_name": "TeleSol Global Infrastructure"
        }
        await set_auth(admin_user, ROLE_PLATFORM_ADMIN)
        await send("Page.navigate", {"url": "http://127.0.0.1:5173/#admin"})
        await asyncio.sleep(2.0)

        # Tab: Overview
        await set_theme("dark")
        await capture("admin_overview_obsidian_dark.png", "Platform Admin Overview (Obsidian Dark)")
        await set_theme("light")
        await capture("admin_overview_porcelain_light.png", "Platform Admin Overview (Porcelain Light)")

        # Tab: Users & Roles
        print("[CDP] Clicking Users & Roles Tab...")
        await send("Runtime.evaluate", {
            "expression": "Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Users & Roles'))?.click();"
        })
        await asyncio.sleep(1.5)
        await set_theme("dark")
        await capture("admin_users_obsidian_dark.png", "Admin User Management & Elevation (Obsidian Dark)")
        await set_theme("light")
        await capture("admin_users_porcelain_light.png", "Admin User Management & Elevation (Porcelain Light)")

        # Tab: Workspaces
        print("[CDP] Clicking Workspaces Tab...")
        await send("Runtime.evaluate", {
            "expression": "Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Workspaces'))?.click();"
        })
        await asyncio.sleep(1.5)
        await set_theme("dark")
        await capture("admin_workspaces_obsidian_dark.png", "Admin Multi-Tenant Workspaces (Obsidian Dark)")

        # Tab: Security Audit Log
        print("[CDP] Clicking Security Audit Log Tab...")
        await send("Runtime.evaluate", {
            "expression": "Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Security Audit Log'))?.click();"
        })
        await asyncio.sleep(1.5)
        await set_theme("dark")
        await capture("admin_security_obsidian_dark.png", "Admin SHA-256 Chained Audit Trail (Obsidian Dark)")
        await set_theme("light")
        await capture("admin_security_porcelain_light.png", "Admin SHA-256 Chained Audit Trail (Porcelain Light)")

        # Tab: Integrations
        print("[CDP] Clicking Integrations Tab...")
        await send("Runtime.evaluate", {
            "expression": "Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Telecom & Chain'))?.click();"
        })
        await asyncio.sleep(1.5)
        await set_theme("dark")
        await capture("admin_integrations_obsidian_dark.png", "Telecom & Blockchain Integrations (Obsidian Dark)")

        # ── 6. OUTCOME-DRIVEN SERVICE AGREEMENTS & PROCUREMENT ──
        print("\n--- 6. Testing Outcome-Driven Service Agreements ---")
        await send("Page.navigate", {"url": "http://127.0.0.1:5173/#agreements"})
        await asyncio.sleep(2.0)
        await set_theme("dark")
        await capture("agreements_outcome_obsidian_dark.png", "Service Agreements with Outcome Contracts (Obsidian Dark)")
        await set_theme("light")
        await capture("agreements_outcome_porcelain_light.png", "Service Agreements with Outcome Contracts (Porcelain Light)")

        # ── 7. ACTIVE COMMAND CENTER WITH IDENTITY PILL & ADMIN SHORTCUT ──
        print("\n--- 7. Testing Active Command Center with Platform Admin Identity ---")
        await send("Page.navigate", {"url": "http://127.0.0.1:5173/#command_center"})
        await asyncio.sleep(2.5)
        await set_theme("dark")
        await capture("command_center_admin_obsidian_dark.png", "Command Center with Admin Nav & Identity (Obsidian Dark)")
        await set_theme("light")
        await capture("command_center_admin_porcelain_light.png", "Command Center with Admin Nav & Identity (Porcelain Light)")

        print("\n[SUCCESS] All multi-user, RBAC, and outcome-driven procurement verification flows completed!")

if __name__ == "__main__":
    asyncio.run(run_verification())
