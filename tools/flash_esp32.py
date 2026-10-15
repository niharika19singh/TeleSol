#!/usr/bin/env python3
"""
Aggressive ESP32 bootloader entry + flash script.
Tries multiple DTR/RTS patterns to enter bootloader mode.
"""
import serial
import time
import subprocess
import sys

PORT = "/dev/cu.usbserial-0001"
BAUD = 115200
ESPTOOL = "/Users/user/Library/Arduino15/packages/esp32/tools/esptool_py/4.5.1/esptool"
BUILD = "/Users/user/Downloads/TeleSol-mac-release/build32"

def try_bootloader_entry(ser, variant):
    """Try different DTR/RTS sequences to enter ESP32 bootloader."""
    if variant == 0:
        # Standard: DTR=EN, RTS=GPIO0
        ser.dtr = False; ser.rts = False; time.sleep(0.05)
        ser.dtr = False; ser.rts = True;  time.sleep(0.05)  # GPIO0 low
        ser.dtr = True;  ser.rts = True;  time.sleep(0.1)   # Reset
        ser.dtr = False; ser.rts = True;  time.sleep(0.05)  # Release reset, GPIO0 still low
        time.sleep(0.5)
        ser.rts = False                                       # Release GPIO0
    elif variant == 1:
        # Inverted: RTS=EN, DTR=GPIO0
        ser.rts = False; ser.dtr = False; time.sleep(0.05)
        ser.rts = False; ser.dtr = True;  time.sleep(0.05)  # GPIO0 low
        ser.rts = True;  ser.dtr = True;  time.sleep(0.1)   # Reset
        ser.rts = False; ser.dtr = True;  time.sleep(0.05)  # Release reset
        time.sleep(0.5)
        ser.dtr = False
    elif variant == 2:
        # Both low then toggle
        ser.dtr = True; ser.rts = True; time.sleep(0.1)
        ser.dtr = False; time.sleep(0.05)
        ser.dtr = True; time.sleep(0.05)
        ser.rts = False; time.sleep(0.5)
        ser.dtr = False
    elif variant == 3:
        # Quick double-tap
        for _ in range(3):
            ser.dtr = True; ser.rts = True; time.sleep(0.05)
            ser.dtr = False; ser.rts = False; time.sleep(0.05)
        ser.rts = True; time.sleep(0.05)
        ser.dtr = True; time.sleep(0.1)
        ser.dtr = False; time.sleep(0.5)
        ser.rts = False

print("=" * 50)
print("ESP32 Aggressive Flash Script")
print("=" * 50)

for variant in range(4):
    print(f"\n--- Bootloader entry variant {variant} ---")
    try:
        ser = serial.Serial(PORT, BAUD, timeout=1)
        try_bootloader_entry(ser, variant)
        ser.close()
        time.sleep(0.3)
    except Exception as e:
        print(f"  Serial error: {e}")
        continue

    # Try flashing
    cmd = [
        ESPTOOL,
        "--port", PORT,
        "--baud", "115200",
        "--chip", "esp32",
        "--before", "no_reset",
        "--after", "hard_reset",
        "write_flash", "-z",
        "--flash_mode", "dio",
        "--flash_size", "4MB",
        "0x1000", f"{BUILD}/TeleSol_ESP32_v3.ino.bootloader.bin",
        "0x8000", f"{BUILD}/TeleSol_ESP32_v3.ino.partitions.bin",
        "0x10000", f"{BUILD}/TeleSol_ESP32_v3.ino.bin",
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    output = result.stdout + result.stderr

    if "Writing at" in output or result.returncode == 0:
        print("SUCCESS! Firmware flashed!")
        print(output[-500:])
        sys.exit(0)
    elif "Failed to connect" in output or "No serial data" in output:
        print(f"  Variant {variant}: Failed to connect")
    else:
        print(f"  Output: {output[-200:]}")

# If all variants failed, try with default_reset as last resort
print("\n--- Last resort: default_reset ---")
cmd = [
    ESPTOOL,
    "--port", PORT,
    "--baud", "115200",
    "--chip", "esp32",
    "--before", "default_reset",
    "--after", "hard_reset",
    "write_flash", "-z",
    "--flash_mode", "dio",
    "--flash_size", "4MB",
    "0x1000", f"{BUILD}/TeleSol_ESP32_v3.ino.bootloader.bin",
    "0x8000", f"{BUILD}/TeleSol_ESP32_v3.ino.partitions.bin",
    "0x10000", f"{BUILD}/TeleSol_ESP32_v3.ino.bin",
]
result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
output = result.stdout + result.stderr
if "Writing at" in output or result.returncode == 0:
    print("SUCCESS!")
    print(output[-500:])
else:
    print("All attempts failed.")
    print("MANUAL FLASH INSTRUCTIONS:")
    print("1. Open Arduino IDE")
    print("2. Open: esp32/TeleSol_ESP32_v3.ino")
    print("3. Board: ESP32 Dev Module")
    print("4. Port: /dev/cu.usbserial-0001")
    print("5. Click Upload")
    print("6. When 'Connecting...' appears:")
    print("   - HOLD the BOOT button")
    print("   - TAP the RST/EN button")
    print("   - RELEASE BOOT after 1 sec")
    print(output[-300:])
