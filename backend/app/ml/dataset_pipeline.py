"""
SENPAY Machine Learning Data Ingestion & Transformation Pipeline
═════════════════════════════════════════════════════════════════
Ingests real-world 5G production telecom telemetry from the UCC 5G dataset:
- Source: University College Cork, Mobile & Internet Systems Laboratory (MISL)
- License: GNU General Public License v3.0 (GPL-3.0)
- Characteristics: Multi-scenario 5G client-side KPIs (channel, context, cell, throughput)
- Features: RSRP, RSRQ, SNR, CQI, RSSI, DL_bitrate, UL_bitrate, Speed, CellID, Latency
- Processing: Validation, imputation, outlier handling, feature derivation, and labeling.
"""

import os
import zipfile
import json
import logging
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from typing import Dict, Any, Tuple

logger = logging.getLogger("telesol.ml.pipeline")

RAW_ZIP_CANDIDATE = "/tmp/5gdataset/5G-production-dataset.zip"
PROCESSED_CSV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/datasets/ucc_5g_processed.csv"))
METADATA_JSON_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/datasets/ucc_5g_metadata.json"))


def derive_congestion_target(df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
    """
    Derive 3GPP-aligned telecom congestion labels and continuous Congestion Risk Score (CRS 0-100):
    - CRITICAL (2): RSRQ < -15 dB AND SNR < 0 dB, OR extreme packet loss / throughput collapse
    - CONGESTED (1): RSRQ between -12 and -15 dB, OR SNR between 0 and 5 dB, OR CQI < 8
    - NORMAL (0): Healthy radio link (RSRQ >= -12 dB, SNR >= 5 dB, CQI >= 8, high DL bitrate)
    """
    rsrq = df["RSRQ"].fillna(-13.0)
    snr = df["SNR"].fillna(3.0)
    cqi = df["CQI"].fillna(10.0)
    dl_mbps = (df["DL_bitrate"].fillna(10000.0) / 1000.0)  # convert kbps to Mbps

    # Continuous Congestion Risk Score (CRS: 0.0 to 100.0)
    # Higher CRS indicates higher congestion / degradation
    # Component 1: RSRQ penalty (RSRQ ranges from -20 to -3 dB)
    rsrq_norm = np.clip((-rsrq - 3.0) / 17.0, 0.0, 1.0) * 35.0  # up to 35 pts

    # Component 2: SNR penalty (SNR ranges from -20 to 30 dB)
    snr_norm = np.clip((15.0 - snr) / 25.0, 0.0, 1.0) * 35.0   # up to 35 pts

    # Component 3: CQI penalty (CQI ranges from 1 to 15)
    cqi_norm = np.clip((15.0 - cqi) / 14.0, 0.0, 1.0) * 15.0   # up to 15 pts

    # Component 4: Throughput choking penalty (when below 5 Mbps in active mode)
    throughput_penalty = np.where(dl_mbps < 5.0, np.clip((5.0 - dl_mbps) / 5.0, 0.0, 1.0) * 15.0, 0.0)

    crs_score = np.clip(rsrq_norm + snr_norm + cqi_norm + throughput_penalty, 0.0, 100.0)
    crs_score = np.round(crs_score, 1)

    # Multi-class Congestion Category: 0: NORMAL, 1: CONGESTED, 2: CRITICAL
    congestion_class = np.zeros(len(df), dtype=int)
    congestion_class[(crs_score >= 38.0) & (crs_score < 68.0)] = 1
    congestion_class[crs_score >= 68.0] = 2

    return pd.Series(congestion_class, name="congestion_class"), pd.Series(crs_score, name="crs_score")


def run_ingestion_pipeline(max_files: int = 40) -> Dict[str, Any]:
    """
    Execute repeatable data ingestion, validation, and transformation.
    Outputs model-ready features and provenance records.
    """
    os.makedirs(os.path.dirname(PROCESSED_CSV_PATH), exist_ok=True)

    if not os.path.exists(RAW_ZIP_CANDIDATE):
        raise FileNotFoundError(f"Raw source archive not found at {RAW_ZIP_CANDIDATE}. Run clone/download step first.")

    raw_rows_count = 0
    accepted_rows_count = 0
    rejected_rows_count = 0
    dfs = []

    logger.info("[PIPELINE] Reading raw 5G production dataset from %s", RAW_ZIP_CANDIDATE)
    with zipfile.ZipFile(RAW_ZIP_CANDIDATE) as z:
        csv_names = [n for n in z.namelist() if n.endswith(".csv") and not "__MACOSX" in n]
        selected_csvs = csv_names[:max_files]

        for name in selected_csvs:
            with z.open(name) as f:
                try:
                    df = pd.read_csv(f)
                    raw_rows_count += len(df)
                    
                    # Validate minimum required columns
                    req_cols = ["Timestamp", "RSRP", "DL_bitrate", "CellID"]
                    if not all(c in df.columns for c in req_cols):
                        rejected_rows_count += len(df)
                        continue

                    df["source_file"] = name.split("/")[-1]
                    df["mobility_scenario"] = "Car" if "/Car/" in name else "Static"
                    df["traffic_service"] = "Streaming" if "/Streaming/" in name else "Download"
                    dfs.append(df)
                except Exception as e:
                    logger.warning("[PIPELINE] Skipping unparseable file %s: %s", name, str(e))

    if not dfs:
        raise ValueError("No valid CSV files could be parsed from the 5G dataset archive.")

    combined = pd.concat(dfs, ignore_index=True)
    logger.info("[PIPELINE] Combined %d rows across %d files", len(combined), len(dfs))

    # Clean numeric fields with median/boundary imputation
    numeric_cols = ["RSRP", "RSRQ", "SNR", "CQI", "RSSI", "DL_bitrate", "UL_bitrate", "Speed"]
    for col in numeric_cols:
        if col in combined.columns:
            combined[col] = pd.to_numeric(combined[col], errors="coerce")

    # Missing value handling (median imputation for valid physics ranges)
    combined["RSRP"] = combined["RSRP"].fillna(-95.0)
    combined["RSRQ"] = combined["RSRQ"].fillna(-13.0)
    combined["SNR"] = combined["SNR"].fillna(3.0)
    combined["CQI"] = combined["CQI"].fillna(11.0)
    combined["RSSI"] = combined["RSSI"].fillna(-90.0)
    combined["DL_bitrate"] = combined["DL_bitrate"].fillna(0.0)
    combined["UL_bitrate"] = combined["UL_bitrate"].fillna(0.0)
    combined["Speed"] = combined["Speed"].fillna(0.0)

    # Derive targets
    cong_class, crs_score = derive_congestion_target(combined)
    combined["congestion_class"] = cong_class
    combined["crs_score"] = crs_score

    # Add temporal features
    combined["hour"] = 14  # Default baseline hour from traces
    try:
        combined["hour"] = pd.to_datetime(combined["Timestamp"].str.split("_").str[1], format="%H.%M.%S", errors="coerce").dt.hour.fillna(14).astype(int)
    except Exception:
        pass

    # Drop duplicate records
    pre_dedup = len(combined)
    combined = combined.drop_duplicates(subset=["Timestamp", "CellID", "DL_bitrate", "RSRP"])
    duplicates_removed = pre_dedup - len(combined)
    accepted_rows_count = len(combined)

    # Save processed dataset
    combined.to_csv(PROCESSED_CSV_PATH, index=False)
    logger.info("[PIPELINE] Saved %d processed records to %s", len(combined), PROCESSED_CSV_PATH)

    # Generate metadata record
    metadata = {
        "dataset_name": "UCC 5G Production Trace Dataset",
        "official_source": "University College Cork (UCC), Mobile & Internet Systems Laboratory (MISL)",
        "source_url": "https://github.com/uccmisl/5Gdataset",
        "license": "GNU General Public License v3.0 (GPL-3.0)",
        "provenance": "Client-side cellular KPIs collected from a major commercial 5G production network via G-NetTrack Pro",
        "raw_rows_processed": raw_rows_count,
        "accepted_rows": accepted_rows_count,
        "rejected_rows": rejected_rows_count,
        "duplicates_removed": duplicates_removed,
        "feature_columns": [
            "RSRP", "RSRQ", "SNR", "CQI", "RSSI", "DL_bitrate", "UL_bitrate", "Speed", "hour", "mobility_scenario", "traffic_service"
        ],
        "target_columns": ["congestion_class", "crs_score"],
        "class_distribution": {
            "NORMAL (0)": int((combined["congestion_class"] == 0).sum()),
            "CONGESTED (1)": int((combined["congestion_class"] == 1).sum()),
            "CRITICAL (2)": int((combined["congestion_class"] == 2).sum()),
        },
        "crs_stats": {
            "mean": float(combined["crs_score"].mean()),
            "median": float(combined["crs_score"].median()),
            "std": float(combined["crs_score"].std()),
            "min": float(combined["crs_score"].min()),
            "max": float(combined["crs_score"].max()),
        },
        "processed_at": datetime.now(timezone.utc).isoformat(),
        "storage_path": PROCESSED_CSV_PATH
    }

    with open(METADATA_JSON_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    return metadata


def get_dataset_metadata() -> Dict[str, Any]:
    """Retrieve metadata for the ingested dataset."""
    if os.path.exists(METADATA_JSON_PATH):
        with open(METADATA_JSON_PATH, "r") as f:
            return json.load(f)
    return {"status": "unprocessed", "message": "Dataset pipeline has not yet executed."}
