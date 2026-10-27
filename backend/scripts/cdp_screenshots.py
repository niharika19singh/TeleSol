import asyncio
import json
import os
import sys
import time
import base64
import urllib.request
import subprocess

import websockets

sys.path.insert(0, "/Users/user/Documents/TeleSol-mac-release/backend")
from app.services.auth_service import create_access_token

SCREENSHOTS_DIR = "/Users/user/.gemini/antigravity/brain/0e2f0d3e-6e2c-4850-bfad-9935511b02a6/screenshots"
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROFILE_DIR = "/tmp/chrome-cdp-profile"

async def capture_cdp():
    # Kill any stale chrome
    subprocess.run(["pkill", "-f", "chrome-cdp-profile"], stderr=subprocess.DEVNULL)
    time.sleep(0.5)

    # Launch headless Chrome with remote debugging
    chrome_proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9222",
        f"--user-data-dir={PROFILE_DIR}",
        "--window-size=1440,900",
        "--disable-gpu",
        "about:blank"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    try:
        # Wait for CDP to respond
        ws_url = None
        for _ in range(20):
            try:
                with urllib.request.urlopen("http://127.0.0.1:9222/json", timeout=2) as resp:
                    targets = json.loads(resp.read().decode())
                    if targets:
                        ws_url = targets[0].get("webSocketDebuggerUrl")
                        if ws_url:
                            break
            except Exception:
                time.sleep(0.3)

        if not ws_url:
            print("Failed to get WebSocketDebuggerUrl from Chrome")
            return

        print(f"Connected to Chrome CDP: {ws_url}")

        async with websockets.connect(ws_url, max_size=10_000_000) as ws:
            msg_id = 0

            async def send_cmd(method, params=None):
                nonlocal msg_id
                msg_id += 1
                req = {"id": msg_id, "method": method, "params": params or {}}
                await ws.send(json.dumps(req))
                while True:
                    raw = await ws.recv()
                    data = json.loads(raw)
                    if data.get("id") == msg_id:
                        return data.get("result", {})

            await send_cmd("Page.enable")
            await send_cmd("Runtime.enable")
            await send_cmd("Emulation.setDeviceMetricsOverride", {
                "width": 1440,
                "height": 900,
                "deviceScaleFactor": 1,
                "mobile": False
            })

            # 1. Capture Landing Page
            print("Capturing Landing Page...")
            await send_cmd("Page.navigate", {"url": "http://127.0.0.1:5173/#landing"})
            await asyncio.sleep(2.0)
            res = await send_cmd("Page.captureScreenshot", {"format": "png"})
            with open(os.path.join(SCREENSHOTS_DIR, "senpay_landing.png"), "wb") as f:
                f.write(base64.b64decode(res["data"]))
            print("Saved senpay_landing.png")

            # 2. Capture Login Screen
            print("Capturing Login Screen...")
            await send_cmd("Page.navigate", {"url": "http://127.0.0.1:5173/#login"})
            await asyncio.sleep(1.5)
            res = await send_cmd("Page.captureScreenshot", {"format": "png"})
            with open(os.path.join(SCREENSHOTS_DIR, "senpay_login.png"), "wb") as f:
                f.write(base64.b64decode(res["data"]))
            print("Saved senpay_login.png")

            # 3. Authenticate Operator Session via localStorage
            token = create_access_token("usr_1793110751_556fba3b", "operator", "operator@telesol.io", "OPERATOR")
            user_obj = {
                "id": "usr_1793110751_556fba3b",
                "username": "operator",
                "email": "operator@telesol.io",
                "full_name": "SENPAY Lead NOC Engineer",
                "role": "OPERATOR"
            }
            auth_script = f"""
            localStorage.setItem('senpay_auth_token', '{token}');
            localStorage.setItem('senpay_auth_user', JSON.stringify({json.dumps(user_obj)}));
            """
            await send_cmd("Runtime.evaluate", {"expression": auth_script})

            # 4. Capture Active Command Center
            print("Capturing Command Center...")
            await send_cmd("Page.navigate", {"url": "http://127.0.0.1:5173/#command_center"})
            await asyncio.sleep(2.5)
            res = await send_cmd("Page.captureScreenshot", {"format": "png"})
            with open(os.path.join(SCREENSHOTS_DIR, "senpay_command_center.png"), "wb") as f:
                f.write(base64.b64decode(res["data"]))
            print("Saved senpay_command_center.png")

            # 5. Open ML Model Architecture & Provenance Modal and Capture
            print("Opening ML Inspector Modal...")
            open_modal_script = """
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('ML Model') || b.textContent.includes('ML Model Specs'));
            if (btn) btn.click();
            """
            await send_cmd("Runtime.evaluate", {"expression": open_modal_script})
            await asyncio.sleep(1.5)
            res = await send_cmd("Page.captureScreenshot", {"format": "png"})
            with open(os.path.join(SCREENSHOTS_DIR, "senpay_ml_inspector.png"), "wb") as f:
                f.write(base64.b64decode(res["data"]))
            print("Saved senpay_ml_inspector.png")

            # 6. Capture Payment Operations Page
            print("Capturing Payment Operations...")
            await send_cmd("Page.navigate", {"url": "http://127.0.0.1:5173/#operations"})
            await asyncio.sleep(2.0)
            res = await send_cmd("Page.captureScreenshot", {"format": "png"})
            with open(os.path.join(SCREENSHOTS_DIR, "senpay_operations.png"), "wb") as f:
                f.write(base64.b64decode(res["data"]))
            print("Saved senpay_operations.png")

            print("All screenshots captured successfully!")

    finally:
        chrome_proc.terminate()
        chrome_proc.wait()

if __name__ == "__main__":
    asyncio.run(capture_cdp())
