// ═══════════════════════════════════════════════════════
// CrowdShield — Simulation Engine
// Computes zone risk dynamically based on slider inputs
// ═══════════════════════════════════════════════════════

import { getStatusFromScore, jitter } from './mockData';

/**
 * Default simulation parameters
 */
export const DEFAULT_SIM_PARAMS = {
  crowdDensity: 3.0,    // people per m² (0–10)
  entryRate: 100,        // people per minute (0–500)
  exitBlockage: 0,       // percentage (0–100)
};

/**
 * Calculate risk score for a zone based on simulation parameters
 * Risk = weighted combination of density pressure + flow disruption + panic amplifier
 */
export function calculateZoneRisk(zone, params) {
  const { crowdDensity, entryRate, exitBlockage } = params;

  // Each zone has different vulnerability coefficients
  const vulnerabilities = {
    'zone-a': { densityWeight: 0.9, flowWeight: 0.8, panicWeight: 0.5, baseCapacity: 300 },
    'zone-b': { densityWeight: 1.1, flowWeight: 1.0, panicWeight: 0.7, baseCapacity: 200 },
    'zone-c': { densityWeight: 1.3, flowWeight: 1.2, panicWeight: 1.0, baseCapacity: 150 },
    'zone-d': { densityWeight: 0.7, flowWeight: 0.6, panicWeight: 0.4, baseCapacity: 350 },
    'zone-e': { densityWeight: 1.0, flowWeight: 0.9, panicWeight: 0.6, baseCapacity: 250 },
    'zone-f': { densityWeight: 0.6, flowWeight: 0.5, panicWeight: 0.3, baseCapacity: 400 },
  };

  const v = vulnerabilities[zone.id] || { densityWeight: 1, flowWeight: 1, panicWeight: 0.5, baseCapacity: 250 };

  // Density pressure (0–40 contribution)
  const densityPressure = Math.min(40, (crowdDensity / 10) * 40 * v.densityWeight);

  // Flow disruption from entry rate vs capacity (0–30 contribution)
  const flowDisruption = Math.min(30, (entryRate / v.baseCapacity) * 20 * v.flowWeight);

  // Exit blockage amplifier (0–30 contribution) — exponential growth
  const blockageEffect = Math.min(30, Math.pow(exitBlockage / 100, 1.5) * 30 * v.panicWeight * 2);

  // Composite risk with zone-specific jitter
  const rawRisk = densityPressure + flowDisruption + blockageEffect;
  const risk = Math.min(100, Math.max(0, Math.round(rawRisk + jitter(0, 2))));

  return risk;
}

/**
 * Run one simulation step on all zones
 * Returns updated zones with new scores
 */
export function simulateStep(zones, params) {
  return zones.map(zone => {
    const riskScore = calculateZoneRisk(zone, params);
    const status = getStatusFromScore(riskScore);

    // Derive sensor values from risk
    const density = Math.max(0.5, (params.crowdDensity * (riskScore / 50) + jitter(0, 0.5)).toFixed(1));
    const flowInstability = Math.min(100, Math.max(0, Math.round(riskScore * 0.85 + jitter(0, 5))));
    const panicLevel = Math.min(100, Math.max(0, Math.round(
      riskScore > 65 ? riskScore * 0.6 + jitter(0, 8) : riskScore * 0.3 + jitter(0, 3)
    )));

    return {
      ...zone,
      riskScore,
      status,
      density: parseFloat(density),
      flowInstability,
      panicLevel,
    };
  });
}

/**
 * Generate an alert if a zone crosses a threshold
 */
export function generateSimAlerts(prevZones, newZones) {
  const alerts = [];

  newZones.forEach((zone, i) => {
    const prev = prevZones[i];

    // Crossed into danger
    if (prev.riskScore <= 65 && zone.riskScore > 65) {
      alerts.push({
        id: `sim-${Date.now()}-${zone.id}-danger`,
        zone: zone.name,
        zoneId: zone.id,
        severity: 'critical',
        riskScore: zone.riskScore,
        message: `Risk escalated to CRITICAL — ${zone.riskScore}/100`,
        action: 'Redirect crowd and deploy emergency staff immediately',
        timestamp: Date.now(),
      });
    }
    // Crossed into warning
    else if (prev.riskScore <= 40 && zone.riskScore > 40) {
      alerts.push({
        id: `sim-${Date.now()}-${zone.id}-warn`,
        zone: zone.name,
        zoneId: zone.id,
        severity: 'warning',
        riskScore: zone.riskScore,
        message: `Risk elevated — density rising at ${zone.density} ppl/m²`,
        action: 'Monitor closely and prepare diversion routes',
        timestamp: Date.now(),
      });
    }
    // Panic spike
    if (zone.panicLevel > 50 && prev.panicLevel <= 50) {
      alerts.push({
        id: `sim-${Date.now()}-${zone.id}-panic`,
        zone: zone.name,
        zoneId: zone.id,
        severity: 'critical',
        riskScore: zone.riskScore,
        message: `Panic spike detected — audio level at ${zone.panicLevel}%`,
        action: 'Open all emergency exits. Deploy calming announcements',
        timestamp: Date.now(),
      });
    }
  });

  return alerts;
}

/**
 * Interpolate between two values smoothly
 */
export function lerp(current, target, factor = 0.15) {
  return current + (target - current) * factor;
}
