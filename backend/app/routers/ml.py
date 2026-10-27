"""
SENPAY Machine Learning & Telemetry Ingestion Router
════════════════════════════════════════════════════
Serves real-time inference, model evaluation metrics, and dataset provenance:
- POST /api/ml/predict: Live ML inference on telecom radio/throughput telemetry
- GET  /api/ml/model-info: Model architecture, validation metrics & feature importances
- GET  /api/ml/datasets: Public dataset catalog, provenance metadata & class distributions
- POST /api/ml/train: Retrain or calibrate model on ingested 5G dataset
"""

from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, Field

from app.ml.inference import predict_congestion_risk
from app.ml.train import get_model_metrics, train_and_evaluate_model
from app.ml.dataset_pipeline import get_dataset_metadata, run_ingestion_pipeline

router = APIRouter(prefix="/api/ml", tags=["Machine Learning & Intelligence"])


class TelemetryInferenceRequest(BaseModel):
    rsrp: Optional[float] = Field(-95.0, description="Reference Signal Received Power in dBm (typically -140 to -44)")
    rsrq: Optional[float] = Field(-12.5, description="Reference Signal Received Quality in dB (typically -20 to -3)")
    snr: Optional[float] = Field(5.0, description="Signal-to-Noise Ratio in dB (typically -20 to +30)")
    cqi: Optional[float] = Field(11.0, ge=1, le=15, description="Channel Quality Indicator (1 to 15)")
    rssi: Optional[float] = Field(-90.0, description="Received Signal Strength Indicator in dBm")
    dl_bitrate: Optional[float] = Field(25000.0, ge=0.0, description="Downlink Bitrate in kbps")
    ul_bitrate: Optional[float] = Field(120.0, ge=0.0, description="Uplink Bitrate in kbps")
    speed: Optional[float] = Field(0.0, ge=0.0, description="Mobility speed in km/h")
    hour: Optional[int] = Field(14, ge=0, le=23, description="Hour of the day (0-23)")
    zone_id: Optional[str] = Field("zone-metro-core", description="Identifier of the monitored network sector")


@router.post("/predict")
async def run_telemetry_inference(payload: TelemetryInferenceRequest):
    """
    Execute real ML model inference on incoming 5G telecom telemetry.
    Returns predicted continuous CRS (0-100), classification, probabilities, and risk drivers.
    """
    telemetry_dict = payload.model_dump()
    result = predict_congestion_risk(telemetry_dict)
    result["zone_id"] = payload.zone_id
    return result


@router.get("/model-info")
async def get_active_model_info():
    """
    Get full metadata and evaluation metrics for the active ML model:
    Accuracy, precision, recall, F1, confusion matrix, and feature importances.
    """
    metrics = get_model_metrics()
    return metrics


@router.get("/datasets")
async def get_datasets_catalog():
    """
    Get dataset catalog, provenance metadata, sample distributions, and licensing.
    """
    metadata = get_dataset_metadata()
    return {
        "active_dataset": metadata,
        "supported_sources": [
            {
                "name": "UCC 5G Production Dataset",
                "source": "University College Cork, Mobile & Internet Systems Lab",
                "type": "Real-world commercial 5G production network traces (G-NetTrack Pro)",
                "license": "GPL-3.0",
                "status": "INGESTED_AND_ACTIVE"
            },
            {
                "name": "Network Digital Twin Dataset (Zenodo 17255272)",
                "source": "Zenodo Open Access",
                "type": "Digital Twin generated telecom congestion network metrics",
                "license": "CC-BY-4.0",
                "status": "RESEARCH_BENCHMARK"
            },
            {
                "name": "Telecom Italia Mobile Traffic (Harvard Dataverse)",
                "source": "Harvard Dataverse / Telecom Italia Big Data Challenge",
                "type": "Historical urban mobile presence & call detail grid",
                "license": "Open Data Commons Open Database License (ODbL)",
                "status": "REFERENCE_ARCHIVE"
            }
        ]
    }


@router.post("/train")
async def trigger_model_training(background_tasks: BackgroundTasks):
    """
    Trigger reproducible model retraining on the 5G production dataset.
    """
    try:
        metrics = train_and_evaluate_model()
        return {
            "status": "success",
            "message": "Model training completed successfully.",
            "metrics": metrics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model training failed: {str(e)}")
