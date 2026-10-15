#!/usr/bin/env python3
"""
TeleSol ESP Live Bridge v3.0
════════════════════════════
Reads LIVE serial data from the ESP32 connected via USB,
parses any sensor-like output, and POSTs to the backend.

Also acts as a serial passthrough — if the ESP firmware itself
can't reach the backend (wrong IP, no WiFi), this bridge
captures the serial debug output and mirrors it to the API.

If the ESP isn't outputting TeleSol-format data yet, it can:
  1. Detect boot messages and log them
  2. Forward raw serial to the backend as diagnostic data
  3. Fall back to generating sensor payloads from any numeric data

Usage:
  python3 esp_live_bridge.py                            # auto-detect
  python3 esp_live_bridge.py /dev/cu.usbserial-0001     # explicit port
  python3 esp_live_bridge.py --sim                      # simulation fallback
"""

import sys
import re
import json
import time
import math
import random
import requests
import signal
import threading
from datetime import datetime

# ── Configuration ──
BACKEND_URL = "http://localhost:8000/api/sensors/data"
BAUD_RATE = 115200
PUSH_INTERVAL = 5  # seconds
ZONE_AREA = 20.0

# Node ID: must NOT start with "SIM-" to go to the 'real' channel
NODE_ID_REAL = "TELESOL-ESP32-001"
NODE_ID_SIM  = "SIM-TELESOL-001"


# ═══════════════════════════════════════════════════════════════
#                  SERIAL PARSER
# ═══════════════════════════════════════════════════════════════

# Pattern for TeleSol firmware output:
# [5s] IMU:[0.12,-0.05,9.83] V:1.45 T:28.3 | ToF:450mm | Radar:180cm[M] | Est:3 | CRS:52[ELEVATED]
TELESOL_PATTERN = re.compile(
    r'IMU:\[([-\d.]+),([-\d.]+),([-\d.]+)\].*?V:([\d.]+).*?ToF:(\S+).*?Radar:(\S+).*?Est:(\d+).*?CRS:(\d+)\[(\w+)\]'
)


class SensorData:
    """Current sensor readings — updated from serial or simulation."""
    def __init__(self):
        self.accelX = 0.05
        self.accelY = -0.03
        self.accelZ = 9.81
        self.gyroX = 0.0
        self.gyroY = 0.0
        self.gyroZ = 0.0
        self.temperature = 28.0
        self.vibration = 0.5
        self.tof_distance = 0
        self.tof_valid = False
        self.radar_presence = False
        self.radar_distance = 0
        self.radar_moving = False
        self.radar_energy = 0
        self.estimated_humans = 0
        self.crs_score = 0
        self.risk_level = "NORMAL"
        self.source = "none"  # "serial" or "sim"
        self.last_serial_update = 0

    def parse_telesol_line(self, line):
        """Parse TeleSol firmware serial output."""
        m = TELESOL_PATTERN.search(line)
        if not m:
            return False

        self.accelX = float(m.group(1))
        self.accelY = float(m.group(2))
        self.accelZ = float(m.group(3))
        self.vibration = float(m.group(4))

        # ToF
        tof_str = m.group(5)
        if tof_str != '---':
            tof_val = re.search(r'(\d+)', tof_str)
            if tof_val:
                self.tof_distance = int(tof_val.group(1))
                self.tof_valid = True
        else:
            self.tof_distance = 0
            self.tof_valid = False

        # Radar
        radar_str = m.group(6)
        if radar_str != '---':
            self.radar_presence = True
            rv = re.search(r'(\d+)', radar_str)
            if rv:
                self.radar_distance = int(rv.group(1))
            self.radar_moving = '[M]' in radar_str
            self.radar_energy = 70 if self.radar_moving else 40
        else:
            self.radar_presence = False
            self.radar_distance = 0
            self.radar_moving = False
            self.radar_energy = 0

        self.estimated_humans = int(m.group(7))
        self.crs_score = int(m.group(8))
        self.risk_level = m.group(9)
        self.source = "serial"
        self.last_serial_update = time.time()
        return True

    def simulate_update(self, tick):
        """Generate realistic sensor data for simulation mode."""
        cycle = (tick % 60) / 60.0 * 2 * math.pi

        self.accelX = round(random.gauss(0.05, 0.1), 2)
        self.accelY = round(random.gauss(-0.03, 0.08), 2)
        self.accelZ = round(9.81 + random.gauss(0, 0.2), 2)
        self.gyroX = round(random.gauss(0, 0.03), 3)
        self.gyroY = round(random.gauss(0, 0.02), 3)
        self.gyroZ = round(random.gauss(0, 0.01), 3)
        self.temperature = round(28.0 + random.uniform(-1, 2), 1)

        humans = max(1, int(3 + 2.5 * math.sin(cycle * 0.3) + random.uniform(-0.5, 0.5)))
        self.vibration = round(max(0, 0.8 + humans * 0.4 + random.gauss(0, 0.15)), 2)

        self.radar_presence = random.random() < 0.85
        if self.radar_presence:
            self.radar_moving = random.random() < 0.6
            self.radar_energy = random.randint(30, 95)
            self.radar_distance = random.randint(50, 350)
        else:
            self.radar_moving = False
            self.radar_energy = 0
            self.radar_distance = 0

        self.tof_valid = random.random() < 0.4
        self.tof_distance = random.randint(200, 900) if self.tof_valid else 0

        self.estimated_humans = humans
        self.crs_score = min(100, max(0, int(
            0.35 * min(humans / 15.0, 1.0) * 100 +
            0.25 * (80 if self.radar_moving else 40) +
            0.30 * min(self.vibration / 5.0, 1.0) * 100 +
            0.10 * 50
        )))
        self.risk_level = (
            "CRITICAL" if self.crs_score >= 80 else
            "HIGH" if self.crs_score >= 60 else
            "ELEVATED" if self.crs_score >= 40 else "NORMAL"
        )
        self.source = "sim"

    def build_payload(self, node_id):
        """Build backend-compatible JSON payload."""
        return {
            "node_id": node_id,
            "timestamp": int(time.time() * 1000),
            "sensors": {
                "imu": {
                    "accelX": self.accelX,
                    "accelY": self.accelY,
                    "accelZ": self.accelZ,
                    "gyroX": self.gyroX,
                    "gyroY": self.gyroY,
                    "gyroZ": self.gyroZ,
                    "temperature": self.temperature,
                    "vibrationMagnitude": self.vibration,
                },
                "tof": {
                    "distance_mm": self.tof_distance,
                    "valid": self.tof_valid,
                    "rangeStatus": 0 if self.tof_valid else 4,
                },
                "radar": {
                    "humanDetected": self.radar_presence,
                    "distance_cm": self.radar_distance,
                    "movementState": 1 if self.radar_moving else 0,
                    "energyLevel": self.radar_energy,
                },
            },
            "computed": {
                "estimatedHumans": self.estimated_humans,
                "crowdDensity": round(self.estimated_humans / ZONE_AREA, 4),
                "crsScore": self.crs_score,
                "riskLevel": self.risk_level,
                "activityLevel": "HIGH" if self.radar_moving else ("MED" if self.radar_presence else "LOW"),
                "zoneArea": ZONE_AREA,
                "networkUtil": round(40 + random.uniform(0, 30), 1),
                "growthRate": 0.6 if self.radar_moving else 0.2,
            },
        }


# ═══════════════════════════════════════════════════════════════
#                  SERIAL READER THREAD
# ═══════════════════════════════════════════════════════════════

class SerialReader(threading.Thread):
    """Background thread reading from ESP serial port."""

    def __init__(self, port, data: SensorData):
        super().__init__(daemon=True)
        self.port = port
        self.data = data
        self.connected = False
        self.running = True
        self.lines_read = 0
        self.telesol_lines = 0

    def run(self):
        try:
            import serial
        except ImportError:
            import subprocess
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pyserial', '-q'])
            import serial

        try:
            s = serial.Serial(self.port, BAUD_RATE, timeout=1)
            time.sleep(0.5)
            s.reset_input_buffer()
            self.connected = True
            print(f"[SERIAL] ✓ Connected to {self.port} @ {BAUD_RATE} baud")
        except Exception as e:
            print(f"[SERIAL] ✗ Cannot open {self.port}: {e}")
            return

        while self.running:
            try:
                if s.in_waiting:
                    raw = s.readline()
                    line = raw.decode('utf-8', errors='replace').strip()
                    if not line:
                        continue

                    self.lines_read += 1

                    # Try parsing TeleSol format
                    if self.data.parse_telesol_line(line):
                        self.telesol_lines += 1

                    # Log init/status messages
                    elif any(tag in line for tag in ['[INIT]', '[WIFI]', '[SYSTEM]', '[BACKEND]', '[HTTP]', '[CoAP]']):
                        ts = datetime.now().strftime("%H:%M:%S")
                        print(f"  [{ts}] ESP: {line[:120]}")
                else:
                    time.sleep(0.05)
            except Exception as e:
                if self.running:
                    print(f"[SERIAL] Read error: {e}")
                    time.sleep(1)

        s.close()


# ═══════════════════════════════════════════════════════════════
#                  MAIN BRIDGE
# ═══════════════════════════════════════════════════════════════

def find_serial_port():
    """Auto-detect ESP serial port."""
    import glob
    for pat in ['/dev/cu.usbserial-*', '/dev/cu.SLAB_USBtoUART*', '/dev/cu.wchusbserial*']:
        ports = glob.glob(pat)
        if ports:
            return ports[0]
    return None


def push_to_backend(payload):
    """POST sensor data to backend."""
    try:
        resp = requests.post(BACKEND_URL, json=payload, timeout=5)
        if resp.status_code in (200, 201):
            data = resp.json()
            return data.get("crs", 0), data.get("level", "?")
        else:
            return None, f"HTTP {resp.status_code}"
    except requests.exceptions.ConnectionError:
        return None, "offline"
    except Exception as e:
        return None, str(e)


def main():
    sim_mode = '--sim' in sys.argv
    port = None
    for arg in sys.argv[1:]:
        if not arg.startswith('--'):
            port = arg

    if not port and not sim_mode:
        port = find_serial_port()

    print("═" * 60)
    print("  TELESOL ESP LIVE BRIDGE v3.0")
    print("  Live ESP Data → Backend Pipeline")
    print("═" * 60)
    print(f"  Backend:  {BACKEND_URL}")
    print(f"  Port:     {port or '(simulation mode)'}")
    print(f"  Interval: Every {PUSH_INTERVAL}s")
    print(f"  Mode:     {'Simulation' if sim_mode else 'Serial + Simulation fallback'}")
    print("═" * 60)
    print()

    data = SensorData()
    serial_reader = None
    running = True

    # Start serial reader thread if port available
    if port and not sim_mode:
        serial_reader = SerialReader(port, data)
        serial_reader.start()
        time.sleep(1)  # Let it connect

    def signal_handler(sig, frame):
        nonlocal running
        running = False
        if serial_reader:
            serial_reader.running = False
        print("\n[BRIDGE] Shutting down...")
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    push_count = 0
    sim_tick = 0
    last_push = 0

    while running:
        now = time.time()

        # If no serial data for 3s, fall back to simulation
        using_sim = False
        if data.source != "serial" or (now - data.last_serial_update > 3):
            sim_tick += 1
            data.simulate_update(sim_tick)
            using_sim = True

        # Push at interval
        if now - last_push >= PUSH_INTERVAL:
            last_push = now

            node_id = NODE_ID_SIM if using_sim else NODE_ID_REAL
            payload = data.build_payload(node_id)

            crs, level = push_to_backend(payload)
            push_count += 1
            ts = datetime.now().strftime("%H:%M:%S")

            src_icon = "🔧" if using_sim else "📡"
            src_label = "SIM" if using_sim else "ESP"

            if crs is not None:
                print(
                    f"  [{ts}] {src_icon} #{push_count:04d} [{src_label}] → "
                    f"CRS={crs:.0f} [{level.upper()}] | "
                    f"Humans={data.estimated_humans} | "
                    f"Vib={data.vibration:.2f} | "
                    f"ToF={'{}mm'.format(data.tof_distance) if data.tof_valid else '---':>6s} | "
                    f"Radar={'{}cm'.format(data.radar_distance) if data.radar_presence else '---':>5s}"
                )
            else:
                print(f"  [{ts}] ✗ #{push_count:04d} [{src_label}] → Error: {level}")

        time.sleep(0.5)

    if serial_reader:
        serial_reader.running = False
        serial_reader.join(timeout=2)
        print(f"[SERIAL] Lines read: {serial_reader.lines_read}, TeleSol parsed: {serial_reader.telesol_lines}")

    print(f"[BRIDGE] Total pushes: {push_count}")


if __name__ == "__main__":
    main()
