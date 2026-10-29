// ═══════════════════════════════════════════════════════
// SENPAY: TeleSol Sentinel + PayPilot 2.0
// Unified Autonomous Telecom Procurement & Payment Console
// ═══════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';

// ── Authentication & Session System ──
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import VerifyEmailPage from './components/auth/VerifyEmailPage';
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';
import ResetPasswordPage from './components/auth/ResetPasswordPage';
import UnauthorizedPage from './components/auth/UnauthorizedPage';
import PlatformAdminPage from './components/admin/PlatformAdminPage';

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

// Hooks & Data
import { useSimulation } from './hooks/useSimulation';
import { useRealTimeData } from './hooks/useRealTimeData';
import { useWeb3Wallet } from './hooks/useWeb3Wallet';
import { controlSentinel, triggerTinyFishInvestigation } from './data/api';
import { DEMO_SESSION_MESSAGE, DATA_SOURCE_LABELS } from './data/demoFixtures';

function AppContent() {
  const {
    user,
    isAuthenticated,
    isDemoMode,
    sessionMode,
    enterDemoMode,
    exitDemoMode,
    isLoading,
  } = useAuth();

  const normalizeRoute = useCallback((val) => {
    if (!val) return '';
    const clean = val.toLowerCase().replace(/^[/#]+/, '').trim();
    if (clean === 'sign-in' || clean === 'signin') return 'login';
    if (clean === 'register' || clean === 'sign-up') return 'signup';
    if (clean === 'home') return 'landing';
    return clean;
  }, []);

  const getInitialPage = () => {
    if (typeof window !== 'undefined') {
      const hash = normalizeRoute(window.location.hash);
      if (hash) {
        if (hash === 'demo') return 'demo';
        return hash;
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === 'true') return 'demo';
      const pageParam = normalizeRoute(params.get('page'));
      if (pageParam) return pageParam;
      const path = normalizeRoute(window.location.pathname);
      if (path && path !== 'index.html') return path;
    }
    // Default homepage is the public SENPAY landing page
    return 'landing';
  };

  const [currentPage, setCurrentPageRaw] = useState(getInitialPage);

  const setCurrentPage = useCallback((page) => {
    const rawTarget = (page || 'landing').toLowerCase().replace(/^[/#]+/, '').trim();
    const normalized = normalizeRoute(rawTarget) || 'landing';
    setCurrentPageRaw(normalized);

    if (typeof window !== 'undefined') {
      const desiredHash = rawTarget === 'home' ? '#home' : `#${rawTarget || 'home'}`;
      if (window.location.hash !== desiredHash) {
        window.location.hash = desiredHash;
      }
    }
  }, [normalizeRoute]);

  // Sync with browser back/forward and hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const rawHash = window.location.hash;
      const normalized = normalizeRoute(rawHash);
      if (!normalized) {
        setCurrentPageRaw('landing');
      } else {
        setCurrentPageRaw(normalized);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [normalizeRoute]);

  // Automatically activate explicit demo session when visiting #demo, #command_center, or any operational subroute unauthenticated
  useEffect(() => {
    const isAuthPage =
      currentPage === 'landing' ||
      currentPage === 'login' ||
      currentPage === 'signup' ||
      currentPage === 'forgot-password' ||
      currentPage.startsWith('verify-email') ||
      currentPage.startsWith('reset-password') ||
      currentPage === 'unauthorized';

    if (!isAuthPage && !isAuthenticated) {
      enterDemoMode();
    }
  }, [currentPage, isAuthenticated, enterDemoMode]);

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

  const handleLaunchDemo = (targetPage = 'demo') => {
    enterDemoMode();
    setCurrentPage(targetPage);
  };

  const handleReturnToLanding = () => {
    exitDemoMode();
    setCurrentPage('home');
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
        is_demo: !isAuthenticated,
      });
    }
  };

  // ── 1. Render Public SENPAY Landing Page (Default Homepage: `/`, `/#home`, `/#landing`) ──
  if (currentPage === 'landing' || currentPage === 'home' || !currentPage) {
    return (
      <SenPayLandingPage
        onLaunchConsole={(page) => {
          handleLaunchDemo(page || 'demo');
        }}
      />
    );
  }

  // ── Loading Session Screen (only when verifying an existing real auth token) ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B1118] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-xs text-slate-400">Initializing SENPAY Workspace...</span>
        </div>
      </div>
    );
  }

  // ── Render Optional Auth Screens Standalone (Never blocking public demo routes) ──
  if (currentPage === 'signup' || currentPage === 'register') {
    if (isAuthenticated) {
      setCurrentPage('command_center');
      return null;
    }
    return (
      <SignupPage
        onNavigateLogin={() => setCurrentPage('login')}
        onNavigateLanding={handleReturnToLanding}
      />
    );
  }

  if (currentPage === 'verify-email' || currentPage.startsWith('verify-email')) {
    return (
      <VerifyEmailPage
        onNavigateLogin={() => setCurrentPage('login')}
        onNavigateLanding={handleReturnToLanding}
      />
    );
  }

  if (currentPage === 'forgot-password') {
    return (
      <ForgotPasswordPage
        onNavigateLogin={() => setCurrentPage('login')}
        onNavigateLanding={handleReturnToLanding}
      />
    );
  }

  if (currentPage === 'reset-password' || currentPage.startsWith('reset-password')) {
    return (
      <ResetPasswordPage
        onNavigateLogin={() => setCurrentPage('login')}
        onNavigateLanding={handleReturnToLanding}
      />
    );
  }

  if (currentPage === 'unauthorized') {
    return (
      <UnauthorizedPage
        onNavigateDashboard={() => handleLaunchDemo('command_center')}
        onNavigateLogin={() => setCurrentPage('login')}
      />
    );
  }

  if (currentPage === 'login') {
    if (isAuthenticated) {
      setCurrentPage('command_center');
      return null;
    }
    return (
      <LoginPage
        onLoginSuccess={() => setCurrentPage('command_center')}
        onLaunchDemo={() => handleLaunchDemo('demo')}
        onNavigateLanding={handleReturnToLanding}
        onNavigateSignup={() => setCurrentPage('signup')}
        onNavigateForgotPassword={() => setCurrentPage('forgot-password')}
      />
    );
  }

  // ── Dedicated Platform Administration Console (Protected for real admins; demo visitors stay in Command Center) ──
  if ((currentPage === 'admin' || currentPage === 'platform_admin') && isAuthenticated) {
    return (
      <PlatformAdminPage
        onNavigateConsole={() => setCurrentPage('command_center')}
      />
    );
  }

  const effectiveNavPage = currentPage === 'demo' ? 'command_center' : currentPage;
  const activeDataSourceLabel = realtime.isConnected
    ? DATA_SOURCE_LABELS.LIVE_BACKEND
    : DATA_SOURCE_LABELS.SYNTHETIC_DEMO;

  // ── Render Application Console Routes (Accessible in Demo Mode and Authenticated Mode) ──
  const renderCurrentView = () => {
    switch (effectiveNavPage) {
      // ── Reference Screen 1: Active Command Center ──
      case 'command_center':
      case 'paypilot_dashboard':
      case 'sentinel_dashboard':
        return (
          <ActiveCommandCenter
            onNavigate={setCurrentPage}
            onSelectMandateForSigning={setActiveMandateForSigning}
            wallet={wallet}
            isDemoMode={!isAuthenticated}
            dataSourceLabel={activeDataSourceLabel}
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
            isDemoMode={!isAuthenticated}
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
            isDemoMode={!isAuthenticated}
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
        return <DelegationsPage isDemoMode={!isAuthenticated} />;

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
        return <DisputesPage isDemoMode={!isAuthenticated} />;

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
            isDemoMode={!isAuthenticated}
          />
        );

      case 'audit':
        return <AuditTrailPage />;

      case 'wallet':
      case 'agents':
        return <AgentsPage isDemoMode={!isAuthenticated} />;

      case 'create_payment':
        return (
          <CreatePaymentPage
            prefilledProvider={prefilledProvider}
            onMandateCreated={handleMandateCreated}
            onNavigate={setCurrentPage}
            isDemoMode={!isAuthenticated}
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
            isDemoMode={!isAuthenticated}
            dataSourceLabel={activeDataSourceLabel}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-senpay-bg text-senpay-text-primary font-sans antialiased transition-colors duration-150">
      {/* ── SENPAY TopBar ── */}
      <SenPayTopBar
        currentPage={effectiveNavPage}
        onNavigate={setCurrentPage}
        onNavigateHome={handleReturnToLanding}
        mode={sim.mode}
        onToggleMode={sim.toggleMode}
        wallet={wallet}
        alertCount={criticalCount}
      />

      {/* ── SENPAY Grouped Sidebar ── */}
      <SenPaySidebar
        currentPage={effectiveNavPage}
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
        <main className="relative z-10 max-w-[1680px] mx-auto space-y-3">
          {/* ── Persistent Visible Demo Mode Banner ── */}
          {!isAuthenticated && (
            <div
              role="status"
              aria-label="Interactive Demo Mode Active"
              data-testid="demo-mode-banner"
              className="rounded-xl bg-senpay-panel border border-senpay-amber/40 px-4 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2 text-xs shadow-sm"
            >
              <div className="flex items-start sm:items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-full bg-senpay-amber text-slate-950 text-[10px] font-black font-mono uppercase tracking-wider flex-shrink-0">
                  DEMO MODE
                </span>
                <span className="text-senpay-text-primary font-medium leading-snug">
                  {DEMO_SESSION_MESSAGE}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap flex-shrink-0 font-mono text-[10px]">
                <span className="px-2 py-0.5 rounded bg-senpay-card border border-senpay-border text-senpay-cyan">
                  Source: {activeDataSourceLabel}
                </span>
                <span className="px-2 py-0.5 rounded bg-senpay-card border border-senpay-border text-senpay-text-secondary">
                  Session: {sessionMode} (No Auth Required)
                </span>
                <button
                  onClick={handleReturnToLanding}
                  className="px-2.5 py-0.5 rounded bg-senpay-card hover:bg-senpay-elevated border border-senpay-border text-senpay-text-primary font-bold transition"
                >
                  &larr; Landing Page
                </button>
              </div>
            </div>
          )}

          {renderCurrentView()}
        </main>
      </div>

      {/* ── Pinned Bottom System Status Bar ── */}
      <SystemStatusBar
        isConnected={realtime.isConnected}
        onOpenLogs={() => setCurrentPage('audit')}
      />

      {/* ── Wallet Authorization / Safe Demo Simulation Modal ── */}
      {activeMandateForSigning && (
        <WalletExecutionModal
          mandate={activeMandateForSigning}
          wallet={wallet}
          isDemoMode={!isAuthenticated}
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
