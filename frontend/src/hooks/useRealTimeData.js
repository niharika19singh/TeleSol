// ═══════════════════════════════════════════════════════
// CrowdShield — Real-Time Data Hook
// Wraps API + WebSocket with mock fallback
// ═══════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { fetchDashboardAll, connectWebSocket, disconnectWebSocket } from '../data/api';

export function useRealTimeData() {
  const [isConnected, setIsConnected] = useState(false);
  const [backendData, setBackendData] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const handleData = useCallback((data) => {
    if (data) {
      setBackendData(data);
      setLastUpdate(Date.now());
    }
  }, []);

  useEffect(() => {
    // Try initial fetch
    fetchDashboardAll().then((data) => {
      if (data) {
        setIsConnected(true);
        handleData(data);
      }
    });

    // WebSocket for real-time
    connectWebSocket(
      (msg) => {
        if (msg.type === 'initial' || msg.type === 'sensor_update') {
          handleData(msg.data);
        }
      },
      (connected) => setIsConnected(connected)
    );

    // Polling fallback
    const interval = setInterval(async () => {
      const data = await fetchDashboardAll();
      if (data) {
        setIsConnected(true);
        handleData(data);
      }
    }, 5000);

    return () => {
      disconnectWebSocket();
      clearInterval(interval);
    };
  }, [handleData]);

  return {
    isConnected,
    backendData,
    lastUpdate,
    sentinel: backendData?.sentinel || null,
    aiForecast: backendData?.aiForecast || null,
    tinyfish: backendData?.tinyfish || null,
    zones: backendData?.sentinel?.zones || null,
    venue: backendData?.sentinel?.venue || null,
    timeline: backendData?.sentinel?.timeline || [],
    alerts: backendData?.alerts || [],
    stats: backendData?.stats || null,
    crs: backendData?.crs || null,
  };
}
