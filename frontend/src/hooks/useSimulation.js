// ═══════════════════════════════════════════════════════
// CrowdShield — Simulation Hook
// Manages live/simulation toggle and simulation state
// ═══════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { ZONES, ALERTS, jitterInt } from '../data/mockData';
import { DEFAULT_SIM_PARAMS, simulateStep, generateSimAlerts } from '../data/simulationEngine';

export function useSimulation() {
  const [mode, setMode] = useState('live'); // 'live' | 'simulation'
  const [params, setParams] = useState(DEFAULT_SIM_PARAMS);
  const [zones, setZones] = useState(ZONES);
  const [alerts, setAlerts] = useState(ALERTS);
  const [speed, setSpeed] = useState(1); // 1x, 2x, 5x
  const [isRunning, setIsRunning] = useState(false);
  const [simTime, setSimTime] = useState(0); // seconds elapsed in simulation
  const prevZonesRef = useRef(zones);
  const intervalRef = useRef(null);

  // ── Live mode: subtle jitter to simulate real data ──
  useEffect(() => {
    if (mode !== 'live') return;

    const liveInterval = setInterval(() => {
      setZones(prev => prev.map(z => ({
        ...z,
        density: Math.max(0.5, parseFloat((z.density + (Math.random() - 0.5) * 0.4).toFixed(1))),
        flowInstability: Math.max(0, Math.min(100, z.flowInstability + jitterInt(0, 3))),
        panicLevel: Math.max(0, Math.min(100, z.panicLevel + jitterInt(0, 2))),
        riskScore: Math.max(0, Math.min(100, z.riskScore + jitterInt(0, 2))),
      })));
    }, 2000);

    return () => clearInterval(liveInterval);
  }, [mode]);

  // ── Simulation mode: controlled step execution ──
  useEffect(() => {
    if (mode !== 'simulation' || !isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const interval = 1000 / speed;
    intervalRef.current = setInterval(() => {
      setZones(prev => {
        prevZonesRef.current = prev;
        const next = simulateStep(prev, params);

        // Generate alerts from threshold crossings
        const newAlerts = generateSimAlerts(prev, next);
        if (newAlerts.length > 0) {
          setAlerts(prevAlerts => [...newAlerts, ...prevAlerts].slice(0, 50));
        }

        return next;
      });
      setSimTime(prev => prev + 1);
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [mode, isRunning, speed, params]);

  // ── Toggle mode ──
  const toggleMode = useCallback(() => {
    setMode(prev => {
      const next = prev === 'live' ? 'simulation' : 'live';
      if (next === 'live') {
        setZones(ZONES);
        setAlerts(ALERTS);
        setIsRunning(false);
        setSimTime(0);
        setParams(DEFAULT_SIM_PARAMS);
      }
      return next;
    });
  }, []);

  // ── Update param ──
  const updateParam = useCallback((key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  }, []);

  // ── Reset simulation ──
  const resetSimulation = useCallback(() => {
    setZones(ZONES);
    setAlerts(ALERTS);
    setParams(DEFAULT_SIM_PARAMS);
    setSimTime(0);
    setIsRunning(false);
  }, []);

  // ── Computed values ──
  const kpis = {
    activeZones: zones.length,
    avgRiskScore: Math.round(zones.reduce((s, z) => s + z.riskScore, 0) / zones.length),
    highRiskAlerts: alerts.filter(a => a.severity === 'critical').length,
    peakDensity: Math.max(...zones.map(z => z.density)),
  };

  return {
    mode,
    toggleMode,
    params,
    updateParam,
    zones,
    alerts,
    kpis,
    speed,
    setSpeed,
    isRunning,
    setIsRunning,
    simTime,
    resetSimulation,
  };
}
