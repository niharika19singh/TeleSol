import sys
import json
import time
import urllib.request
import urllib.parse
import os
import base64
import subprocess

SCREENSHOTS_DIR = "/Users/user/.gemini/antigravity/brain/0e2f0d3e-6e2c-4850-bfad-9935511b02a6/screenshots"
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

# Generate a real token using auth_service
sys.path.insert(0, "/Users/user/Documents/TeleSol-mac-release/backend")
from app.services.auth_service import create_access_token

token = create_access_token("usr_1793110751_556fba3b", "operator", "operator@telesol.io", "OPERATOR")
user_json = json.dumps({
    "id": "usr_1793110751_556fba3b",
    "username": "operator",
    "email": "operator@telesol.io",
    "full_name": "SENPAY Lead NOC Engineer",
    "role": "OPERATOR"
})

print(f"Generated real token for operator: {token[:25]}...")
