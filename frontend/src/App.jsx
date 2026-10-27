// ═══════════════════════════════════════════════════════
// SENPAY: TeleSol Sentinel + PayPilot 2.0
// Unified Autonomous Telecom Procurement & Payment Console
// ═══════════════════════════════════════════════════════

import { useState, useEffect } from 'react';

// ── Authentication System ──
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/auth/LoginPage';

// ── SENPAY Reference UI Components ──
import ActiveCommandCenter from './components/command/ActiveCommandCenter';
import PaymentOperationsPage from './components/paypilot/PaymentOperationsPage';
import SenPayLandingPage from './components/landing/SenPayLandingPage';
import SenPayTopBar from './components/layout/SenPayTopBar';
import SenPaySidebar from './components/layout/SenPaySidebar';
import SystemStatusBar from './components/layout/SystemStatusBar';

// ── Sentinel & PayPilot Core Pages (Fully Preserved) ──
import DashboardPage from './components/dashboard/DashboardPage';
import MapViewPage from './components/map/MapViewPage';
import AnalyticsPage from './components/analytics/AnalyticsPage';
import AlertsPage from './components/alerts/AlertsPage';
import SimulationPage from './components/simulation/SimulationPage';
import SensorDashboardPage from './components/sensors/SensorDashboardPage';
import PayPilotDashboard from './components/paypilot/PayPilotDashboard';
import DiscoveryPage from './components/paypilot/DiscoveryPage';
import AgentsPage from './components/paypilot/AgentsPage';
import CreatePaymentPage from './components/paypilot/CreatePaymentPage';
import MandatePolicyPage from './components/paypilot/MandatePolicyPage';
import TransactionsPage from './components/paypilot/TransactionsPage';
import AiAgentWorkflowPage from './components/paypilot/AiAgentWorkflowPage';
import AuditTrailPage from './components/paypilot/AuditTrailPage';
import WalletExecutionModal from './components/paypilot/WalletExecutionModal';
import ServiceAgreementsPage from './components/paypilot/ServiceAgreementsPage';
import SafetySimulatorView from './components/paypilot/SafetySimulatorView';
import DelegationsPage from './components/paypilot/DelegationsPage';
import EvidenceBundlesPage from './components/paypilot/EvidenceBundlesPage';
import DisputesPage from './components/paypilot/DisputesPage';

// Hooks
import { useSimulation } from './hooks/useSimulation';
import { useRealTimeData } from './hooks/useRealTimeData';
import { useWeb3Wallet } from './hooks/useWeb3Wallet';
import { controlSentinel, triggerTinyFishInvestigation } from './data/api';

function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const getInitialPage = () => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '').trim();
      if (hash) return hash;
      const params = new URLSearchParams(window.location.search);
      const pageParam = params.get('page');
      if (pageParam) return pageParam;
      const path = window.location.pathname.replace(/^\//, '').trim();
      if (path && path !== 'index.html') return path;
    }
    return 'command_center';
  };

  const [currentPage, setCurrentPageRaw] = useState(getInitialPage);

  const setCurrentPage = (page) => {
    setCurrentPageRaw(page);
    if (typeof window !== 'undefined' && window.location.hash !== `#${page}`) {
      window.location.hash = `#${page}`;
    }
  };

  // Sync with browser back/forward and hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').trim();
      if (hash) setCurrentPageRaw(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  const [collapsed, setCollapsed] = useState(false);
  const [prefilledProvider, setPrefilledProvider] = useState(null);
  const [activeMandateForSigning, setActiveMandateForSigning] = useState(null);

  const realtime = useRealTimeData();
  const sim = useSimulation();
  const wallet = useWeb3Wallet();

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
    if (realtime.isConnected) {
      await controlSentinel(params);
    }
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

  const handleSelectProviderForPayment = (provider) => {
    setPrefilledProvider(provider);
    setCurrentPage('create_payment');
  };

  const handleMandateCreated = (result) => {
    if (result.requires_wallet_authorization) {
      setActiveMandateForSigning({
        mandate_id: result.mandate_id,
        amount: result.policy_decision?.rules?.find((r) => r.rule === 'max_amount_per_tx')?.requested || 12.5,
        asset: 'HSK',
        network_id: 133,
        recipient_address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        purpose: 'Autonomous Telecom Slice Payment',
      });
    }
  };

  // ── Render Landing Page Standalone ──
  if (currentPage === 'landing') {
    return (
      <SenPayLandingPage
        onLaunchConsole={(page) => {
          if (!isAuthenticated) {
            setCurrentPage('login');
          } else {
            setCurrentPage(page || 'command_center');
          }
        }}
      />
    );
  }

  // ── Loading Session Screen ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B1118] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-xs text-slate-400">Verifying Operator Session...</span>
        </div>
      </div>
    );
  }

  // ── Render Login Screen Standalone ──
  if (currentPage === 'login') {
    if (isAuthenticated) {
      setCurrentPage('command_center');
      return null;
    }
    return (
      <LoginPage
        onLoginSuccess={() => setCurrentPage('command_center')}
        onNavigateLanding={() => setCurrentPage('landing')}
      />
    );
  }

  // ── Protected Route Guard: If unauthenticated, redirect to Login ──
  if (!isAuthenticated) {
    return (
      <LoginPage
        onLoginSuccess={() => setCurrentPage(currentPage === 'login' ? 'command_center' : currentPage)}
        onNavigateLanding={() => setCurrentPage('landing')}
      />
    );
  }

  // ── Render Application Console Routes ──
  const renderCurrentView = () => {
    switch (currentPage) {
      // ── Reference Screen 1: Active Command Center ──
      case 'command_center':
      case 'paypilot_dashboard':
      case 'sentinel_dashboard':
        return (
          <ActiveCommandCenter
            onNavigate={setCurrentPage}
            onSelectMandateForSigning={setActiveMandateForSigning}
            wallet={wallet}
          />
        );

      // ── Reference Screen 2: Payment Operations & Settlement ──
      case 'operations':
      case 'transactions':
        return (
          <PaymentOperationsPage
            onNavigate={setCurrentPage}
            onOpenDispute={() => setCurrentPage('disputes')}
            onViewProof={() => setCurrentPage('evidence')}
          />
        );

      // ── Group: OVERVIEW ──
      case 'incident_monitor':
      case 'alerts':
        return <AlertsPage alerts={activeAlerts} zones={activeZones} />;

      // ── Group: INTELLIGENCE ──
      case 'digital_twin':
      case 'map':
        return <MapViewPage zones={activeZones} isLive={realtime.isConnected} />;

      case 'optimizer':
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

      case 'counterfactual':
      case 'analytics':
        return <AnalyticsPage zones={activeZones} />;

      case 'sensors':
        return <SensorDashboardPage />;

      // ── Group: PROCUREMENT ──
      case 'agreements':
        return (
          <ServiceAgreementsPage
            onNavigate={setCurrentPage}
            onSelectAgreementForMandate={(agr) => {
              setPrefilledProvider({
                id: agr.provider_id,
                name: agr.provider_name || agr.provider_id,
                category: agr.service_category || agr.service_type || 'TELECOM_BANDWIDTH',
                unit_price: agr.agreed_price || agr.price_amount,
                asset: agr.asset || agr.currency || 'HSK',
                payment_address: agr.provider_address || '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
                agreement_id: agr.agreement_id || agr.id,
                agreement_hash: agr.agreement_hash,
                delegation_id: agr.delegation_id
              });
              setCurrentPage('create_payment');
            }}
          />
        );

      case 'providers':
      case 'discovery':
        return (
          <DiscoveryPage
            onSelectProviderForPayment={handleSelectProviderForPayment}
          />
        );

      case 'delegations':
        return <DelegationsPage />;

      // ── Group: PAYMENTS & TRUST ──
      case 'safety':
      case 'simulator':
        return (
          <SafetySimulatorView
            onNavigate={setCurrentPage}
            onAuthorizeMandate={setActiveMandateForSigning}
          />
        );

      case 'evidence':
      case 'evidence_bundles':
        return <EvidenceBundlesPage />;

      case 'disputes':
        return <DisputesPage />;

      case 'trust':
        return (
          <DiscoveryPage
            onSelectProviderForPayment={handleSelectProviderForPayment}
          />
        );

      // ── Group: GOVERNANCE ──
      case 'policies':
      case 'mandates':
        return (
          <MandatePolicyPage
            onSelectMandateToExecute={setActiveMandateForSigning}
            onNavigate={setCurrentPage}
          />
        );

      case 'audit':
        return <AuditTrailPage />;

      case 'wallet':
      case 'agents':
        return <AgentsPage />;

      case 'create_payment':
        return (
          <CreatePaymentPage
            prefilledProvider={prefilledProvider}
            onMandateCreated={handleMandateCreated}
            onNavigate={setCurrentPage}
          />
        );

      case 'ai_workflow':
        return (
          <AiAgentWorkflowPage
            onSelectMandateToExecute={setActiveMandateForSigning}
          />
        );

      default:
        return (
          <ActiveCommandCenter
            onNavigate={setCurrentPage}
            onSelectMandateForSigning={setActiveMandateForSigning}
            wallet={wallet}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1118] text-[#F1F5F9] font-sans antialiased">
      {/* ── SENPAY TopBar ── */}
      <SenPayTopBar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        mode={sim.mode}
        onToggleMode={sim.toggleMode}
        wallet={wallet}
        alertCount={criticalCount}
      />

      {/* ── SENPAY Grouped Sidebar ── */}
      <SenPaySidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* ── Main Workspace Area ── */}
      <div
        className={`
          pt-4 pb-12 px-4 lg:px-6
          transition-all duration-300
          ${collapsed ? 'ml-16' : 'ml-56 lg:ml-60'}
        `}
      >
        <main className="relative z-10 max-w-[1680px] mx-auto">
          {renderCurrentView()}
        </main>
      </div>

      {/* ── Pinned Bottom System Status Bar ── */}
      <SystemStatusBar
        isConnected={realtime.isConnected}
        onOpenLogs={() => setCurrentPage('audit')}
      />

      {/* ── Wallet Authorization Modal ── */}
      {activeMandateForSigning && (
        <WalletExecutionModal
          mandate={activeMandateForSigning}
          wallet={wallet}
          onClose={() => setActiveMandateForSigning(null)}
          onSettled={() => {
            setCurrentPage('operations');
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
