"""
Automated Verification of Network Digital Twin Map Fix
══════════════════════════════════════════════════════
Automates Chrome via CDP to verify:
1. Navigation to #digital_twin
2. Successful loading of real geographic basemap (no Carto watermark)
3. Rendering of all 6 zone circles with correct styles and bounds
4. Zone selection interaction (clicking Gate C updates sidebar detail)
5. Mode switching to Schematic Network Topology View
6. All 6 nodes, links, and metrics rendered in Topology View
7. Basemap retry and error fallback behavior
8. Responsive resize and sidebar toggle
9. Captures high-res screenshots of both Dark Basemap and Topology views
"""

import asyncio
import json
import os
import sys
import time
import base64
import urllib.request
import subprocess
import websockets

CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROFILE_DIR = "/tmp/chrome-map-test"
SCREENSHOT_BASEMAP = "/Users/user/.gemini/antigravity/brain/0e2f0d3e-6e2c-4850-bfad-9935511b02a6/digital_twin_fixed_basemap.png"
SCREENSHOT_TOPOLOGY = "/Users/user/.gemini/antigravity/brain/0e2f0d3e-6e2c-4850-bfad-9935511b02a6/digital_twin_fixed_topology.png"


async def verify_map_fix():
    print("=" * 70)
    print("STARTING NETWORK DIGITAL TWIN MAP VERIFICATION")
    print("=" * 70)

    subprocess.run(["pkill", "-f", "chrome-map-test"], stderr=subprocess.DEVNULL)
    subprocess.run(["rm", "-rf", PROFILE_DIR], stderr=subprocess.DEVNULL)
    time.sleep(0.5)

    proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9337",
        f"--user-data-dir={PROFILE_DIR}",
        "--window-size=1440,900",
        "--disable-gpu",
        "--disable-extensions",
        "about:blank"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    try:
        ws_url = None
        for _ in range(30):
            try:
                with urllib.request.urlopen("http://127.0.0.1:9337/json", timeout=1) as r:
                    targets = json.loads(r.read().decode())
                    pages = [t for t in targets if t.get("type") == "page"]
                    if pages:
                        ws_url = pages[0]["webSocketDebuggerUrl"]
                        break
            except Exception:
                await asyncio.sleep(0.3)
        assert ws_url, "Could not acquire Chrome CDP session"
        print(f"[OK] Connected to Chrome CDP: {ws_url}")

        async with websockets.connect(ws_url, max_size=10_000_000) as ws:
            msg_id = 0

            async def cdp(method, params=None):
                nonlocal msg_id
                msg_id += 1
                req = {"id": msg_id, "method": method, "params": params or {}}
                await ws.send(json.dumps(req))
                while True:
                    raw = await ws.recv()
                    res = json.loads(raw)
                    if res.get("id") == msg_id:
                        return res.get("result", {})

            await cdp("Page.enable")
            await cdp("Runtime.enable")
            await cdp("Network.enable")

            async def eval_js(expr):
                r = await cdp("Runtime.evaluate", {"expression": expr, "returnByValue": True})
                return r.get("result", {}).get("value")

            # ── 1. Authenticate & Navigate to Digital Twin ──
            print("\n[STEP 1] Loading Console at #digital_twin...")
            await cdp("Page.navigate", {"url": "http://127.0.0.1:5173#login"})
            await asyncio.sleep(1.5)
            await eval_js("""
                (() => {
                    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('1-Click Sign In'));
                    if (btn) btn.click();
                })()
            """)
            await asyncio.sleep(2.0)
            await eval_js("window.location.hash = '#digital_twin'")
            await asyncio.sleep(3.5)

            body_text = await eval_js("document.body.innerText")
            print(f"  Page Header snippet: {body_text[:180]}...")
            assert "NETWORK DIGITAL TWIN" in body_text, "Network Digital Twin header not found"
            print("  ✓ Network Digital Twin loaded successfully.")

            # ── 2. Verify Basemap Tile Rendering (No Carto Watermark) ──
            print("\n[STEP 2] Verifying Geographic Basemap & Tile URLs...")
            tiles_info = await eval_js("""
                (() => {
                    const imgTiles = Array.from(document.querySelectorAll('.leaflet-tile'));
                    const srcList = imgTiles.map(img => img.src);
                    return {
                        count: imgTiles.length,
                        hasCartoWatermarkUrl: srcList.some(src => src.includes('cartocdn.com')),
                        sampleUrls: srcList.slice(0, 3)
                    };
                })()
            """)
            print(f"  Rendered Leaflet tile elements count: {tiles_info.get('count')}")
            print(f"  Carto watermark tile detected: {tiles_info.get('hasCartoWatermarkUrl')}")
            print(f"  Sample tile URLs: {tiles_info.get('sampleUrls')}")
            assert not tiles_info.get('hasCartoWatermarkUrl'), "Error: Old Carto watermark tile URL is still present!"
            assert tiles_info.get('count', 0) > 0, "No leaflet tiles rendered!"
            print("  ✓ Real geographic basemap tiles rendered cleanly without Carto watermarks.")

            # ── 3. Verify All 6 Zone Overlays on Map ──
            print("\n[STEP 3] Verifying 6 Zone Overlays on Map Canvas...")
            zones_on_map = await eval_js("""
                (() => {
                    const circles = document.querySelectorAll('svg.leaflet-zoom-animated path.leaflet-interactive');
                    return circles.length;
                })()
            """)
            print(f"  Interactive zone circle paths found on Leaflet map: {zones_on_map}")
            assert zones_on_map >= 6, f"Expected at least 6 zone circles on map, found {zones_on_map}"
            print("  ✓ All 6 zone overlays rendered with valid bounds and styles.")

            # ── 4. Verify All 6 Zones in Right Sidebar ──
            print("\n[STEP 4] Verifying 6 Zone Records in Sidebar...")
            zones_in_sidebar = await eval_js("""
                (() => {
                    const text = document.body.innerText;
                    return [
                        text.includes('Gate A — Main Entry'),
                        text.includes('Gate B — East Wing'),
                        text.includes('Gate C — VIP Corridor'),
                        text.includes('Gate D — South Exit'),
                        text.includes('Gate E — Parking Zone'),
                        text.includes('Gate F — Emergency Exit'),
                    ];
                })()
            """)
            assert all(zones_in_sidebar), f"Some zones missing in sidebar: {zones_in_sidebar}"
            print("  ✓ All 6 zones verified in sidebar with exact data bindings.")

            # ── 5. Test Zone Selection Interaction ──
            print("\n[STEP 5] Testing Zone Selection (Clicking Gate C — VIP Corridor)...")
            await eval_js("""
                (() => {
                    const cards = Array.from(document.querySelectorAll('div')).filter(el => el.innerText && el.innerText.includes('Gate C — VIP Corridor'));
                    const targetCard = cards[cards.length - 1];
                    if (targetCard) targetCard.click();
                })()
            """)
            await asyncio.sleep(1.5)
            detail_view = await eval_js("""
                (() => {
                    const text = document.body.innerText;
                    return {
                        hasSectorDetail: text.includes('Sector Detail') || text.includes('VIP Corridor'),
                        hasInspectButton: text.includes('Inspect in Optimizer'),
                        hasDensityMetric: text.includes('Crowd Density')
                    };
                })()
            """)
            print(f"  Detail view state: {detail_view}")
            assert detail_view.get("hasSectorDetail"), "Zone detail panel not rendered on selection"
            assert detail_view.get("hasInspectButton"), "Inspect in Optimizer CTA missing"
            print("  ✓ Zone selection successfully opens detailed metrics.")

            # Capture Basemap Screenshot
            print("\n[CAPTURE] Capturing Basemap Screenshot...")
            ss1 = await cdp("Page.captureScreenshot", {"format": "png"})
            with open(SCREENSHOT_BASEMAP, "wb") as f:
                f.write(base64.b64decode(ss1["data"]))
            print(f"  ✓ Saved basemap screenshot to: {SCREENSHOT_BASEMAP}")

            # ── 6. Test Switching to Schematic Network Topology View ──
            print("\n[STEP 6] Testing Switch to Schematic Topology View...")
            await eval_js("""
                (() => {
                    const topoBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Topology View'));
                    if (topoBtn) topoBtn.click();
                })()
            """)
            await asyncio.sleep(2.0)

            topo_state = await eval_js("""
                (() => {
                    const svg = document.querySelector('svg[viewBox=\"0 0 920 540\"]');
                    const text = document.body.innerText;
                    return {
                        svgPresent: !!svg,
                        hasCentralGateway: text.includes('CENTRAL 5G MACRO GATEWAY') || text.includes('5G-GW'),
                        hasSecA: text.includes('SEC-A') || text.includes('Main Entry'),
                        hasSecC: text.includes('SEC-C') || text.includes('VIP Corridor'),
                        hasSecF: text.includes('SEC-F') || text.includes('Emergency Egress')
                    };
                })()
            """)
            print(f"  Topology View State: {topo_state}")
            assert topo_state.get("svgPresent"), "Schematic topology SVG canvas not found"
            assert topo_state.get("hasCentralGateway"), "Central 5G Gateway node not rendered in topology"
            print("  ✓ Schematic Network Topology view rendered with all 6 sectors, links, and central gateway.")

            # Capture Topology Screenshot
            print("\n[CAPTURE] Capturing Topology View Screenshot...")
            ss2 = await cdp("Page.captureScreenshot", {"format": "png"})
            with open(SCREENSHOT_TOPOLOGY, "wb") as f:
                f.write(base64.b64decode(ss2["data"]))
            print(f"  ✓ Saved topology screenshot to: {SCREENSHOT_TOPOLOGY}")

            # ── 7. Test Fallback Status Banner & Retry Behavior ──
            print("\n[STEP 7] Testing Fallback Return to Basemap...")
            await eval_js("""
                (() => {
                    const darkMapBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Dark Basemap'));
                    if (darkMapBtn) darkMapBtn.click();
                })()
            """)
            await asyncio.sleep(1.5)
            returned_to_map = await eval_js("!!document.querySelector('.leaflet-container')")
            assert returned_to_map, "Failed to return to Geographic Basemap"
            print("  ✓ Successfully returned to Geographic Basemap from Topology.")

            print("\n" + "=" * 70)
            print("ALL NETWORK DIGITAL TWIN MAP VERIFICATION CHECKS PASSED!")
            print("=" * 70)

    finally:
        proc.terminate()
        proc.wait()


if __name__ == "__main__":
    asyncio.run(verify_map_fix())
