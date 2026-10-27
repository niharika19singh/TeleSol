"""
Unit Tests for SENPAY Network Digital Twin & Cellular Infrastructure
════════════════════════════════════════════════════════════════════
Tests:
- /api/digital-twin/sites contract, counts, and filters
- /api/digital-twin/sites/{site_id} inspection detail, history, and ML prediction
- /api/digital-twin/layers 9-layer catalog
- /api/digital-twin/topology graph structure and links
- /api/digital-twin/providers/opencellid status, licensing, and unconfigured safety
- Error handling on non-existent site IDs (HTTP 404)
"""

import unittest
from fastapi.testclient import TestClient
from app.main import app


class TestDigitalTwinAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_sites_catalog_and_provenance(self):
        """Verify GET /api/digital-twin/sites returns sites with counts and valid metadata."""
        resp = self.client.get("/api/digital-twin/sites")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("sites", data)
        self.assertIn("counts", data)
        self.assertGreater(data["counts"]["total"], 0)

        # Check first site structure
        first_site = data["sites"][0]
        self.assertIn("site_id", first_site)
        self.assertIn("latitude", first_site)
        self.assertIn("longitude", first_site)
        self.assertIn("technology", first_site)
        self.assertIn("provenance", first_site)
        self.assertIn("data_source", first_site["provenance"])
        self.assertIn("data_mode", first_site["provenance"])

    def test_02_filtering_by_source_and_tech(self):
        """Verify filtering by source (campus_sim vs ucc_5g) and technology (5G vs LTE)."""
        # Campus simulation filter
        r_campus = self.client.get("/api/digital-twin/sites?source=campus_sim")
        self.assertEqual(r_campus.status_code, 200)
        self.assertEqual(len(r_campus.json()["sites"]), 6)
        for s in r_campus.json()["sites"]:
            self.assertTrue(s["provenance"]["is_simulated"])

        # UCC 5G dataset filter
        r_ucc = self.client.get("/api/digital-twin/sites?source=ucc_5g")
        self.assertEqual(r_ucc.status_code, 200)
        self.assertGreater(len(r_ucc.json()["sites"]), 10)
        for s in r_ucc.json()["sites"]:
            self.assertFalse(s["provenance"]["is_simulated"])

        # Tech filter
        r_5g = self.client.get("/api/digital-twin/sites?tech=5G")
        self.assertEqual(r_5g.status_code, 200)
        for s in r_5g.json()["sites"]:
            self.assertIn("5G", s["technology"])

    def test_03_site_detail_and_ml_prediction(self):
        """Verify GET /api/digital-twin/sites/{site_id} includes live ML inference."""
        # Query campus zone-c
        resp = self.client.get("/api/digital-twin/sites/zone-c")
        self.assertEqual(resp.status_code, 200)
        site = resp.json()["site"]
        self.assertEqual(site["site_id"], "zone-c")
        self.assertIn("ml_prediction", site)
        self.assertIn("predicted_crs", site["ml_prediction"])
        self.assertIn("model_version", site["ml_prediction"])

    def test_04_site_not_found(self):
        """Verify 404 is returned when requesting non-existent site ID."""
        resp = self.client.get("/api/digital-twin/sites/non_existent_site_9999")
        self.assertEqual(resp.status_code, 404)
        self.assertIn("not found", resp.json()["detail"].lower())

    def test_05_layers_catalog_contract(self):
        """Verify GET /api/digital-twin/layers returns the 9 interactive layers."""
        resp = self.client.get("/api/digital-twin/layers")
        self.assertEqual(resp.status_code, 200)
        layers = resp.json()["layers"]
        self.assertEqual(len(layers), 9)
        layer_ids = [l["id"] for l in layers]
        expected_ids = [
            "sites", "cell_technology", "signal_quality", "congestion",
            "crowd_density", "active_incidents", "predicted_risk",
            "coverage_areas", "site_links"
        ]
        for eid in expected_ids:
            self.assertIn(eid, layer_ids)

    def test_06_topology_graph(self):
        """Verify GET /api/digital-twin/topology returns nodes and backhaul links."""
        resp = self.client.get("/api/digital-twin/topology?source=campus_sim")
        self.assertEqual(resp.status_code, 200)
        topo = resp.json()["topology"]
        self.assertIn("nodes", topo)
        self.assertIn("links", topo)
        self.assertEqual(len(topo["nodes"]), 6)
        self.assertGreater(len(topo["links"]), 5)

    def test_07_opencellid_provider_status(self):
        """Verify OpenCelliD provider reports clean metadata, license, and safe configuration."""
        resp = self.client.get("/api/digital-twin/providers/opencellid")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["provider"], "OpenCelliD")
        self.assertIn("CC BY-SA 4.0", data["license"])
        self.assertIn("setup_instructions", data)


if __name__ == "__main__":
    unittest.main()
