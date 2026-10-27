"""
SENPAY Network Digital Twin & Cellular Infrastructure Router
════════════════════════════════════════════════════════════
Serves real-world telecom site data, layer configurations, and topology models:
- GET  /api/digital-twin/sites: Filterable cellular sites with complete data provenance
- GET  /api/digital-twin/sites/{site_id}: In-depth site inspection, history, and ML prediction
- GET  /api/digital-twin/layers: Catalog of available map layers and data sources
- GET  /api/digital-twin/topology: Schematic network topology graph
- GET  /api/digital-twin/providers/opencellid: OpenCelliD provider status & license
- POST /api/digital-twin/ingest-ucc: Re-index or refresh UCC 5G dataset sites
"""

from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel, Field

from app.services.telecom_data_service import telecom_service
from app.services.opencellid_service import opencellid_provider

router = APIRouter(prefix="/api/digital-twin", tags=["Network Digital Twin"])


@router.get("/sites")
async def get_network_sites(
    source: str = Query("all", description="Data source filter: 'all', 'ucc_5g', 'campus_sim'"),
    tech: str = Query("all", description="Technology filter: 'all', '5G', 'LTE'"),
    risk: str = Query("all", description="Risk filter: 'all', 'safe', 'warning', 'critical'"),
    query: Optional[str] = Query(None, description="Search query across name, ID, or cell"),
):
    """
    Retrieve cellular network sites with transparent data provenance.
    Distinguishes historical public data (UCC 5G) from campus simulation.
    """
    sites = telecom_service.get_all_sites(
        source_filter=source,
        tech_filter=tech,
        risk_filter=risk,
        search_query=query,
    )

    counts = {
        "total": len(sites),
        "safe": len([s for s in sites if s["status"] == "safe"]),
        "warning": len([s for s in sites if s["status"] == "warning"]),
        "critical": len([s for s in sites if s["status"] == "critical"]),
        "tech_5g": len([s for s in sites if "5G" in s["technology"]]),
        "tech_lte": len([s for s in sites if "LTE" in s["technology"]]),
    }

    return {
        "status": "success",
        "counts": counts,
        "filters_applied": {
            "source": source,
            "technology": tech,
            "risk": risk,
            "query": query,
        },
        "sites": sites,
    }


@router.get("/sites/{site_id}")
async def get_site_detail(site_id: str):
    """
    Retrieve comprehensive site inspection data including RF metrics,
    observed QoS, past observations, and forward ML predictions.
    """
    detail = telecom_service.get_site_detail(site_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Network site '{site_id}' not found.")
    return {
        "status": "success",
        "site": detail,
    }


@router.get("/layers")
async def get_layer_catalog():
    """
    Retrieve metadata for all 9 interactive map layers, documenting
    their data source, availability, and representation.
    """
    return {
        "status": "success",
        "layers": [
            {
                "id": "sites",
                "label": "Network Sites",
                "category": "INFRASTRUCTURE",
                "description": "Physical masts and microcell antennas with site IDs and status indicators.",
                "is_available": True,
                "is_simulated": False,
                "data_source": "UCC_5G_DATASET & CAMPUS_REGISTRY",
                "default_visible": True,
            },
            {
                "id": "cell_technology",
                "label": "Cell Technology",
                "category": "INFRASTRUCTURE",
                "description": "5G NR vs 4G LTE radio technology classification.",
                "is_available": True,
                "is_simulated": False,
                "data_source": "UCC_5G_DATASET (NetworkMode)",
                "default_visible": False,
            },
            {
                "id": "signal_quality",
                "label": "Signal Quality",
                "category": "RADIO_LINK",
                "description": "Measured RSRP (dBm) and RSRQ (dB) radio link performance.",
                "is_available": True,
                "is_simulated": False,
                "data_source": "UCC_5G_DATASET (Empirical G-NetTrack)",
                "default_visible": False,
            },
            {
                "id": "congestion",
                "label": "Congestion Level",
                "category": "NETWORK_LOAD",
                "description": "Current Congestion Risk Score (CRS 0-100) based on throughput and radio quality.",
                "is_available": True,
                "is_simulated": False,
                "data_source": "3GPP-derived formula & Sentinel monitor",
                "default_visible": True,
            },
            {
                "id": "crowd_density",
                "label": "Crowd Density",
                "category": "SPATIAL_LOAD",
                "description": "People per square meter across monitored sectors (campus operational view).",
                "is_available": True,
                "is_simulated": True,
                "data_source": "Sentinel Spatial Sensors (Simulation)",
                "default_visible": True,
            },
            {
                "id": "active_incidents",
                "label": "Active Incidents",
                "category": "OPERATIONS",
                "description": "SLA breach alerts and high-congestion emergency triggers.",
                "is_available": True,
                "is_simulated": False,
                "data_source": "Sentinel Incident Engine",
                "default_visible": True,
            },
            {
                "id": "predicted_risk",
                "label": "Predicted Risk",
                "category": "MACHINE_LEARNING",
                "description": "Forward 15-minute congestion forecast from trained RF/GB models.",
                "is_available": True,
                "is_simulated": False,
                "data_source": "SENPAY-5G-CRS-v1.0-RF-GB Inference Engine",
                "default_visible": False,
            },
            {
                "id": "coverage_areas",
                "label": "Coverage Areas",
                "category": "RF_PROPAGATION",
                "description": "Optional cell radius hulls. Note: represents estimated radius, not physical ray-traced contours.",
                "is_available": True,
                "is_simulated": True,
                "data_source": "Estimated propagation range (350m 5G / 650m LTE)",
                "default_visible": False,
            },
            {
                "id": "site_links",
                "label": "Site-to-Site Links",
                "category": "BACKHAUL",
                "description": "Illustrative fiber backhaul and X2/Xn handover channels connecting sectors to core router.",
                "is_available": True,
                "is_simulated": True,
                "data_source": "Campus Network Topology Architecture",
                "default_visible": False,
            },
        ]
    }


@router.get("/topology")
async def get_network_topology(source: str = Query("campus_sim", description="'campus_sim' or 'ucc_5g'")):
    """
    Retrieve schematic network topology graph for the dedicated topology canvas.
    """
    graph = telecom_service.get_topology_graph(source=source)
    return {
        "status": "success",
        "topology": graph,
    }


@router.get("/providers/opencellid")
async def get_opencellid_status():
    """
    Retrieve OpenCelliD enrichment provider status, license terms, and instructions.
    """
    return opencellid_provider.get_status()


@router.post("/ingest-ucc")
async def trigger_ucc_reingestion():
    """
    Re-index UCC 5G dataset records into the active cache.
    """
    telecom_service._init_data()
    return {
        "status": "success",
        "message": "UCC 5G dataset re-indexed successfully.",
        "sites_indexed": len(telecom_service._ucc_sites_cache or []),
    }
