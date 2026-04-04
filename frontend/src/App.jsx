// ═══════════════════════════════════════════════════════
// CrowdShield — App Shell
// Layout with Sidebar + TopBar + page content
// ═══════════════════════════════════════════════════════

import { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import DashboardPage from './components/dashboard/DashboardPage';
import MapViewPage from './components/map/MapViewPage';
import AnalyticsPage from './components/analytics/AnalyticsPage';
import AlertsPage from './components/alerts/AlertsPage';
import SimulationPage from './components/simulation/SimulationPage';
import { useSimulation } from './hooks/useSimulation';
import { useRealTimeData } from './hooks/useRealTimeData';

const PAGE_TITLES = {
  dashboard: 'Command Center',
  map: 'Zone Map',
  analytics: 'Analytics',
  alerts: 'Alert Management',
  simulation: 'Simulation Lab',
};

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { isConnected } = useRealTimeData();

  const sim = useSimulation();
  const criticalCount = sim.alerts.filter(a => a.severity === 'critical').length;

  function renderPage() {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage zones={sim.zones} alerts={sim.alerts} kpis={sim.kpis} />;
      case 'map':
        return <MapViewPage zones={sim.zones} />;
      case 'analytics':
        return <AnalyticsPage zones={sim.zones} />;
      case 'alerts':
        return <AlertsPage alerts={sim.alerts} zones={sim.zones} />;
      case 'simulation':
        return (
          <SimulationPage
            zones={sim.zones}
            alerts={sim.alerts}
            params={sim.params}
            updateParam={sim.updateParam}
            isRunning={sim.isRunning}
            setIsRunning={sim.setIsRunning}
            speed={sim.speed}
            setSpeed={sim.setSpeed}
            simTime={sim.simTime}
            resetSimulation={sim.resetSimulation}
            kpis={sim.kpis}
          />
        );
      default:
        return <DashboardPage zones={sim.zones} alerts={sim.alerts} kpis={sim.kpis} />;
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
          // Auto-enter simulation mode when going to simulation page
          if (page === 'simulation' && sim.mode !== 'simulation') sim.toggleMode();
          // Auto-exit simulation mode when leaving simulation page
          if (page !== 'simulation' && sim.mode === 'simulation') sim.toggleMode();
        }}
        isConnected={isConnected}
        alertCount={criticalCount}
      />

      {/* Main Content Area */}
      <div className="ml-[68px] lg:ml-[220px] transition-all duration-300">
        <TopBar
          pageTitle={PAGE_TITLES[currentPage] || 'Dashboard'}
          mode={sim.mode}
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
