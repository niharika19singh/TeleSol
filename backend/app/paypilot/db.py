"""
TeleSol PayPilot — SQLite Database Persistence Layer (v2.0)
═════════════════════════════════════════════════════════════
Provides persistent storage, relational tables, migrations,
and thread-safe WAL transactions for TeleSol PayPilot:
- Agents (Buyer, Provider, Payment)
- Service Providers & Catalog
- Discovery Records (TinyFish & Local Registry)
- Service Agreements & Cryptographic Agreement Hashes (Phase 2)
- Delegated Agent Budgets & Permission Boundaries (Phase 4)
- Payment Requests & Mandates (HSP Cart Mandate aligned)
- Spending Policies & Policy Decisions
- Payment Safety Simulations (Phase 3)
- Gateway Executions (HSP v2.3.0)
- HSK Chain Verifications
- Settlement Receipts (Real vs Demo explicit attribution)
- Verifiable Task-to-Settlement Evidence Bundles (Phase 6)
- Payment Incidents & Dispute Recovery (Phase 7)
- TeleSol Sentinel Incident Bindings (Phase 8)
- Tamper-Evident Hash-Chained Audit Logs
"""

import os
import json
import sqlite3
import hashlib
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
import threading
from contextlib import contextmanager

from app.paypilot.canonical import canonical_json, hash_canonical_json

logger = logging.getLogger("telesol.paypilot.db")

DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data"))


def get_db_path() -> str:
    """Resolve active database path dynamically from environment configuration."""
    return os.getenv("PAYPILOT_DB_PATH", os.getenv("DATABASE_PATH", os.path.join(DB_DIR, "paypilot.db")))


DB_PATH = get_db_path()

_db_lock = threading.RLock()


def validate_db_target(target_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Validate that the database path is accessible, writable, and not silently recreated
    when persistent storage is strictly required.

    Enforces:
    - Target directory exists or is creatable.
    - Directory has write permissions.
    - If REQUIRE_EXISTING_DB or STRICT_PERSISTENCE is set, halts startup if file is missing.
    """
    path = target_path or get_db_path()
    parent_dir = os.path.dirname(os.path.abspath(path))
    require_existing = os.getenv("REQUIRE_EXISTING_DB", "").lower() in ("true", "1", "yes") or \
                       os.getenv("STRICT_PERSISTENCE", "").lower() in ("true", "1", "yes")

    if not os.path.exists(parent_dir):
        if require_existing:
            raise FileNotFoundError(
                f"[DB] Required persistent directory '{parent_dir}' does not exist. "
                f"Halting startup to prevent unmounted or ephemeral database creation."
            )
        try:
            os.makedirs(parent_dir, exist_ok=True)
        except Exception as e:
            raise PermissionError(f"[DB] Cannot create database directory '{parent_dir}': {str(e)}")

    if not os.access(parent_dir, os.W_OK):
        raise PermissionError(f"[DB] Target database directory '{parent_dir}' is not writable.")

    file_exists = os.path.isfile(path)
    if require_existing and not file_exists:
        raise FileNotFoundError(
            f"[DB] Persistent database required at '{path}', but file does not exist. "
            f"Halting startup to prevent accidental empty database creation."
        )

    return {
        "path": path,
        "parent_dir": parent_dir,
        "exists": file_exists,
        "writable": os.access(parent_dir, os.W_OK),
        "strict_persistence": require_existing
    }


def get_db_connection(target_path: Optional[str] = None) -> sqlite3.Connection:
    """Create and configure a thread-safe connection to the SQLite database."""
    path = target_path or get_db_path()
    validate_db_target(path)
    conn = sqlite3.connect(path, timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA busy_timeout = 30000;")
    conn.execute("PRAGMA foreign_keys = OFF;")  # Managed logically with atomic sessions
    return conn


@contextmanager
def db_session():
    """Thread-safe context manager for SQLite database transactions."""
    with _db_lock:
        conn = get_db_connection()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()


def _add_column_if_missing(cursor: sqlite3.Cursor, table: str, column_def: str):
    """Safely add a column to an existing table if it does not already exist."""
    col_name = column_def.split()[0]
    try:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column_def};")
    except sqlite3.OperationalError as e:
        if "duplicate column name" not in str(e).lower():
            raise


def init_db():
    """Create all required tables, constraints, migrations, and indexes."""
    with _db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 0. User Accounts Table (Authentication & Access Control)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'NOC_OPERATOR',
            is_active INTEGER NOT NULL DEFAULT 1,
            email_verified INTEGER NOT NULL DEFAULT 0,
            email_verified_at TEXT,
            workspace_id TEXT,
            org_name TEXT,
            created_at TEXT NOT NULL,
            last_login_at TEXT
        );
        """)

        # 0b. Workspaces / Organizations Table (Multi-Tenancy Isolation)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS workspaces (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            owner_id TEXT NOT NULL,
            description TEXT,
            settings TEXT DEFAULT '{}',
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        # 0c. Workspace Memberships Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS workspace_memberships (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'NOC_OPERATOR',
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(workspace_id, user_id)
        );
        """)

        # 0d. Cryptographic Single-Use Verification Tokens (Email & Password Reset)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS verification_tokens (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            token_type TEXT NOT NULL, -- 'EMAIL_VERIFICATION', 'PASSWORD_RESET'
            expires_at TEXT NOT NULL,
            used_at TEXT,
            created_at TEXT NOT NULL
        );
        """)

        # 0d2. Revoked Session Tokens Blacklist (Immediate Invalidation on Logout)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS revoked_tokens (
            token_hash TEXT PRIMARY KEY,
            user_id TEXT,
            revoked_at TEXT NOT NULL,
            expires_at INTEGER NOT NULL
        );
        """)

        # 0e. Tamper-Evident Security Events & Audit Trail
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS security_events (
            id TEXT PRIMARY KEY,
            event_type TEXT NOT NULL,
            actor_id TEXT,
            actor_email TEXT,
            target_resource TEXT,
            action TEXT NOT NULL,
            outcome TEXT NOT NULL,
            ip_address TEXT,
            details TEXT,
            timestamp TEXT NOT NULL,
            prev_hash TEXT,
            hash TEXT NOT NULL
        );
        """)

        # 1. Agents Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            role TEXT NOT NULL, -- 'BUYER', 'PROVIDER', 'PAYMENT'
            description TEXT,
            capabilities TEXT, -- JSON array of capability tags
            status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'INACTIVE', 'SUSPENDED'
            wallet_address TEXT,
            spending_limit REAL DEFAULT 100.0,
            daily_limit REAL DEFAULT 500.0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        # 2. Providers Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS providers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL, -- 'TELECOM_BANDWIDTH', 'SENSOR_DATA', 'EDGE_COMPUTE', 'ROUTING_AI'
            description TEXT,
            service_url TEXT,
            pricing_model TEXT NOT NULL, -- 'PER_GB', 'PER_CALL', 'PER_HOUR', 'FIXED'
            asset TEXT NOT NULL DEFAULT 'HSK', -- 'HSK', 'USDT', 'USDC'
            unit_price REAL NOT NULL,
            payment_address TEXT NOT NULL,
            network_id INTEGER NOT NULL DEFAULT 133, -- 133 = HSK Testnet, 177 = HSK Mainnet
            verified INTEGER NOT NULL DEFAULT 1,
            source_type TEXT NOT NULL DEFAULT 'REGISTRY', -- 'REGISTRY', 'TINYFISH_DISCOVERED', 'SEED'
            source_url TEXT,
            discovered_at TEXT,
            created_at TEXT NOT NULL
        );
        """)

        # 3. Discovery Records Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS discovery_records (
            id TEXT PRIMARY KEY,
            query TEXT NOT NULL,
            source TEXT NOT NULL, -- 'TINYFISH', 'DIRECT', 'SEEDED'
            results_count INTEGER NOT NULL,
            raw_results TEXT, -- JSON
            untrusted_content_filtered INTEGER DEFAULT 1,
            created_at TEXT NOT NULL
        );
        """)

        # 4. Service Agreements Table (Phase 2: Service-to-Payment Binding)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS service_agreements (
            id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL,
            requesting_agent_id TEXT NOT NULL,
            provider_id TEXT NOT NULL,
            provider_address TEXT NOT NULL,
            service_category TEXT NOT NULL,
            service_description TEXT NOT NULL,
            agreed_price REAL NOT NULL,
            asset TEXT NOT NULL DEFAULT 'HSK',
            max_authorized_amount REAL NOT NULL,
            expected_deliverables TEXT NOT NULL,
            expected_completion_time TEXT NOT NULL,
            network_id INTEGER NOT NULL DEFAULT 133,
            evidence_required TEXT NOT NULL,
            canonical_terms TEXT NOT NULL, -- RFC 8785 canonical JSON
            agreement_hash TEXT NOT NULL, -- SHA-256 of canonical terms
            status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'ACCEPTED', 'MANDATED', 'FULFILLED', 'DISPUTED', 'CANCELLED'
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        # 5. Agent Delegations Table (Phase 4: Delegated Budgets & Permissions)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS agent_delegations (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            delegator_address TEXT NOT NULL,
            service_categories TEXT NOT NULL DEFAULT '[]', -- JSON array
            max_amount_per_tx REAL NOT NULL DEFAULT 25.0,
            max_cumulative_spend REAL NOT NULL DEFAULT 100.0,
            current_spent REAL NOT NULL DEFAULT 0.0,
            reserved_amount REAL NOT NULL DEFAULT 0.0,
            allowed_recipients TEXT NOT NULL DEFAULT '[]', -- JSON array of addresses
            allowed_assets TEXT NOT NULL DEFAULT '["HSK","USDT","USDC"]', -- JSON array
            allowed_networks TEXT NOT NULL DEFAULT '[133,177]', -- JSON array
            valid_from TEXT NOT NULL,
            valid_until TEXT NOT NULL,
            require_manual_review_for_new_providers INTEGER NOT NULL DEFAULT 1,
            require_completion_evidence INTEGER NOT NULL DEFAULT 1,
            status TEXT NOT NULL DEFAULT 'ENABLED', -- 'ENABLED', 'SUSPENDED', 'REVOKED'
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        # 6. Policies Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS policies (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            max_amount_per_tx REAL NOT NULL DEFAULT 50.0,
            max_daily_budget REAL NOT NULL DEFAULT 200.0,
            allowed_assets TEXT NOT NULL DEFAULT '["HSK","USDT","USDC"]',
            allowed_networks TEXT NOT NULL DEFAULT '[133,177]',
            allowed_recipients TEXT DEFAULT '[]',
            require_manual_approval INTEGER DEFAULT 1,
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        # 7. Payment Requests Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS payment_requests (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            buyer_agent_id TEXT NOT NULL,
            provider_id TEXT,
            recipient_address TEXT NOT NULL,
            asset TEXT NOT NULL,
            amount REAL NOT NULL,
            network_id INTEGER NOT NULL,
            purpose TEXT NOT NULL,
            reference_metadata TEXT,
            expiry_timestamp TEXT NOT NULL,
            policy_id TEXT,
            agreement_id TEXT,
            agreement_hash TEXT,
            delegation_id TEXT,
            status TEXT NOT NULL DEFAULT 'DRAFT',
            is_demo INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        # 8. Payment Mandates Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS mandates (
            id TEXT PRIMARY KEY,
            mandate_id TEXT UNIQUE NOT NULL,
            request_id TEXT NOT NULL,
            payer_id TEXT NOT NULL,
            payee_id TEXT NOT NULL,
            recipient_address TEXT NOT NULL,
            amount REAL NOT NULL,
            asset TEXT NOT NULL,
            network_id INTEGER NOT NULL,
            purpose TEXT NOT NULL,
            spending_limit REAL NOT NULL,
            expiry_timestamp TEXT NOT NULL,
            agreement_id TEXT,
            agreement_hash TEXT,
            delegation_id TEXT,
            authorization_status TEXT NOT NULL DEFAULT 'PENDING_POLICY',
            execution_status TEXT NOT NULL DEFAULT 'PENDING',
            verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
            wallet_signature TEXT,
            signer_address TEXT,
            gateway_order_id TEXT,
            tx_hash TEXT,
            is_demo INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            authorized_at TEXT,
            settled_at TEXT
        );
        """)

        # 9. Policy Decisions Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS policy_decisions (
            id TEXT PRIMARY KEY,
            mandate_id TEXT NOT NULL,
            policy_id TEXT NOT NULL,
            decision TEXT NOT NULL,
            rules_evaluated TEXT NOT NULL,
            reason TEXT NOT NULL,
            evaluated_at TEXT NOT NULL
        );
        """)

        # 10. Gateway Executions Table (HSP)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS gateway_executions (
            id TEXT PRIMARY KEY,
            mandate_id TEXT NOT NULL,
            gateway_type TEXT NOT NULL,
            gateway_order_id TEXT NOT NULL,
            status TEXT NOT NULL,
            request_payload_redacted TEXT,
            response_payload_redacted TEXT,
            error_code TEXT,
            error_message TEXT,
            executed_at TEXT NOT NULL
        );
        """)

        # 11. Settlement Receipts Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS settlement_receipts (
            id TEXT PRIMARY KEY,
            receipt_id TEXT UNIQUE NOT NULL,
            mandate_id TEXT NOT NULL,
            request_id TEXT NOT NULL,
            transaction_hash TEXT,
            block_number INTEGER,
            network_id INTEGER NOT NULL,
            network_name TEXT NOT NULL,
            chain_id INTEGER NOT NULL,
            payer_address TEXT NOT NULL,
            payee_address TEXT NOT NULL,
            asset TEXT NOT NULL,
            amount REAL NOT NULL,
            gateway_status TEXT NOT NULL,
            chain_verification_status TEXT NOT NULL,
            source_attribution TEXT NOT NULL,
            is_demo INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        );
        """)

        # 12. Evidence Bundles Table (Phase 6: Verifiable Task-to-Settlement Evidence)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS evidence_bundles (
            id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL,
            agreement_id TEXT NOT NULL,
            agreement_hash TEXT NOT NULL,
            request_id TEXT NOT NULL,
            mandate_id TEXT NOT NULL,
            delegation_id TEXT,
            policy_decision_id TEXT,
            wallet_signer TEXT NOT NULL,
            wallet_signature TEXT NOT NULL,
            hsp_order_id TEXT,
            hsp_status TEXT,
            transaction_hash TEXT,
            chain_id INTEGER NOT NULL,
            block_number INTEGER,
            chain_status TEXT NOT NULL,
            completion_evidence TEXT, -- JSON evidence payload
            canonical_bundle TEXT NOT NULL, -- RFC 8785 canonical JSON
            bundle_hash TEXT NOT NULL, -- SHA-256 of canonical bundle
            verification_report TEXT NOT NULL, -- JSON
            status TEXT NOT NULL DEFAULT 'UNVERIFIED', -- 'VERIFIED', 'INCOMPLETE', 'TAMPERED', 'UNVERIFIED'
            created_at TEXT NOT NULL
        );
        """)

        # 13. Payment Incidents & Disputes Table (Phase 7: Dispute & Failure Management)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS payment_incidents (
            id TEXT PRIMARY KEY,
            incident_type TEXT NOT NULL,
            task_id TEXT,
            mandate_id TEXT,
            request_id TEXT,
            detection_reason TEXT NOT NULL,
            severity TEXT NOT NULL DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
            evidence TEXT NOT NULL DEFAULT '{}', -- JSON
            timeline TEXT NOT NULL DEFAULT '[]', -- JSON array of timestamped actions
            status TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'UNDER_INVESTIGATION', 'RESOLVED', 'CLOSED'
            recommended_action TEXT,
            resolution_notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        # 14. TeleSol Sentinel Incidents Table (Phase 8: Sentinel-to-PayPilot Bridge)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS sentinel_incidents (
            id TEXT PRIMARY KEY,
            zone_id TEXT NOT NULL,
            zone_name TEXT NOT NULL,
            crs_score REAL NOT NULL,
            scenario TEXT NOT NULL,
            recommended_category TEXT NOT NULL,
            agreement_id TEXT,
            mandate_id TEXT,
            settlement_status TEXT NOT NULL DEFAULT 'UNSETTLED',
            created_at TEXT NOT NULL
        );
        """)

        # 15. Audit Logs Table (Tamper-evident with SHA-256 hash chaining)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            actor TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            action TEXT NOT NULL,
            details TEXT NOT NULL,
            previous_hash TEXT NOT NULL,
            current_hash TEXT NOT NULL,
            timestamp TEXT NOT NULL
        );
        """)

        # 16. Intervention Evaluations Table (Feature A & E: Digital Twin & Optimizer)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS intervention_evaluations (
            id TEXT PRIMARY KEY,
            incident_id TEXT NOT NULL,
            zone_id TEXT NOT NULL,
            zone_name TEXT NOT NULL,
            baseline_metrics TEXT NOT NULL, -- JSON
            data_provenance TEXT NOT NULL, -- JSON: real vs simulated vs assumed
            candidates TEXT NOT NULL, -- JSON array
            selected_candidate TEXT NOT NULL, -- JSON
            selection_rationale TEXT NOT NULL,
            confidence_score REAL NOT NULL,
            confidence_level TEXT NOT NULL, -- 'HIGH', 'MEDIUM', 'LOW'
            created_at TEXT NOT NULL
        );
        """)

        # 17. Counterfactual Mitigation Evaluations Table (Feature B: Counterfactual Evaluator)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS counterfactual_evaluations (
            id TEXT PRIMARY KEY,
            agreement_id TEXT NOT NULL,
            mandate_id TEXT,
            zone_id TEXT NOT NULL,
            intervention_id TEXT,
            pre_metrics TEXT NOT NULL, -- JSON
            post_metrics TEXT NOT NULL, -- JSON
            baseline_type TEXT NOT NULL, -- 'CONTROL_ZONE', 'HISTORICAL_TREND', 'FALLBACK_HEURISTIC'
            baseline_metrics TEXT NOT NULL, -- JSON
            observed_improvement REAL NOT NULL,
            expected_improvement REAL NOT NULL,
            attributable_improvement REAL NOT NULL,
            outcome_classification TEXT NOT NULL, -- 'SUCCESSFUL', 'PARTIALLY_SUCCESSFUL', 'FAILED', 'INCONCLUSIVE'
            confidence_score REAL NOT NULL,
            confidence_level TEXT NOT NULL,
            evidence_summary TEXT NOT NULL,
            limitations_notes TEXT NOT NULL,
            evaluated_at TEXT NOT NULL
        );
        """)

        # 18. Self-Healing Recovery Actions Table (Feature D: Bounded Recovery Engine)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS recovery_actions (
            id TEXT PRIMARY KEY,
            incident_id TEXT NOT NULL,
            failed_agreement_id TEXT NOT NULL,
            evaluation_id TEXT NOT NULL,
            diagnosis TEXT NOT NULL,
            attempt_number INTEGER NOT NULL DEFAULT 1,
            max_attempts INTEGER NOT NULL DEFAULT 2,
            action_type TEXT NOT NULL, -- 'RECOMMEND_ALTERNATIVE_PROVIDER', 'SWITCH_SERVICE_STRATEGY', 'GATHER_TELEMETRY_ONLY', 'HALT_EXCEEDED_ATTEMPTS'
            recommended_provider_id TEXT,
            recommended_service_category TEXT,
            budget_check_passed INTEGER NOT NULL DEFAULT 1,
            delegation_check_passed INTEGER NOT NULL DEFAULT 1,
            requires_authorization INTEGER NOT NULL DEFAULT 1,
            justification TEXT NOT NULL,
            new_mandate_id TEXT,
            status TEXT NOT NULL DEFAULT 'PROPOSED', -- 'PROPOSED', 'APPROVED', 'REJECTED', 'EXECUTED'
            created_at TEXT NOT NULL
        );
        """)

        # Safe Column Migrations for tables that may have been created earlier
        _add_column_if_missing(cursor, "payment_requests", "agreement_id TEXT")
        _add_column_if_missing(cursor, "payment_requests", "agreement_hash TEXT")
        _add_column_if_missing(cursor, "payment_requests", "delegation_id TEXT")
        _add_column_if_missing(cursor, "mandates", "agreement_id TEXT")
        _add_column_if_missing(cursor, "mandates", "agreement_hash TEXT")
        _add_column_if_missing(cursor, "mandates", "delegation_id TEXT")

        # Feature C Migrations: Outcome-Contingent Service Agreements
        _add_column_if_missing(cursor, "service_agreements", "target_metric TEXT DEFAULT 'CRS_REDUCTION'")
        _add_column_if_missing(cursor, "service_agreements", "baseline_value REAL DEFAULT 0.0")
        _add_column_if_missing(cursor, "service_agreements", "target_threshold REAL DEFAULT 20.0")
        _add_column_if_missing(cursor, "service_agreements", "measurement_window_seconds INTEGER DEFAULT 60")
        _add_column_if_missing(cursor, "service_agreements", "evaluation_status TEXT DEFAULT 'NOT_EVALUATED'")
        _add_column_if_missing(cursor, "service_agreements", "settlement_eligibility TEXT DEFAULT 'IMMEDIATE_PAID_OUTCOME_UNVERIFIED'")
        _add_column_if_missing(cursor, "service_agreements", "outcome_evaluation_id TEXT")
        _add_column_if_missing(cursor, "service_agreements", "outcome_notes TEXT")

        # Multi-Tenancy & User Profile Migrations
        _add_column_if_missing(cursor, "users", "email_verified INTEGER DEFAULT 0")
        _add_column_if_missing(cursor, "users", "email_verified_at TEXT")
        _add_column_if_missing(cursor, "users", "workspace_id TEXT")
        _add_column_if_missing(cursor, "users", "org_name TEXT")

        # Outcome-Driven Procurement Contract Specifications
        _add_column_if_missing(cursor, "service_agreements", "service_requirements TEXT")
        _add_column_if_missing(cursor, "service_agreements", "max_cost_hsk REAL")
        _add_column_if_missing(cursor, "service_agreements", "delivery_deadline TEXT")
        _add_column_if_missing(cursor, "service_agreements", "baseline_metrics TEXT")
        _add_column_if_missing(cursor, "service_agreements", "target_outcome TEXT")
        _add_column_if_missing(cursor, "service_agreements", "required_evidence TEXT")
        _add_column_if_missing(cursor, "service_agreements", "verification_methodology TEXT")
        _add_column_if_missing(cursor, "service_agreements", "acceptable_uncertainty REAL DEFAULT 0.05")
        _add_column_if_missing(cursor, "service_agreements", "failure_handling_rules TEXT")
        _add_column_if_missing(cursor, "service_agreements", "settlement_criteria TEXT")
        _add_column_if_missing(cursor, "service_agreements", "outcome_status TEXT DEFAULT 'PENDING'")
        _add_column_if_missing(cursor, "service_agreements", "recovery_status TEXT DEFAULT 'NONE'")
        _add_column_if_missing(cursor, "service_agreements", "workspace_id TEXT DEFAULT 'ws_telesol_default'")

        # Tenant Isolation on Financial Objects
        _add_column_if_missing(cursor, "agent_delegations", "workspace_id TEXT DEFAULT 'ws_telesol_default'")
        _add_column_if_missing(cursor, "payment_requests", "workspace_id TEXT DEFAULT 'ws_telesol_default'")
        _add_column_if_missing(cursor, "mandates", "workspace_id TEXT DEFAULT 'ws_telesol_default'")
        _add_column_if_missing(cursor, "settlement_receipts", "workspace_id TEXT DEFAULT 'ws_telesol_default'")
        _add_column_if_missing(cursor, "evidence_bundles", "workspace_id TEXT DEFAULT 'ws_telesol_default'")

        # Sentinel Incidents outcome binding
        _add_column_if_missing(cursor, "sentinel_incidents", "evaluation_id TEXT")
        _add_column_if_missing(cursor, "sentinel_incidents", "recovery_action_id TEXT")
        _add_column_if_missing(cursor, "sentinel_incidents", "outcome_status TEXT DEFAULT 'PENDING'")
        _add_column_if_missing(cursor, "sentinel_incidents", "workspace_id TEXT DEFAULT 'ws_telesol_default'")

        # Indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_mandate_id ON mandates (mandate_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_requests_status ON payment_requests (status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces (slug);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_memberships_ws ON workspace_memberships (workspace_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_memberships_user ON workspace_memberships (user_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_verif_tokens_token ON verification_tokens (token);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_security_events_time ON security_events (timestamp);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_agreements_task ON service_agreements (task_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_delegations_agent ON agent_delegations (agent_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_bundles_mandate ON evidence_bundles (mandate_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_incidents_mandate ON payment_incidents (mandate_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs (timestamp);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_intervention_evals_inc ON intervention_evaluations (incident_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_counterfactual_agr ON counterfactual_evaluations (agreement_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_recovery_incident ON recovery_actions (incident_id);")

        # Seed default workspace if not present
        cursor.execute("SELECT id FROM workspaces WHERE id = 'ws_telesol_default'")
        if not cursor.fetchone():
            now_iso = datetime.now(timezone.utc).isoformat()
            cursor.execute(
                """
                INSERT INTO workspaces (id, name, slug, owner_id, description, settings, is_active, created_at, updated_at)
                VALUES ('ws_telesol_default', 'TeleSol Global Telecom Operations', 'telesol-global', 'usr_seeded_operator', 'Primary production telecom network workspace', '{}', 1, ?, ?)
                """,
                (now_iso, now_iso)
            )
            cursor.execute(
                """
                INSERT OR IGNORE INTO workspace_memberships (id, workspace_id, user_id, role, is_active, created_at, updated_at)
                VALUES ('mem_default_seed', 'ws_telesol_default', 'usr_seeded_operator', 'WORKSPACE_OWNER', 1, ?, ?)
                """,
                (now_iso, now_iso)
            )

        conn.commit()
        conn.close()
        try:
            from app.services.auth_service import AuthService
            AuthService.seed_default_accounts()
        except Exception as e:
            logger.warning("[DB] Could not seed default auth account: %s", str(e))
        logger.info("[DB] TeleSol PayPilot 2.0 schema initialized successfully at %s", DB_PATH)


def seed_initial_data(force: bool = False):
    """Seed initial sample agents, providers, policy, delegations, agreements, and demo receipt."""
    with _db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) as count FROM agents;")
        count = cursor.fetchone()["count"]

        if count > 0 and not force:
            conn.close()
            return

        now = datetime.now(timezone.utc).isoformat()
        future_exp = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

        # Clear existing if force
        if force:
            cursor.execute("DELETE FROM recovery_actions;")
            cursor.execute("DELETE FROM counterfactual_evaluations;")
            cursor.execute("DELETE FROM intervention_evaluations;")
            cursor.execute("DELETE FROM audit_logs;")
            cursor.execute("DELETE FROM sentinel_incidents;")
            cursor.execute("DELETE FROM payment_incidents;")
            cursor.execute("DELETE FROM evidence_bundles;")
            cursor.execute("DELETE FROM settlement_receipts;")
            cursor.execute("DELETE FROM gateway_executions;")
            cursor.execute("DELETE FROM policy_decisions;")
            cursor.execute("DELETE FROM mandates;")
            cursor.execute("DELETE FROM payment_requests;")
            cursor.execute("DELETE FROM agent_delegations;")
            cursor.execute("DELETE FROM service_agreements;")
            cursor.execute("DELETE FROM policies;")
            cursor.execute("DELETE FROM providers;")
            cursor.execute("DELETE FROM agents;")

        # 1. Seed Agents
        agents_data = [
            (
                "agent_buyer_sentinel",
                "TeleSol Sentinel Buyer",
                "BUYER",
                "Autonomous buyer agent that monitors network congestion and procures emergency bandwidth or telemetry data.",
                json.dumps(["discover_services", "propose_payment_request", "evaluate_qos"]),
                "ACTIVE",
                "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
                50.0,
                200.0,
                now,
                now
            ),
            (
                "agent_provider_bandwidth",
                "SkyLink 5G Slice Node",
                "PROVIDER",
                "High-priority cellular bandwidth slice provider on HSK Chain.",
                json.dumps(["bandwidth_allocation", "priority_routing", "qos_metrics"]),
                "ACTIVE",
                "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
                0.0,
                0.0,
                now,
                now
            ),
            (
                "agent_provider_radar",
                "Apex Spatial IoT Fleet",
                "PROVIDER",
                "Crowd radar and millimeter-wave sensor stream data provider.",
                json.dumps(["stream_radar_frames", "telemetry_delivery"]),
                "ACTIVE",
                "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
                0.0,
                0.0,
                now,
                now
            ),
            (
                "agent_payment_pilot",
                "PayPilot Mandate Orchestrator",
                "PAYMENT",
                "Cryptographic payment agent that validates spending policies, prepares HSP payment mandates, and tracks settlement.",
                json.dumps(["construct_mandate", "policy_validation", "gateway_handshake", "chain_verification"]),
                "ACTIVE",
                "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
                200.0,
                1000.0,
                now,
                now
            ),
        ]
        cursor.executemany(
            """INSERT OR REPLACE INTO agents (id, name, role, description, capabilities, status, wallet_address, spending_limit, daily_limit, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);""",
            agents_data
        )

        # 2. Seed Providers
        providers_data = [
            (
                "prov_skylink_5g",
                "SkyLink Dynamic 5G Slicing",
                "TELECOM_BANDWIDTH",
                "On-demand emergency 5G network slice for congested venue gateways with guaranteed 100Mbps uplink.",
                "https://api.skylink-5g.io/v1/slice",
                "PER_HOUR",
                "HSK",
                12.5,
                "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
                133,
                1,
                "REGISTRY",
                "https://telecom.hsk.xyz/providers/skylink",
                now,
                now
            ),
            (
                "prov_apex_radar",
                "Apex IoT Spatial Radar Stream",
                "SENSOR_DATA",
                "Real-time calibrated mmWave radar feed for crowd trajectory analysis and bottleneck prediction.",
                "https://iot.apex-telemetry.net/stream",
                "PER_CALL",
                "HSK",
                2.0,
                "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
                133,
                1,
                "REGISTRY",
                "https://iot.hsk.xyz/apex",
                now,
                now
            ),
            (
                "prov_delhi_transit",
                "Delhi Transit AI Telemetry",
                "ROUTING_AI",
                "Metro & feeder bus congestion intelligence and automated passenger flow rerouting recommendations.",
                "https://api.delhi-transit-ai.gov.in/feed",
                "FIXED",
                "HSK",
                5.0,
                "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
                133,
                1,
                "TINYFISH_DISCOVERED",
                "https://api.search.tinyfish.ai/transit-cache",
                now,
                now
            ),
            (
                "prov_edge_compute",
                "HashEdge AI Micro-Inference",
                "EDGE_COMPUTE",
                "Low-latency localized computer vision inference container for crowd counting and anomaly detection.",
                "https://compute.hashedge.network/infer",
                "PER_GB",
                "HSK",
                8.0,
                "0x9965507D1a55bcC2695C58ba16FB37d819B0A4df",
                133,
                1,
                "REGISTRY",
                "https://hashedge.network",
                now,
                now
            ),
        ]
        cursor.executemany(
            """INSERT OR REPLACE INTO providers (id, name, category, description, service_url, pricing_model, asset, unit_price, payment_address, network_id, verified, source_type, source_url, discovered_at, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);""",
            providers_data
        )

        # 3. Seed Default Policy
        cursor.execute(
            """INSERT OR REPLACE INTO policies (id, name, description, max_amount_per_tx, max_daily_budget, allowed_assets, allowed_networks, allowed_recipients, require_manual_approval, is_active, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);""",
            (
                "policy_telecom_standard",
                "Standard Autonomous Telecom Procurement Policy",
                "Enforces maximum 50 HSK per individual transaction and 200 HSK daily ceiling with mandatory user wallet signature.",
                50.0,
                200.0,
                json.dumps(["HSK", "USDT", "USDC"]),
                json.dumps([133, 177]),
                json.dumps([
                    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
                    "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
                    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
                    "0x9965507D1a55bcC2695C58ba16FB37d819B0A4df"
                ]),
                1,
                1,
                now,
                now
            )
        )

        # 4. Seed Initial Agent Delegation (Phase 4)
        del_id = "del_sentinel_telecom_001"
        cursor.execute("""
        INSERT OR REPLACE INTO agent_delegations (
            id, agent_id, delegator_address, service_categories, max_amount_per_tx,
            max_cumulative_spend, current_spent, reserved_amount, allowed_recipients,
            allowed_assets, allowed_networks, valid_from, valid_until,
            require_manual_review_for_new_providers, require_completion_evidence, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ENABLED', ?, ?);
        """, (
            del_id,
            "agent_buyer_sentinel",
            "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            json.dumps(["TELECOM_BANDWIDTH", "SENSOR_DATA", "EDGE_COMPUTE", "ROUTING_AI"]),
            30.0,
            150.0,
            12.5,  # Matches the demo seed receipt
            0.0,
            json.dumps([
                "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
                "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
                "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
                "0x9965507D1a55bcC2695C58ba16FB37d819B0A4df"
            ]),
            json.dumps(["HSK", "USDT", "USDC"]),
            json.dumps([133, 177]),
            now,
            future_exp,
            1,
            1,
            now,
            now
        ))

        # 5. Seed Initial Canonical Service Agreement (Phase 2)
        agr_id = "agr_seed_001"
        task_id = "task_sentinel_surge_zone_c"
        canonical_terms_dict = {
            "agreement_id": agr_id,
            "agreed_price": 12.5,
            "asset": "HSK",
            "expected_deliverables": "Guaranteed 100Mbps dedicated cellular uplink slice for 1 hour at Gate C",
            "max_authorized_amount": 12.5,
            "network_id": 133,
            "provider_address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            "provider_id": "prov_skylink_5g",
            "requesting_agent_id": "agent_buyer_sentinel",
            "service_category": "TELECOM_BANDWIDTH",
            "task_id": task_id
        }
        agr_canonical = canonical_json(canonical_terms_dict)
        agr_hash = hash_canonical_json(canonical_terms_dict)

        cursor.execute("""
        INSERT OR REPLACE INTO service_agreements (
            id, task_id, requesting_agent_id, provider_id, provider_address,
            service_category, service_description, agreed_price, asset, max_authorized_amount,
            expected_deliverables, expected_completion_time, network_id, evidence_required,
            canonical_terms, agreement_hash, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'FULFILLED', ?, ?);
        """, (
            agr_id,
            task_id,
            "agent_buyer_sentinel",
            "prov_skylink_5g",
            "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            "TELECOM_BANDWIDTH",
            "Mitigate cellular throughput congestion at Gate C during sudden crowd surge",
            12.5,
            "HSK",
            12.5,
            "Guaranteed 100Mbps dedicated cellular uplink slice for 1 hour at Gate C",
            future_exp,
            133,
            "BANDWIDTH_QOS_TELEMETRY",
            agr_canonical,
            agr_hash,
            now,
            now
        ))

        # 6. Seed Demo Payment Request & Mandate
        req_id = "req_seed_demo_001"
        man_id = "man_hsp_seed_demo_001"
        tx_hash = "0x8fa9c6123e71ba9843d4e8c19a9972ba7e95f6c8d4e9087c918a2456e40938b2"

        cursor.execute("""
        INSERT OR REPLACE INTO payment_requests (
            id, title, buyer_agent_id, provider_id, recipient_address, asset, amount,
            network_id, purpose, reference_metadata, expiry_timestamp, policy_id,
            agreement_id, agreement_hash, delegation_id, status, is_demo, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SETTLED', 1, ?, ?);
        """, (
            req_id,
            "Emergency 5G Slice Allocation — Gate C Surge",
            "agent_buyer_sentinel",
            "prov_skylink_5g",
            "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            "HSK",
            12.5,
            133,
            "Mitigate cellular throughput congestion at Gate C during sudden crowd surge",
            json.dumps({"zone": "zone-c", "crs_score": 78.4, "incident_ref": "INC-2026-042"}),
            future_exp,
            "policy_telecom_standard",
            agr_id,
            agr_hash,
            del_id,
            now,
            now
        ))

        cursor.execute("""
        INSERT OR REPLACE INTO mandates (
            id, mandate_id, request_id, payer_id, payee_id, recipient_address,
            amount, asset, network_id, purpose, spending_limit, expiry_timestamp,
            agreement_id, agreement_hash, delegation_id,
            authorization_status, execution_status, verification_status,
            wallet_signature, signer_address, gateway_order_id, tx_hash, is_demo, created_at, authorized_at, settled_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AUTHORIZED', 'SETTLED', 'DEMO_VERIFIED', ?, ?, ?, ?, 1, ?, ?, ?);
        """, (
            man_id,
            man_id,
            req_id,
            "agent_buyer_sentinel",
            "agent_provider_bandwidth",
            "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            12.5,
            "HSK",
            133,
            "Mitigate cellular throughput congestion at Gate C during sudden crowd surge",
            50.0,
            future_exp,
            agr_id,
            agr_hash,
            del_id,
            "0x5f8173468b8b92b6a9e14a1e94883ef57a916dc25d9961ca3fb6ff9b8c0c1b0177726488d927c8e9b11029c78ea38a087192a5d2077e2dae66f91605f63901b21c",
            "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            "HSP_DEMO_ORDER_994821",
            tx_hash,
            now,
            now,
            now
        ))

        cursor.execute("""
        INSERT OR REPLACE INTO policy_decisions (id, mandate_id, policy_id, decision, rules_evaluated, reason, evaluated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (
            "pdec_seed_001",
            man_id,
            "policy_telecom_standard",
            "APPROVED",
            json.dumps([
                {"rule": "max_amount_per_tx", "passed": True, "limit": 50.0, "value": 12.5},
                {"rule": "max_daily_budget", "passed": True, "limit": 200.0, "current_day_total": 0.0},
                {"rule": "allowed_assets", "passed": True, "asset": "HSK"},
                {"rule": "allowed_networks", "passed": True, "network_id": 133},
                {"rule": "allowed_recipients", "passed": True, "recipient": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"},
                {"rule": "role_separation", "passed": True, "buyer_differs_from_provider": True},
                {"rule": "agreement_hash_binding", "passed": True, "hash": agr_hash}
            ]),
            "Mandate complies with all spending ceiling, delegation, and agreement binding checks. Ready for user wallet signing.",
            now
        ))

        # Explicitly label the demo receipt as DEMO_VERIFIED without claiming real on-chain confirmation
        cursor.execute("""
        INSERT OR REPLACE INTO settlement_receipts (
            id, receipt_id, mandate_id, request_id, transaction_hash, block_number,
            network_id, network_name, chain_id, payer_address, payee_address,
            asset, amount, gateway_status, chain_verification_status, source_attribution, is_demo, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?);
        """, (
            "rcpt_seed_001",
            "RCPT-HSK-133-000492",
            man_id,
            req_id,
            tx_hash,
            None,  # Not claiming real mined block in demo seed
            133,
            "HSK Chain Testnet",
            133,
            "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            "HSK",
            12.5,
            "SETTLED",
            "DEMO_VERIFIED",
            json.dumps({
                "gateway": {
                    "source": "HashKey Settlement Protocol (HSP) Demo Adapter",
                    "order_id": "HSP_DEMO_ORDER_994821",
                    "merchant_id": "MERCHANT_TELESOL_DEMO",
                    "status": "SETTLED",
                    "timestamp": now,
                    "is_demo": True
                },
                "chain": {
                    "source": "HSK Chain Testnet RPC (Chain ID 133)",
                    "tx_hash": tx_hash,
                    "block_number": None,
                    "status": "DEMO_SIMULATED",
                    "note": "Pre-seeded demonstration record. Real transactions query live HSK RPC."
                },
                "mandate": {
                    "source": "TeleSol PayPilot Policy Engine",
                    "mandate_id": man_id,
                    "signer": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
                    "agreement_id": agr_id,
                    "agreement_hash": agr_hash
                }
            }),
            now
        ))

        # 7. Seed Initial Evidence Bundle (Phase 6)
        bundle_id = "evb_seed_001"
        completion_evidence_dict = {
            "evidence_type": "BANDWIDTH_QOS_TELEMETRY",
            "allocated_slice_id": "slice_hsk_5g_gate_c_01",
            "measured_throughput_mbps": 104.2,
            "latency_ms": 11.8,
            "packet_loss_pct": 0.01,
            "duration_seconds": 3600,
            "provider_attestation_signature": "0x7a8b9c...attest",
            "submitted_at": now
        }
        bundle_content = {
            "agreement_hash": agr_hash,
            "agreement_id": agr_id,
            "amount": 12.5,
            "asset": "HSK",
            "bundle_id": bundle_id,
            "chain_id": 133,
            "completion_evidence": completion_evidence_dict,
            "delegation_id": del_id,
            "hsp_order_id": "HSP_DEMO_ORDER_994821",
            "mandate_id": man_id,
            "network_id": 133,
            "payee_address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            "payer_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            "task_id": task_id,
            "transaction_hash": tx_hash,
            "wallet_signature": "0x5f8173468b8b92b6a9e14a1e94883ef57a916dc25d9961ca3fb6ff9b8c0c1b0177726488d927c8e9b11029c78ea38a087192a5d2077e2dae66f91605f63901b21c"
        }
        bundle_canonical = canonical_json(bundle_content)
        bundle_hash = hash_canonical_json(bundle_content)

        verification_report_dict = {
            "verified": True,
            "checks": {
                "agreement_hash_match": True,
                "mandate_fields_match": True,
                "wallet_signature_valid": True,
                "chain_id_valid": True,
                "duplicate_tx_hash": False,
                "completion_evidence_present": True
            },
            "environment": "DEMO_SIMULATION",
            "verified_at": now
        }

        cursor.execute("""
        INSERT OR REPLACE INTO evidence_bundles (
            id, task_id, agreement_id, agreement_hash, request_id, mandate_id,
            delegation_id, policy_decision_id, wallet_signer, wallet_signature,
            hsp_order_id, hsp_status, transaction_hash, chain_id, block_number,
            chain_status, completion_evidence, canonical_bundle, bundle_hash,
            verification_report, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED', ?);
        """, (
            bundle_id,
            task_id,
            agr_id,
            agr_hash,
            req_id,
            man_id,
            del_id,
            "pdec_seed_001",
            "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            "0x5f8173468b8b92b6a9e14a1e94883ef57a916dc25d9961ca3fb6ff9b8c0c1b0177726488d927c8e9b11029c78ea38a087192a5d2077e2dae66f91605f63901b21c",
            "HSP_DEMO_ORDER_994821",
            "SETTLED",
            tx_hash,
            133,
            None,
            "DEMO_VERIFIED",
            json.dumps(completion_evidence_dict),
            bundle_canonical,
            bundle_hash,
            json.dumps(verification_report_dict),
            now
        ))

        # 8. Seed Initial Sentinel Incident Link (Phase 8)
        cursor.execute("""
        INSERT OR REPLACE INTO sentinel_incidents (
            id, zone_id, zone_name, crs_score, scenario, recommended_category,
            agreement_id, mandate_id, settlement_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SETTLED', ?);
        """, (
            "sent_inc_gate_c_01",
            "zone-c",
            "Gate C — VIP Corridor",
            78.4,
            "sudden_surge",
            "TELECOM_BANDWIDTH",
            agr_id,
            man_id,
            now
        ))

        # 9. Seed initial Genesis Audit Log with tamper-evident SHA-256 hash
        clean_details = {"chain": "HSK Chain (133/177)", "version": "2.0.0", "system": "TeleSol PayPilot"}
        details_json = json.dumps(clean_details, sort_keys=True)
        prev_hash = "0" * 64
        hash_payload = f"{prev_hash}|GENESIS_SEED|system|SYSTEM|paypilot_init|initialize_database|{details_json}|{now}"
        genesis_hash = hashlib.sha256(hash_payload.encode("utf-8")).hexdigest()

        cursor.execute("""
        INSERT INTO audit_logs (event_type, actor, entity_type, entity_id, action, details, previous_hash, current_hash, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            "GENESIS_SEED",
            "system",
            "SYSTEM",
            "paypilot_init",
            "initialize_database",
            details_json,
            prev_hash,
            genesis_hash,
            now
        ))

        conn.commit()
        conn.close()
        try:
            from app.services.auth_service import AuthService
            AuthService.seed_default_accounts()
        except Exception as e:
            logger.warning("[DB] Could not seed default auth account: %s", str(e))
        logger.info("[DB] TeleSol PayPilot 2.0 seeded with initial agents, providers, policies, delegations, agreements, and demo bundle.")
