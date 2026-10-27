"""
SENPAY OpenCelliD Telecom Data Provider Interface
═════════════════════════════════════════════════
Integrates OpenCelliD (the world's largest open cellular database):
- License: Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
- Source: https://opencellid.org/
- Data Characteristics: Crowdsourced cell tower locations, MCC, MNC, LAC/TAC, CellID,
  radio type (GSM, UMTS, LTE, NR), estimated range in meters, and observation sample counts.

CRITICAL ARCHITECTURAL CONSTRAINTS:
1. Requires a valid API token via OPENCELLID_API_KEY environment variable.
2. If OPENCELLID_API_KEY is missing, gracefully reports unconfigured state without fabricated data.
3. Distinguishes estimated cell tower coordinates (triangulated) from physical surveyed masts.
4. OpenCelliD 'range' represents approximate signal radius, NEVER verified RF propagation contours.
"""

import os
import json
import time
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from pathlib import Path

logger = logging.getLogger("telesol.telecom.opencellid")

CACHE_DIR = Path(__file__).parent.parent.parent / "data" / "cache"
CACHE_FILE = CACHE_DIR / "opencellid_cache.json"


class OpenCellIdProvider:
    def __init__(self):
        self.api_key: Optional[str] = os.environ.get("OPENCELLID_API_KEY")
        self.base_url: str = "https://opencellid.org"
        self._cache: Dict[str, Any] = self._load_cache()

    def _load_cache(self) -> Dict[str, Any]:
        """Load cached OpenCelliD responses to respect rate limits and quotas."""
        if CACHE_FILE.exists():
            try:
                with open(CACHE_FILE, "r") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"[OpenCelliD] Failed to read cache: {e}")
        return {}

    def _save_cache(self):
        """Persist cache to disk."""
        try:
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            with open(CACHE_FILE, "w") as f:
                json.dump(self._cache, f)
        except Exception as e:
            logger.warning(f"[OpenCelliD] Failed to save cache: {e}")

    def get_status(self) -> Dict[str, Any]:
        """Return provider configuration and license metadata."""
        is_configured = bool(self.api_key and len(self.api_key.strip()) > 5)
        return {
            "provider": "OpenCelliD",
            "is_configured": is_configured,
            "api_key_set": is_configured,
            "license": "Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)",
            "license_url": "https://creativecommons.org/licenses/by-sa/4.0/",
            "citation": "OpenCelliD Project contributors, Unwired Labs",
            "cached_cells_count": len(self._cache.get("cells", {})),
            "usage_notes": "Estimated cell position triangulated from mobile user observations. Range represents estimated signal radius, not a physical surveyed antenna boundary.",
            "setup_instructions": (
                "To enable live OpenCelliD cell enrichment: register for a free API key at https://opencellid.org "
                "and set OPENCELLID_API_KEY=<token> in the backend environment."
                if not is_configured else "OpenCelliD integration active."
            )
        }

    def fetch_cell_by_id(
        self, mcc: int, mnc: int, lac: int, cell_id: int, radio: str = "LTE"
    ) -> Optional[Dict[str, Any]]:
        """
        Query OpenCelliD for a specific cell identifier.
        Respects local cache before making upstream calls.
        """
        cache_key = f"{radio}_{mcc}_{mnc}_{lac}_{cell_id}"
        cells_cache = self._cache.setdefault("cells", {})
        if cache_key in cells_cache:
            entry = cells_cache[cache_key]
            # 7-day cache TTL
            if time.time() - entry.get("cached_at", 0) < 604800:
                return entry.get("data")

        if not self.api_key:
            return None

        url = (
            f"{self.base_url}/cell/get?key={self.api_key}"
            f"&mcc={mcc}&mnc={mnc}&lac={lac}&cellid={cell_id}&radio={radio}&format=json"
        )

        try:
            req = urllib.request.Request(url, headers={"User-Agent": "SENPAY-Telecom/1.0"})
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode())
                if data.get("lat") and data.get("lon"):
                    record = {
                        "cell_id": str(cell_id),
                        "mcc": mcc,
                        "mnc": mnc,
                        "lac": lac,
                        "radio": radio,
                        "latitude": float(data["lat"]),
                        "longitude": float(data["lon"]),
                        "estimated_range_meters": float(data.get("range", 1000)),
                        "sample_count": int(data.get("samples", 1)),
                        "changeable": bool(data.get("changeable", 1)),
                        "provenance": {
                            "data_source": "OPENCELLID_API",
                            "data_mode": "HISTORICAL_PUBLIC_DATA",
                            "is_simulated": False,
                            "surveyed_physical_mast": False,
                            "license": "CC BY-SA 4.0"
                        }
                    }
                    cells_cache[cache_key] = {"cached_at": time.time(), "data": record}
                    self._save_cache()
                    return record
        except urllib.error.HTTPError as e:
            logger.warning(f"[OpenCelliD] Upstream error {e.code}: {e.read().decode()[:100]}")
        except Exception as e:
            logger.warning(f"[OpenCelliD] Query failed: {e}")

        return None


# Global OpenCelliD provider instance
opencellid_provider = OpenCellIdProvider()
