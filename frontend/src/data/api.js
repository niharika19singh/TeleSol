// TeleSol API Client
// Connects to backend, falls back to mock data when offline

// Base API URL: configured via VITE_API_BASE_URL for production (e.g. Render), falls back to localhost:8000
const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const defaultBase = isLocal ? 'http://localhost:8000' : 'https://telesol-sentinel-api.onrender.com';
const rawApiBase = import.meta.env.VITE_API_BASE_URL || defaultBase;
export const API_BASE = rawApiBase.replace(/\/+$/, '');

// Dynamic WebSocket URL with wss:// support in production
function computeWsUrl() {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL.replace(/\/+$/, '');
  }
  if (API_BASE.startsWith('https://')) {
    return API_BASE.replace(/^https:\/\//, 'wss://') + '/ws';
  }
  if (API_BASE.startsWith('http://')) {
    return API_BASE.replace(/^http:\/\//, 'ws://') + '/ws';
  }
  return 'ws://localhost:8000/ws';
}

export const WS_URL = computeWsUrl();

let wsConnection = null;
let wsReconnectTimer = null;

/**
 * Fetch JSON from the backend with timeout and error handling.
 * @param {string} endpoint - API path
 * @param {string} [channel] - 'real' or 'sim' to filter by data source
 */
async function apiFetch(endpoint, channel) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const sep = endpoint.includes('?') ? '&' : '?';
    const url = channel ? `${API_BASE}${endpoint}${sep}channel=${channel}` : `${API_BASE}${endpoint}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[API] ${endpoint} failed:`, err.message);
    return null;
  }
}

/** Get all dashboard data in one call */
export async function fetchDashboardAll(channel) {
  return await apiFetch('/api/dashboard/all', channel);
}

/** Get aggregated stats */
export async function fetchStats(channel) {
  return await apiFetch('/api/stats', channel);
}

/** Get sensor health */
export async function fetchSensorHealth(channel) {
  return await apiFetch('/api/sensors/health', channel);
}

/** Get live sensor data */
export async function fetchLiveData(channel) {
  return await apiFetch('/api/sensors/live', channel);
}

/** Get CRS breakdown */
export async function fetchCRS(channel) {
  return await apiFetch('/api/crs/calculate', channel);
}

/** Get alerts */
export async function fetchAlerts(channel) {
  return await apiFetch('/api/alerts', channel);
}

/** Get granular per-sensor data for sensor dashboard */
export async function fetchSensorDetail(channel) {
  return await apiFetch('/api/sensors/detail', channel);
}

/** Get protocol status (HTTP, CoAP, WebSocket) */
export async function fetchProtocolStatus() {
  return await apiFetch('/api/protocols/status');
}

/** Get channel summary (real vs sim) */
export async function fetchChannels() {
  return await apiFetch('/api/channels');
}

/** Get Sentinel simulation & venue status */
export async function fetchSentinelStatus() {
  return await apiFetch('/api/sentinel/status');
}

/** Control Sentinel simulation (start, pause, reset, scenario, speed) */
export async function controlSentinel({ action, scenario, speed }) {
  try {
    const res = await fetch(`${API_BASE}/api/sentinel/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, scenario, speed }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[API] controlSentinel failed:', err.message);
    return null;
  }
}

/** Get AI 5-minute & 15-minute multi-zone forecast */
export async function fetchAIForecast() {
  return await apiFetch('/api/ai/forecast');
}

/** Get TinyFish Web Agent status & active investigation */
export async function fetchTinyFishStatus() {
  return await apiFetch('/api/tinyfish/status');
}

/** Trigger asynchronous TinyFish investigation */
export async function triggerTinyFishInvestigation(zoneId, reason) {
  try {
    const res = await fetch(`${API_BASE}/api/tinyfish/investigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zone_id: zoneId, reason }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[API] triggerTinyFishInvestigation failed:', err.message);
    return null;
  }
}

/**
 * Connect to WebSocket for real-time updates.
 * @param {function} onMessage - callback(data) for each update
 * @param {function} onStatusChange - callback(connected: boolean)
 */
export function connectWebSocket(onMessage, onStatusChange) {
  if (wsConnection) {
    try { wsConnection.close(); } catch (e) { /* ignore */ }
  }

  try {
    wsConnection = new WebSocket(WS_URL);

    wsConnection.onopen = () => {
      console.log('[WS] Connected');
      onStatusChange?.(true);
    };

    wsConnection.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        onMessage?.(msg);
      } catch (e) {
        console.warn('[WS] Parse error:', e);
      }
    };

    wsConnection.onclose = () => {
      console.log('[WS] Disconnected');
      onStatusChange?.(false);
      // Auto-reconnect after 3s
      wsReconnectTimer = setTimeout(() => {
        connectWebSocket(onMessage, onStatusChange);
      }, 3000);
    };

    wsConnection.onerror = (err) => {
      console.warn('[WS] Error');
      onStatusChange?.(false);
    };
  } catch (e) {
    console.warn('[WS] Failed to connect:', e);
    onStatusChange?.(false);
  }
}

/** Disconnect WebSocket */
export function disconnectWebSocket() {
  if (wsReconnectTimer) {
    clearTimeout(wsReconnectTimer);
    wsReconnectTimer = null;
  }
  if (wsConnection) {
    try { wsConnection.close(); } catch (e) { /* ignore */ }
    wsConnection = null;
  }
}

/**
 * Get current GPS location from the browser.
 * Returns { lat, lng } or null.
 */
export function getGPSLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('[GPS] Not supported');
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        console.warn('[GPS] Error:', err.message);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  });
}

/**
 * Generic POST request to backend API
 */
async function apiPost(endpoint, body = {}, token = null) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.detail || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  } catch (err) {
    console.warn(`[API POST] ${endpoint} failed:`, err.message);
    throw err;
  }
}

async function apiGetAuth(endpoint, token = null) {
  try {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${endpoint}`, { headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.detail || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  } catch (err) {
    console.warn(`[API GET] ${endpoint} failed:`, err.message);
    throw err;
  }
}

async function apiPatch(endpoint, body = {}, token = null) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.detail || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  } catch (err) {
    console.warn(`[API PATCH] ${endpoint} failed:`, err.message);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════
// USER AUTHENTICATION API
// ═══════════════════════════════════════════════════════════════════

export async function loginUser(credentials) {
  return await apiPost('/api/auth/login', credentials);
}

export async function registerUser(userData) {
  return await apiPost('/api/auth/register', userData);
}

export async function verifyEmail(token) {
  return await apiPost('/api/auth/verify-email', { token });
}

export async function resendVerification(email) {
  return await apiPost('/api/auth/resend-verification', { email });
}

export async function forgotPassword(email) {
  return await apiPost('/api/auth/forgot-password', { email });
}

export async function resetPassword(token, new_password) {
  return await apiPost('/api/auth/reset-password', { token, new_password });
}

export async function bootstrapAdmin(adminData) {
  return await apiPost('/api/auth/bootstrap-admin', adminData);
}

export async function fetchCurrentUser(token) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.user || data;
  } catch (err) {
    console.warn('[API] /api/auth/me failed:', err.message);
    return null;
  }
}

export async function logoutUser(token) {
  try {
    return await apiPost('/api/auth/logout', {}, token);
  } catch (e) {
    return { status: 'logged_out' };
  }
}

// ═══════════════════════════════════════════════════════════════════
// PLATFORM ADMINISTRATION API (PLATFORM_ADMIN ONLY)
// ═══════════════════════════════════════════════════════════════════

export async function fetchAdminOverview(token) {
  return await apiGetAuth('/api/admin/overview', token);
}

export async function fetchAdminUsers(token, params = {}) {
  const q = new URLSearchParams();
  if (params.limit) q.set('limit', params.limit);
  if (params.offset) q.set('offset', params.offset);
  if (params.role) q.set('role', params.role);
  if (params.search) q.set('search', params.search);
  const qs = q.toString();
  return await apiGetAuth(`/api/admin/users${qs ? `?${qs}` : ''}`, token);
}

export async function updateUserRole(userId, role, token) {
  return await apiPatch(`/api/admin/users/${encodeURIComponent(userId)}/role`, { role }, token);
}

export async function updateUserStatus(userId, is_active, token) {
  return await apiPatch(`/api/admin/users/${encodeURIComponent(userId)}/status`, { is_active }, token);
}

export async function fetchAdminWorkspaces(token) {
  return await apiGetAuth('/api/admin/workspaces', token);
}

export async function createAdminWorkspace(workspaceData, token) {
  return await apiPost('/api/admin/workspaces', workspaceData, token);
}

export async function fetchAdminSecurityEvents(token, params = {}) {
  const q = new URLSearchParams();
  if (params.limit) q.set('limit', params.limit);
  if (params.offset) q.set('offset', params.offset);
  if (params.event_type) q.set('event_type', params.event_type);
  const qs = q.toString();
  return await apiGetAuth(`/api/admin/security-events${qs ? `?${qs}` : ''}`, token);
}

export async function fetchAdminIntegrations(token) {
  return await apiGetAuth('/api/admin/integrations', token);
}

export async function fetchAdminSettings(token) {
  return await apiGetAuth('/api/admin/settings', token);
}

// ═══════════════════════════════════════════════════════════════════
// OUTCOME-DRIVEN PROCUREMENT & RELIABILITY API
// ═══════════════════════════════════════════════════════════════════

export async function verifyAgreementOutcome(agreementId, payload = {}, token = null) {
  return await apiPost(`/api/paypilot/agreements/${encodeURIComponent(agreementId)}/verify-outcome`, payload, token);
}

export async function fetchProviderReliability(providerId) {
  return await apiFetch(`/api/paypilot/providers/${encodeURIComponent(providerId)}/reliability`);
}

export async function triggerIncidentRecovery(incidentId, payload = {}, token = null) {
  return await apiPost(`/api/paypilot/incidents/${encodeURIComponent(incidentId)}/recovery`, payload, token);
}

// ═══════════════════════════════════════════════════════════════════
// MACHINE LEARNING & INTELLIGENCE API
// ═══════════════════════════════════════════════════════════════════

export async function fetchModelInfo() {
  return await apiFetch('/api/ml/model-info');
}

export async function fetchDatasetCatalog() {
  return await apiFetch('/api/ml/datasets');
}

export async function runModelInference(telemetry) {
  return await apiPost('/api/ml/predict', telemetry);
}

export async function triggerModelTraining() {
  return await apiPost('/api/ml/train', {});
}

// ═══════════════════════════════════════════════════════════════════
// DIGITAL TWIN & REAL TELECOM DATA API
// ═══════════════════════════════════════════════════════════════════

export async function fetchDigitalTwinSites(filters = {}) {
  const query = new URLSearchParams();
  if (filters.source && filters.source !== 'all') query.set('source', filters.source);
  if (filters.tech && filters.tech !== 'all') query.set('tech', filters.tech);
  if (filters.risk && filters.risk !== 'all') query.set('risk', filters.risk);
  if (filters.query) query.set('query', filters.query);

  const qs = query.toString();
  const endpoint = `/api/digital-twin/sites${qs ? `?${qs}` : ''}`;
  return await apiFetch(endpoint);
}

export async function fetchDigitalTwinSiteDetail(siteId) {
  if (!siteId) return null;
  return await apiFetch(`/api/digital-twin/sites/${encodeURIComponent(siteId)}`);
}

export async function fetchDigitalTwinLayers() {
  return await apiFetch('/api/digital-twin/layers');
}

export async function fetchDigitalTwinTopology() {
  return await apiFetch('/api/digital-twin/topology');
}

export async function fetchOpenCellIdStatus() {
  return await apiFetch('/api/digital-twin/providers/opencellid');
}
