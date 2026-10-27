# TeleSol PayPilot: Production Deployment Guide

This guide covers deployment procedures for **TeleSol PayPilot** across modern hosting platforms (Vercel, Render, Fly.io, or Docker), environment variable configurations, database persistence, and rollback instructions.

---

## 1. Architecture Overview

- **Frontend**: Single-Page Application (SPA) built with React 19, Vite, and Tailwind CSS. Static output directory: `frontend/dist`.
- **Backend**: Asynchronous Python REST API built with FastAPI and Uvicorn. Root entrypoint: `backend/app/main.py:app`.
- **Database**: SQLite with Write-Ahead Logging (WAL) enabled, located at `backend/data/paypilot.db` (mount persistent volume in production).

---

## 2. Environment Variables Specification

Create or configure `.env` (refer to [`.env.example`](file:///Users/user/Documents/TeleSol-mac-release/.env.example)):

### Core Configuration
| Variable | Description | Default | Production Example |
| :--- | :--- | :--- | :--- |
| `ENVIRONMENT` | Runtime environment (`development`, `production`, `test`) | `development` | `production` |
| `PORT` | Backend listening port | `8000` | `8000` |
| `DATABASE_PATH` | Absolute/relative path to SQLite database | `backend/data/paypilot.db` | `/var/data/paypilot.db` |
| `CORS_ORIGINS` | Permitted frontend origins (comma-separated) | `*` | `https://paypilot.telesol.network` |

### HSK Chain Configuration
| Variable | Description | Default |
| :--- | :--- | :--- |
| `HSK_CHAIN_ID` | Active HSK Chain ID (`133` for Testnet, `177` for Mainnet) | `133` |
| `HSK_RPC_URL` | HSK JSON-RPC endpoint | `https://testnet.hsk.xyz` |
| `HSK_EXPLORER_URL` | HSK Block Explorer base URL | `https://testnet-explorer.hskchain.net` |
| `HSK_REGISTRY_CONTRACT` | Address of deployed `AgentPolicyRegistry.sol` | Optional / Deployed address |

### HashKey Settlement Protocol (HSP) Configuration
| Variable | Description | Default / Fallback |
| :--- | :--- | :--- |
| `HSP_GATEWAY_URL` | HashKey Merchant API base URL | `https://api.merchant.hashkey.com` |
| `HSP_MERCHANT_ID` | Merchant identifier assigned by HashKey | Optional (Triggers Demo mode if unset) |
| `HSP_API_KEY` | Merchant API public key | Optional (Triggers Demo mode if unset) |
| `HSP_API_SECRET` | HMAC-SHA256 signature secret key | Optional (Triggers Demo mode if unset) |
| `HSP_CALLBACK_URL` | Webhook URL for asynchronous settlement events | `https://api.telesol.network/api/paypilot/webhooks/hsp` |

### External Services
| Variable | Description | Default |
| :--- | :--- | :--- |
| `TINYFISH_API_KEY` | TinyFish Search & Fetch API key | Optional (Demo providers if unset) |
| `GEMINI_API_KEY` | Optional Google Gemini key for advanced intent parsing | Optional (Regex parser fallback) |

---

## 3. Frontend Deployment (Vercel / Cloudflare Pages / Netlify)

### Vercel Deployment
1. Connect repository to Vercel.
2. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Set Environment Variable in Vercel Dashboard:
   - `VITE_API_URL`: URL of deployed backend (e.g., `https://api-paypilot.onrender.com`)
4. Deploy!

---

## 4. Backend Deployment (Render / Fly.io / GCP Cloud Run)

### Render.com Deployment
1. Create a new **Web Service** pointing to this repository.
2. Select **Python 3** environment.
3. Configuration settings:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add a **Persistent Disk** (Mount path: `/opt/render/project/src/backend/data`, Size: 1 GB) to persist the SQLite WAL database and audit log across restarts.
5. Add the environment variables from Section 2.

### Docker Deployment
A standard production Dockerfile for the backend:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc libsqlite3-dev && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ /app/backend/

ENV PYTHONPATH=/app/backend
WORKDIR /app/backend

VOLUME ["/app/backend/data"]

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 5. Health Checks & Verification

After deployment, verify that both subsystems are healthy:

1. **System Health Check**:
   ```bash
   curl -s https://<your-backend-domain>/health
   # Expected response: {"status": "ok", "app": "TeleSol Sentinel & PayPilot", "subsystem": "TeleSol PayPilot"}
   ```
2. **PayPilot Health Check**:
   ```bash
   curl -s https://<your-backend-domain>/api/paypilot/health
   # Expected response: {"status": "ok", "chain": "HSK Chain (133)", "hsp_gateway_mode": "DEMO" | "LIVE", "database": "healthy"}
   ```
3. **Audit Trail Verification**:
   ```bash
   curl -s https://<your-backend-domain>/api/paypilot/audit/verify
   # Expected response: {"verified": true, "total_events": 20, "chain_status": "VALID"}
   ```

---

## 6. Rollback & Disaster Recovery

- **Database Backup**: The SQLite WAL database can be backed up online using the standard SQLite backup API or command line:
  ```bash
  sqlite3 backend/data/paypilot.db ".backup 'backend/data/backup_$(date +%Y%m%d%H%M%S).db'"
  ```
- **Code Rollback**: Since the database schema uses backwards-compatible columns and isolated tables (`paypilot_*`), code rollbacks via Git / Vercel / Render can be executed instantly without schema rollback scripts.
