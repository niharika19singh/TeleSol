#!/usr/bin/env python3
"""
TeleSol ESP Serial Bridge v2.0
═══════════════════════════════
Reads sensor data from an ESP (ESP12E/ESP32) via USB serial,
parses the serial output, and POSTs it to the TeleSol backend.

This bridges the gap when:
  • The ESP cannot reach the backend over WiFi (wrong IP, no WiFi, etc.)
  • You want to debug the serial output AND feed the backend simultaneously
  • The firmware is sending data over Serial but HTTP push is failing

Usage:
  python3 esp_serial_bridge.py                          # auto-detect port
  python3 esp_serial_bridge.py /dev/cu.usbserial-0001   # explicit port
  python3 esp_serial_bridge.py --test                   # test with simulated data
"""

import sys
import re
import json
import time
import requests
import signal
from datetime import datetime

# ── Configuration ──
BACKEND_URL = "http://localhost:8000/api/sensors/data"
NODE_ID = "TELESOL-ESP12E-001"
BAUD_RATE = 115200
PUSH_INTERVAL = 5  # seconds
ZONE_AREA = 20.0

# ── Regex patterns for parsing ESP serial output ──
# Expected format: [123s] IMU:[0.1,-0.2,9.8] V:1.50 T:28.5 | ToF:500mm | Radar:150cm[M] | Est:2 | CRS:40[ELEVATED]
SERIAL_PATTERN = re.compile(
    r'\[(\d+)s\]\s+'
    r'IMU:\[([-\d.]+),([-\d.]+),([-\d.]+)\]\s+'
    r'V:([\d.]+)\s+'
    r'(?:T:([\d.]+)\s+)?'
    r'\|\s+ToF:([\d]+mm|---)\s+'
    r'\|\s+Radar:([\d]+cm(?:\[.\])?|---)\s+'
    r'\|\s+Est:(\d+)\s+'
    r'\|\s+CRS:(\d+)\[(\w+)\]'
)

# Alternate simpler pattern
SIMPLE_PATTERN = re.compile(
    r'IMU:\[([-\d.]+),([-\d.]+),([-\d.]+)\].*?V:([\d.]+).*?ToF:(\S+).*?Radar:(\S+).*?Est:(\d+).*?CRS:(\d+)\[(\w+)\]'
)


class ESPSerialBridge:
    def __init__(self, port=None, test_mode=False):
        self.port = port
        self.test_mode = test_mode
        self.serial_conn = None
        self.push_count = 0
        self.parse_count = 0
        self.error_count = 0
        self.last_push_time = 0
        self.latest_data = {}
        self.running = True

        # Latest parsed sensor values
        self.accelX = 0.0
        self.accelY = 0.0
        self.accelZ = 9.81
        self.gyroX = 0.0
        self.gyroY = 0.0
        self.gyroZ = 0.0
        self.temperature = 28.0
        self.vibration = 0.0
        self.tof_distance = 0
        self.tof_valid = False
        self.radar_presence = False
        self.radar_distance = 0
        self.radar_moving = False
        self.radar_energy = 0
        self.estimated_humans = 0
        self.crs_score = 0
        self.risk_level = "NORMAL"

    def find_serial_port(self):
        """Auto-detect the ESP serial port."""
        import glob
        patterns = [
            '/dev/cu.usbserial-*',
            '/dev/cu.SLAB_USBtoUART*',
            '/dev/cu.wchusbserial*',
            '/dev/tty.usbserial-*',
        ]
        for pat in patterns:
            ports = glob.glob(pat)
            if ports:
                return ports[0]
        return None

    def connect_serial(self):
        """Open the serial connection."""
        try:
            import serial
        except ImportError:
            print("[ERROR] pyserial not installed. Installing...")
            import subprocess
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pyserial', '-q'])
            import serial

        if not self.port:
            self.port = self.find_serial_port()
        if not self.port:
            print("[ERROR] No serial port found. Is the ESP plugged in?")
            print("        Available ports:")
            import serial.tools.list_ports
            for p in serial.tools.list_ports.comports():
                print(f"          {p.device} — {p.description}")
            return False

        try:
            self.serial_conn = serial.Serial(
                port=self.port,
                baudrate=BAUD_RATE,
                timeout=1,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
            )
            time.sleep(0.5)  # Let the connection settle
            # Flush any garbage
            self.serial_conn.reset_input_buffer()
            print(f"[SERIAL] Connected to {self.port} at {BAUD_RATE} baud")
            return True
        except Exception as e:
            print(f"[ERROR] Cannot open {self.port}: {e}")
            return False

    def parse_serial_line(self, line):
        """Parse a line of ESP serial output and update internal state."""
        line = line.strip()
        if not line:
            return False

        # Try the main pattern
        m = SIMPLE_PATTERN.search(line)
        if m:
            self.accelX = float(m.group(1))
            self.accelY = float(m.group(2))
            self.accelZ = float(m.group(3))
            self.vibration = float(m.group(4))

            # Parse ToF
            tof_str = m.group(5)
            if tof_str != '---':
                tof_val = re.search(r'(\d+)', tof_str)
                if tof_val:
                    self.tof_distance = int(tof_val.group(1))
                    self.tof_valid = True
            else:
                self.tof_distance = 0
                self.tof_valid = False

            # Parse Radar
            radar_str = m.group(6)
            if radar_str != '---':
                self.radar_presence = True
                radar_val = re.search(r'(\d+)', radar_str)
                if radar_val:
                    self.radar_distance = int(radar_val.group(1))
                self.radar_moving = '[M]' in radar_str
                # Estimate energy from movement and distance
                self.radar_energy = 70 if self.radar_moving else 40
            else:
                self.radar_presence = False
                self.radar_distance = 0
                self.radar_moving = False
                self.radar_energy = 0

            self.estimated_humans = int(m.group(7))
            self.crs_score = int(m.group(8))
            self.risk_level = m.group(9)

            self.parse_count += 1
            return True

        # Check for status messages
        if '[INIT]' in line or '[WIFI]' in line or '[SYSTEM]' in line or '[BACKEND]' in line:
            ts = datetime.now().strftime("%H:%M:%S")
            print(f"  [{ts}] ESP: {line}")

        return False

    def build_payload(self):
        """Build a JSON payload matching the SensorPayload schema."""
        return {
            "node_id": NODE_ID,
            "timestamp": int(time.time() * 1000),
            "sensors": {
                "imu": {
                    "accelX": round(self.accelX, 2),
                    "accelY": round(self.accelY, 2),
                    "accelZ": round(self.accelZ, 2),
                    "gyroX": round(self.gyroX, 3),
                    "gyroY": round(self.gyroY, 3),
                    "gyroZ": round(self.gyroZ, 3),
                    "temperature": round(self.temperature, 1),
                    "vibrationMagnitude": round(self.vibration, 2),
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
                "networkUtil": 50.0,
                "growthRate": 0.6 if self.radar_moving else 0.2,
            },
        }

    def push_to_backend(self):
        """POST the current sensor data to the backend."""
        now = time.time()
        if now - self.last_push_time < PUSH_INTERVAL:
            return

        if self.parse_count == 0:
            return  # No data parsed yet

        self.last_push_time = now
        payload = self.build_payload()

        try:
            resp = requests.post(BACKEND_URL, json=payload, timeout=5)
            self.push_count += 1

            if resp.status_code in (200, 201):
                data = resp.json()
                crs = data.get("crs", 0)
                level = data.get("level", "?")
                ts = datetime.now().strftime("%H:%M:%S")
                print(
                    f"  [{ts}] ✓ POST #{self.push_count:04d} → "
                    f"CRS={crs:.0f} [{level.upper()}] | "
                    f"Humans={self.estimated_humans} | "
                    f"Vib={self.vibration:.2f} | "
                    f"ToF={'{}mm'.format(self.tof_distance) if self.tof_valid else '---'} | "
                    f"Radar={'{}cm'.format(self.radar_distance) if self.radar_presence else '---'}"
                )
            else:
                self.error_count += 1
                print(f"  [ERROR] HTTP {resp.status_code}: {resp.text[:100]}")

        except requests.exceptions.ConnectionError:
            self.error_count += 1
            print(f"  [WARN] Backend offline at {BACKEND_URL}")
        except Exception as e:
            self.error_count += 1
            print(f"  [ERROR] {e}")

    def run_serial(self):
        """Main loop: read serial, parse, push."""
        if not self.connect_serial():
            return

        print(f"[BRIDGE] Reading ESP serial → Backend pipeline active")
        print(f"[BRIDGE] Push interval: {PUSH_INTERVAL}s\n")

        while self.running:
            try:
                if self.serial_conn.in_waiting > 0:
                    raw = self.serial_conn.readline()
                    try:
                        line = raw.decode('utf-8', errors='replace').strip()
                    except Exception:
                        line = raw.decode('ascii', errors='replace').strip()

                    if line:
                        parsed = self.parse_serial_line(line)
                        if parsed:
                            self.push_to_backend()
                else:
                    time.sleep(0.05)  # Avoid busy loop

            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"[ERROR] Serial read: {e}")
                time.sleep(1)

        if self.serial_conn:
            self.serial_conn.close()
            print("[SERIAL] Connection closed")

    def run_test(self):
        """Test mode: simulate ESP serial lines to verify parsing + backend push."""
        test_lines = [
            "[INIT] MPU6050 IMU......... ✓ OK (±8G, ±500°/s)",
            "[INIT] VL53L0X ToF......... ✓ OK",
            "[INIT] HLK-LD2420 Radar.... ✓ OK",
            "[INIT] WiFi Connection..... ✓ OK",
            "[WIFI] IP: 192.168.29.100",
            "[SYSTEM] Starting main loop...",
            "[5s] IMU:[0.12,-0.05,9.83] V:1.45 T:28.3 | ToF:450mm | Radar:180cm[M] | Est:3 | CRS:52[ELEVATED]",
            "[10s] IMU:[0.08,0.02,9.79] V:2.10 T:28.5 | ToF:320mm | Radar:120cm[M] | Est:4 | CRS:61[HIGH]",
            "[15s] IMU:[-0.03,0.11,9.85] V:0.80 T:28.2 | ToF:--- | Radar:250cm[S] | Est:1 | CRS:35[NORMAL]",
            "[20s] IMU:[0.15,-0.08,9.82] V:3.20 T:28.7 | ToF:200mm | Radar:90cm[M] | Est:5 | CRS:72[HIGH]",
            "[25s] IMU:[0.01,0.04,9.80] V:0.30 T:28.1 | ToF:--- | Radar:--- | Est:0 | CRS:15[NORMAL]",
            "[30s] IMU:[0.20,-0.12,9.84] V:4.50 T:29.0 | ToF:150mm | Radar:50cm[M] | Est:6 | CRS:85[CRITICAL]",
        ]

        print("[TEST] Running test mode with simulated serial lines...\n")

        for line in test_lines:
            parsed = self.parse_serial_line(line)
            if parsed:
                self.last_push_time = 0  # Force push
                self.push_to_backend()
            time.sleep(1)

        print(f"\n[TEST] Done. Parsed: {self.parse_count}, Pushed: {self.push_count}, Errors: {self.error_count}")

    def run(self):
        """Entry point."""
        if self.test_mode:
            self.run_test()
        else:
            self.run_serial()


def main():
    print("=" * 60)
    print("  TELESOL ESP SERIAL BRIDGE v2.0")
    print("  ESP Serial → Parse → Backend Pipeline")
    print("=" * 60)
    print(f"  Backend:  {BACKEND_URL}")
    print(f"  Node ID:  {NODE_ID}")
    print(f"  Baud:     {BAUD_RATE}")
    print("=" * 60)
    print()

    port = None
    test_mode = False

    for arg in sys.argv[1:]:
        if arg == '--test':
            test_mode = True
        elif arg == '--help':
            print("Usage: esp_serial_bridge.py [PORT] [--test]")
            print("  PORT    Serial port (e.g. /dev/cu.usbserial-0001)")
            print("  --test  Run with simulated data to test the pipeline")
            sys.exit(0)
        else:
            port = arg

    bridge = ESPSerialBridge(port=port, test_mode=test_mode)

    # Graceful shutdown
    def signal_handler(sig, frame):
        bridge.running = False
        print("\n[BRIDGE] Shutting down...")
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    bridge.run()


if __name__ == "__main__":
    main()
