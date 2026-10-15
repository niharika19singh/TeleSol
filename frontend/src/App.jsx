// ═══════════════════════════════════════════════════════
// TeleSol Sentinel — App Shell
// Hardware-free predictive telecom & crowd congestion intelligence
// ═══════════════════════════════════════════════════════

import { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import DashboardPage from './components/dashboard/DashboardPage';
import MapViewPage from './components/map/MapViewPage';
import AnalyticsPage from './components/analytics/AnalyticsPage';
import AlertsPage from './components/alerts/AlertsPage';
import SimulationPage from './components/simulation/SimulationPage';
import SensorDashboardPage from './components/sensors/SensorDashboardPage';
import { useSimulation } from './hooks/useSimulation';
import { useRealTimeData } from './hooks/useRealTimeData';
import { controlSentinel, triggerTinyFishInvestigation } from './data/api';

const PAGE_TITLES = {
  dashboard: 'Command Center',
  sensors: 'Hardware & Sensor Feed',
  map: 'Venue Zone Map',
  analytics: 'Crowd & Telecom Analytics',
  alerts: 'Incident & Alert Management',
  simulation: 'Simulation Lab',
};

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const realtime = useRealTimeData();
  const sim = useSimulation();

  // Prefer live backend streaming sentinel zones and alerts, with client simulation fallback
  const activeZones = realtime.zones && realtime.zones.length > 0 ? realtime.zones : sim.zones;
  const activeAlerts = realtime.alerts && realtime.alerts.length > 0 ? realtime.alerts : sim.alerts;

  const criticalCount = activeAlerts.filter(
    (a) => a.severity === 'critical' || a.severity === 'danger'
  ).length;

  const activeKpis = {
    activeZones: activeZones.length,
    avgRiskScore: Math.round(
      activeZones.reduce((s, z) => s + (z.riskScore || 0), 0) / Math.max(1, activeZones.length)
    ),
    highRiskAlerts: criticalCount,
    peakDensity: Math.max(...activeZones.map((z) => z.density || 0), 0),
  };

  const handleControlSentinel = async (params) => {
    // If backend is connected, control backend sentinel
    if (realtime.isConnected) {
      await controlSentinel(params);
    }
    // Also mirror to client simulation if scenario changed
    if (params.scenario) {
      if (params.scenario === 'normal') {
        sim.updateParam('crowdDensity', 2.2);
        sim.updateParam('entryRate', 80);
        sim.updateParam('exitBlockage', 0);
      } else if (params.scenario === 'congestion') {
        sim.updateParam('crowdDensity', 5.5);
        sim.updateParam('entryRate', 240);
        sim.updateParam('exitBlockage', 20);
      } else if (params.scenario === 'sudden_surge') {
        sim.updateParam('crowdDensity', 7.8);
        sim.updateParam('entryRate', 420);
        sim.updateParam('exitBlockage', 35);
      } else if (params.scenario === 'blocked_exit') {
        sim.updateParam('crowdDensity', 8.6);
        sim.updateParam('entryRate', 300);
        sim.updateParam('exitBlockage', 85);
      }
    }
    if (params.action === 'start') sim.setIsRunning(true);
    if (params.action === 'pause') sim.setIsRunning(false);
    if (params.action === 'reset') sim.resetSimulation();
  };

  const handleTriggerTinyFish = async (zoneId, reason) => {
    return await triggerTinyFishInvestigation(zoneId, reason);
  };

  function renderPage() {
    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardPage
            zones={activeZones}
            alerts={activeAlerts}
            kpis={activeKpis}
            sentinel={realtime.sentinel}
            aiForecast={realtime.aiForecast}
            tinyfish={realtime.tinyfish}
            timeline={realtime.timeline}
            onControlSentinel={handleControlSentinel}
            onTriggerTinyFish={handleTriggerTinyFish}
          />
        );
      case 'sensors':
        return <SensorDashboardPage />;
      case 'map':
        return <MapViewPage zones={activeZones} />;
      case 'analytics':
        return <AnalyticsPage zones={activeZones} />;
      case 'alerts':
        return <AlertsPage alerts={activeAlerts} zones={activeZones} />;
      case 'simulation':
        return (
          <SimulationPage
            zones={activeZones}
            alerts={activeAlerts}
            params={sim.params}
            updateParam={sim.updateParam}
            isRunning={sim.isRunning}
            setIsRunning={sim.setIsRunning}
            speed={sim.speed}
            setSpeed={sim.setSpeed}
            simTime={sim.simTime}
            resetSimulation={sim.resetSimulation}
            kpis={activeKpis}
          />
        );
      default:
        return (
          <DashboardPage
            zones={activeZones}
            alerts={activeAlerts}
            kpis={activeKpis}
            sentinel={realtime.sentinel}
            aiForecast={realtime.aiForecast}
            tinyfish={realtime.tinyfish}
            timeline={realtime.timeline}
            onControlSentinel={handleControlSentinel}
            onTriggerTinyFish={handleTriggerTinyFish}
          />
        );
    }
  }

  return (
    <div className="min-h-screen bg-crowd-bg text-crowd-text-primary">
      {/* Ambient glow */}
      <div className="ambient-bg" />

      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={(page) => {
          setCurrentPage(page);
          if (page === 'simulation' && sim.mode !== 'simulation') sim.toggleMode();
          if (page !== 'simulation' && sim.mode === 'simulation') sim.toggleMode();
        }}
        isConnected={realtime.isConnected}
        alertCount={criticalCount}
      />

      {/* Main Content Area */}
      <div className="ml-[68px] lg:ml-[220px] transition-all duration-300">
        <TopBar
          pageTitle={PAGE_TITLES[currentPage] || 'Dashboard'}
          mode={sim.mode}
          scenario={realtime.sentinel?.scenario || 'normal'}
          tinyfish={realtime.tinyfish}
          onToggleMode={() => {
            sim.toggleMode();
            if (sim.mode === 'live') setCurrentPage('simulation');
          }}
        />

        <main className="p-4 lg:p-5 relative z-10">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
