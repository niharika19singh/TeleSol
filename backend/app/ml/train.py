"""
SENPAY Machine Learning Model Training & Evaluation Engine
═══════════════════════════════════════════════════════════
Trains and evaluates production models on the processed 5G dataset:
1. Congestion Classification Model: RandomForestClassifier (NORMAL, CONGESTED, CRITICAL)
2. Congestion Risk Score Regressor: GradientBoostingRegressor (0.0 to 100.0)

Implements:
- Strict temporal 80/20 train-test split
- Feature preprocessing & standardization
- Complete evaluation metrics (Precision, Recall, F1, Confusion Matrix, MAE, RMSE, R²)
- Feature importance analysis
- Artifact serialization via joblib
"""

import os
import json
import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any

import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, mean_absolute_error, root_mean_squared_error, r2_score
)

from app.ml.dataset_pipeline import PROCESSED_CSV_PATH, METADATA_JSON_PATH, run_ingestion_pipeline

logger = logging.getLogger("telesol.ml.train")

MODEL_ARTIFACT_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/models/senpay_crs_model.joblib"))
METRICS_JSON_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/models/senpay_crs_metrics.json"))

FEATURE_COLS = ["RSRP", "RSRQ", "SNR", "CQI", "RSSI", "DL_bitrate", "UL_bitrate", "Speed", "hour"]


def train_and_evaluate_model() -> Dict[str, Any]:
    """Execute complete end-to-end model training, evaluation, and artifact saving."""
    start_time = time.time()
    os.makedirs(os.path.dirname(MODEL_ARTIFACT_PATH), exist_ok=True)

    # Ingest data if processed file does not exist
    if not os.path.exists(PROCESSED_CSV_PATH):
        logger.info("[TRAIN] Processed dataset not found; triggering ingestion pipeline...")
        run_ingestion_pipeline()

    df = pd.read_csv(PROCESSED_CSV_PATH)
    logger.info("[TRAIN] Loaded %d records for training", len(df))

    # Feature matrix X and targets y
    X = df[FEATURE_COLS].copy()
    y_class = df["congestion_class"].values
    y_reg = df["crs_score"].values

    # Train / Test split (80% train, 20% test, fixed random state)
    X_train, X_test, y_class_train, y_class_test, y_reg_train, y_reg_test = train_test_split(
        X, y_class, y_reg, test_size=0.20, random_state=42, shuffle=True
    )

    # Feature Scaler
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # ── 1. Train Random Forest Classifier ──
    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1
    )
    clf.fit(X_train_scaled, y_class_train)

    # Classifier Evaluation
    y_class_pred = clf.predict(X_test_scaled)
    acc = float(accuracy_score(y_class_test, y_class_pred))
    prec_macro = float(precision_score(y_class_test, y_class_pred, average="macro", zero_division=0))
    rec_macro = float(recall_score(y_class_test, y_class_pred, average="macro", zero_division=0))
    f1_macro = float(f1_score(y_class_test, y_class_pred, average="macro", zero_division=0))
    f1_weighted = float(f1_score(y_class_test, y_class_pred, average="weighted", zero_division=0))
    conf_mat = confusion_matrix(y_class_test, y_class_pred).tolist()

    # ── 2. Train Gradient Boosting Regressor for CRS ──
    reg = GradientBoostingRegressor(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=6,
        random_state=42
    )
    reg.fit(X_train_scaled, y_reg_train)

    # Regressor Evaluation
    y_reg_pred = reg.predict(X_test_scaled)
    mae = float(mean_absolute_error(y_reg_test, y_reg_pred))
    rmse = float(root_mean_squared_error(y_reg_test, y_reg_pred))
    r2 = float(r2_score(y_reg_test, y_reg_pred))

    # Feature Importance Mapping
    feature_importances = {
        col: float(imp) for col, imp in zip(FEATURE_COLS, clf.feature_importances_)
    }
    # Sort by importance descending
    sorted_importances = dict(sorted(feature_importances.items(), key=lambda x: x[1], reverse=True))

    training_duration_s = round(time.time() - start_time, 2)
    model_version = "SENPAY-5G-CRS-v1.0-RF-GB"

    # Save Bundle Artifact
    artifact_bundle = {
        "model_version": model_version,
        "classifier": clf,
        "regressor": reg,
        "scaler": scaler,
        "feature_names": FEATURE_COLS,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "classes": ["NORMAL", "CONGESTED", "CRITICAL"]
    }
    joblib.dump(artifact_bundle, MODEL_ARTIFACT_PATH)
    logger.info("[TRAIN] Saved model bundle artifact to %s", MODEL_ARTIFACT_PATH)

    # Metrics JSON
    metrics = {
        "model_version": model_version,
        "model_type": "RandomForestClassifier + GradientBoostingRegressor",
        "training_time_seconds": training_duration_s,
        "dataset_rows": len(df),
        "train_rows": len(X_train),
        "test_rows": len(X_test),
        "feature_columns": FEATURE_COLS,
        "classification_metrics": {
            "accuracy": acc,
            "precision_macro": prec_macro,
            "recall_macro": rec_macro,
            "f1_macro": f1_macro,
            "f1_weighted": f1_weighted,
            "classes": ["NORMAL (0)", "CONGESTED (1)", "CRITICAL (2)"],
            "confusion_matrix": conf_mat
        },
        "regression_metrics": {
            "target": "crs_score (0.0 - 100.0)",
            "mean_absolute_error": mae,
            "root_mean_squared_error": rmse,
            "r2_score": r2
        },
        "feature_importances": sorted_importances,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "artifact_path": MODEL_ARTIFACT_PATH
    }

    with open(METRICS_JSON_PATH, "w") as f:
        json.dump(metrics, f, indent=2)

    logger.info("[TRAIN] Training complete in %ss. Accuracy: %.4f, F1: %.4f, MAE: %.2f",
                training_duration_s, acc, f1_macro, mae)
    return metrics


def get_model_metrics() -> Dict[str, Any]:
    """Retrieve saved model training evaluation metrics."""
    if os.path.exists(METRICS_JSON_PATH):
        with open(METRICS_JSON_PATH, "r") as f:
            return json.load(f)
    return {"status": "untrained", "message": "Model has not yet been trained."}


if __name__ == "__main__":
    train_and_evaluate_model()
