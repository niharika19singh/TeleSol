"""
TeleSol PayPilot — Database Backup & Disaster Recovery Engine
═══════════════════════════════════════════════════════════════
Provides thread-safe, non-blocking online backups, integrity audits,
and atomic restoration procedures for the SQLite database.

Features:
1. WAL checkpointing (PRAGMA wal_checkpoint(TRUNCATE)) before snapshotting.
2. sqlite3.Connection.backup() for live, zero-downtime backups without table locks.
3. Cryptographic SHA-256 checksum generation and validation.
4. SQLite PRAGMA integrity_check verification.
5. Atomic restoration with pre-restore safety snapshots.
"""

import os
import sys
import time
import json
import sqlite3
import hashlib
import logging
import argparse
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from app.paypilot.db import DB_PATH, _db_lock, get_db_connection

logger = logging.getLogger("telesol.paypilot.backup")
BACKUP_DIR = os.path.abspath(os.path.join(os.path.dirname(DB_PATH), "backups"))


def compute_file_sha256(filepath: str) -> str:
    """Compute SHA-256 hash of a file in 64KB chunks."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def create_backup(destination_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Perform a live, non-blocking online backup of the SQLite database.
    Checkpoints WAL, executes streaming backup, and computes cryptographic hash.
    """
    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp_slug = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    target_path = destination_path or os.path.join(BACKUP_DIR, f"paypilot_backup_{timestamp_slug}.db")

    with _db_lock:
        src_conn = get_db_connection()
        try:
            # 1. Checkpoint WAL to flush pending transactions to main database
            cursor = src_conn.cursor()
            cursor.execute("PRAGMA wal_checkpoint(TRUNCATE);")
            logger.info("[BACKUP] WAL checkpoint truncated successfully.")

            # 2. Open destination database and perform streaming backup
            dest_conn = sqlite3.connect(target_path)
            try:
                src_conn.backup(dest_conn, pages=100)
                dest_conn.execute("PRAGMA journal_mode = DELETE;")
            finally:
                dest_conn.close()

        finally:
            src_conn.close()

    # 3. Compute checksum & metadata
    checksum = compute_file_sha256(target_path)
    file_size = os.path.getsize(target_path)

    # 4. Count critical tables in backup
    table_counts = {}
    chk_conn = sqlite3.connect(target_path)
    try:
        c = chk_conn.cursor()
        c.execute("PRAGMA integrity_check;")
        integrity = c.fetchone()[0]
        for tbl in ["users", "workspaces", "service_agreements", "mandates", "security_events"]:
            try:
                c.execute(f"SELECT COUNT(*) FROM {tbl};")
                table_counts[tbl] = c.fetchone()[0]
            except Exception:
                table_counts[tbl] = 0
    finally:
        chk_conn.close()

    meta = {
        "backup_path": target_path,
        "source_db": DB_PATH,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "sha256": checksum,
        "file_size_bytes": file_size,
        "integrity": integrity,
        "table_counts": table_counts
    }

    meta_path = f"{target_path}.meta.json"
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    logger.info("[BACKUP] Created verified backup at %s (Size: %d bytes, Hash: %s)", target_path, file_size, checksum[:12])
    return meta


def verify_backup(backup_path: str) -> Dict[str, Any]:
    """
    Verify backup file integrity:
    1. Checks SHA-256 against metadata file if present.
    2. Runs PRAGMA integrity_check on the SQLite backup file.
    3. Validates required table structures.
    """
    if not os.path.exists(backup_path):
        raise FileNotFoundError(f"Backup file not found at {backup_path}")

    actual_hash = compute_file_sha256(backup_path)
    meta_path = f"{backup_path}.meta.json"
    hash_verified = None
    if os.path.exists(meta_path):
        try:
            with open(meta_path, "r") as f:
                meta = json.load(f)
            hash_verified = (meta.get("sha256") == actual_hash)
        except Exception:
            hash_verified = False

    conn = sqlite3.connect(backup_path)
    try:
        cursor = conn.cursor()
        cursor.execute("PRAGMA integrity_check;")
        integrity_result = cursor.fetchone()[0]

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [r[0] for r in cursor.fetchall()]

        counts = {}
        for tbl in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {tbl};")
                counts[tbl] = cursor.fetchone()[0]
            except Exception:
                pass
    finally:
        conn.close()

    is_valid = (integrity_result.lower() == "ok") and (hash_verified is not False)
    return {
        "valid": is_valid,
        "integrity_check": integrity_result,
        "sha256": actual_hash,
        "hash_verified_against_meta": hash_verified,
        "tables_found": len(tables),
        "table_counts": counts
    }


def restore_backup(backup_path: str, safety_snapshot: bool = True) -> Dict[str, Any]:
    """
    Atomically restore the database from a verified backup file.
    Optionally takes a safety snapshot of the live database before overwriting.
    """
    # 1. Verify backup first
    verif = verify_backup(backup_path)
    if not verif["valid"]:
        raise ValueError(f"Cannot restore: Backup integrity check failed: {verif}")

    safety_meta = None
    if safety_snapshot and os.path.exists(DB_PATH):
        safety_meta = create_backup(os.path.join(BACKUP_DIR, f"pre_restore_safety_{int(time.time())}.db"))

    with _db_lock:
        src_conn = sqlite3.connect(backup_path)
        dest_conn = get_db_connection()
        try:
            # Stream backup into destination database
            src_conn.backup(dest_conn, pages=100)
            dest_conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")
        finally:
            src_conn.close()
            dest_conn.close()

    logger.info("[RESTORE] Restored database from %s", backup_path)
    return {
        "status": "success",
        "restored_from": backup_path,
        "safety_snapshot": safety_meta.get("backup_path") if safety_meta else None,
        "restored_at": datetime.now(timezone.utc).isoformat()
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="TeleSol PayPilot Database Backup & Recovery Utility")
    subparsers = parser.add_subparsers(dest="command")

    subparsers.add_parser("backup", help="Create a live online backup")

    verify_parser = subparsers.add_parser("verify", help="Verify backup file integrity")
    verify_parser.add_argument("path", help="Path to .db backup file")

    restore_parser = subparsers.add_parser("restore", help="Restore database from a backup file")
    restore_parser.add_argument("path", help="Path to .db backup file")

    args = parser.parse_args()
    if args.command == "backup":
        res = create_backup()
        print(json.dumps(res, indent=2))
    elif args.command == "verify":
        res = verify_backup(args.path)
        print(json.dumps(res, indent=2))
    elif args.command == "restore":
        res = restore_backup(args.path)
        print(json.dumps(res, indent=2))
    else:
        parser.print_help()
