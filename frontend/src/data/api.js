// TeleSol API Client
// Connects to backend, falls back to mock data when offline

const API_BASE = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws';

let wsConnection = null;
let wsReconnectTimer = null;

/**
 * Fetch JSON from the backend with timeout and error handling.
 */
async function apiFetch(endpoint) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${API_BASE}${endpoint}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[API] ${endpoint} failed:`, err.message);
    return null;
  }
}

/** Get all dashboard data in one call */
export async function fetchDashboardAll() {
  return await apiFetch('/api/dashboard/all');
}

/** Get aggregated stats */
export async function fetchStats() {
  return await apiFetch('/api/stats');
}

/** Get sensor health */
export async function fetchSensorHealth() {
  return await apiFetch('/api/sensors/health');
}

/** Get live sensor data */
export async function fetchLiveData() {
  return await apiFetch('/api/sensors/live');
}

/** Get CRS breakdown */
export async function fetchCRS() {
  return await apiFetch('/api/crs/calculate');
}

/** Get alerts */
export async function fetchAlerts() {
  return await apiFetch('/api/alerts');
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
