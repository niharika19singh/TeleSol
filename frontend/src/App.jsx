// ═══════════════════════════════════════════════════════
// TeleSol Unified App Shell — Version 2.0
// TeleSol Sentinel (IoT Telecom Intelligence) +
// TeleSol PayPilot 2.0 (Trust-Aware Autonomous Payments on HSK Chain)
// ═══════════════════════════════════════════════════════

import { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';

// ── Sentinel Pages (Preserved) ──
import DashboardPage from './components/dashboard/DashboardPage';
import MapViewPage from './components/map/MapViewPage';
import AnalyticsPage from './components/analytics/AnalyticsPage';
import AlertsPage from './components/alerts/AlertsPage';
import SimulationPage from './components/simulation/SimulationPage';
import SensorDashboardPage from './components/sensors/SensorDashboardPage';

// ── PayPilot 2.0 Pages ──
import PayPilotDashboard from './components/paypilot/PayPilotDashboard';
import DiscoveryPage from './components/paypilot/DiscoveryPage';
import AgentsPage from './components/paypilot/AgentsPage';
import CreatePaymentPage from './components/paypilot/CreatePaymentPage';
import MandatePolicyPage from './components/paypilot/MandatePolicyPage';
import TransactionsPage from './components/paypilot/TransactionsPage';
import AiAgentWorkflowPage from './components/paypilot/AiAgentWorkflowPage';
import AuditTrailPage from './components/paypilot/AuditTrailPage';
import WalletExecutionModal from './components/paypilot/WalletExecutionModal';

// ── PayPilot 2.0 Innovations ──
import ServiceAgreementsPage from './components/paypilot/ServiceAgreementsPage';
import SafetySimulatorView from './components/paypilot/SafetySimulatorView';
import DelegationsPage from './components/paypilot/DelegationsPage';
import EvidenceBundlesPage from './components/paypilot/EvidenceBundlesPage';
import DisputesPage from './components/paypilot/DisputesPage';
import SentinelBridgeBanner from './components/paypilot/SentinelBridgeBanner';

// Hooks
import { useSimulation } from './hooks/useSimulation';
import { useRealTimeData } from './hooks/useRealTimeData';
import { useWeb3Wallet } from './hooks/useWeb3Wallet';
import { controlSentinel, triggerTinyFishInvestigation } from './data/api';

const PAGE_TITLES = {
  // PayPilot Pages
  paypilot_dashboard: 'PayPilot Overview',
  discovery: 'Service & Provider Discovery',
  agreements: 'Service Agreements (RFC 8785)',
  mandates: 'Mandates & Policies',
  simulator: 'Pre-Execution Safety Simulator',
  delegations: 'Agent Delegations & Budgets',
  evidence_bundles: 'Evidence Bundles & 8-Point Verification',
  disputes: 'Payment Incidents & Safe Recovery',
  transactions: 'Transaction Ledger & Receipts',
  agents: 'Agent Identity & Roles',
  create_payment: 'New Payment Mandate',
  ai_workflow: 'AI Conversational Agent',
  audit: 'Cryptographic Audit Trail',

  // Sentinel Pages
  sentinel_dashboard: 'Sentinel Command Center',
  sensors: 'Hardware & Sensor Feed',
  map: 'Venue Zone Map',
  analytics: 'Crowd & Telecom Analytics',
  alerts: 'Incident & Alert Management',
  simulation: 'Simulation Lab',
};

export default function App() {
  const [activeProduct, setActiveProduct] = useState('paypilot'); // 'paypilot' | 'sentinel'
  const [currentPage, setCurrentPage] = useState('paypilot_dashboard');
  const [prefilledProvider, setPrefilledProvider] = useState(null);
  const [activeMandateForSigning, setActiveMandateForSigning] = useState(null);

  const realtime = useRealTimeData();
  const sim = useSimulation();
  const wallet = useWeb3Wallet();

  // Sentinel Active Zones & Alerts
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

  const handleSwitchProduct = (product) => {
    setActiveProduct(product);
    if (product === 'paypilot') {
      setCurrentPage('paypilot_dashboard');
    } else {
      setCurrentPage('sentinel_dashboard');
    }
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

  function renderPage() {
    // ── PayPilot Navigation ──
    if (activeProduct === 'paypilot') {
      switch (currentPage) {
        case 'paypilot_dashboard':
          return (
            <PayPilotDashboard
              onNavigate={setCurrentPage}
              onSelectMandateToExecute={setActiveMandateForSigning}
              wallet={wallet}
            />
          );
        case 'discovery':
          return (
            <DiscoveryPage
              onSelectProviderForPayment={handleSelectProviderForPayment}
            />
          );
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
        case 'mandates':
          return (
            <MandatePolicyPage
              onSelectMandateToExecute={setActiveMandateForSigning}
              onNavigate={setCurrentPage}
            />
          );
        case 'simulator':
          return (
            <SafetySimulatorView
              onNavigate={setCurrentPage}
              onAuthorizeMandate={setActiveMandateForSigning}
            />
          );
        case 'delegations':
          return <DelegationsPage />;
        case 'evidence_bundles':
          return <EvidenceBundlesPage />;
        case 'disputes':
          return <DisputesPage />;
        case 'transactions':
          return <TransactionsPage />;
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
        case 'audit':
          return <AuditTrailPage />;
        default:
          return (
            <PayPilotDashboard
              onNavigate={setCurrentPage}
              onSelectMandateToExecute={setActiveMandateForSigning}
              wallet={wallet}
            />
          );
      }
    }

    // ── Sentinel Navigation (Preserved) ──
    switch (currentPage) {
      case 'sentinel_dashboard':
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
      {/* Ambient background glow */}
      <div className="ambient-bg" />

      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        activeProduct={activeProduct}
        onSwitchProduct={handleSwitchProduct}
        isConnected={realtime.isConnected}
        alertCount={criticalCount}
      />

      {/* Main Workspace Area */}
      <div className="ml-[68px] lg:ml-[230px] transition-all duration-300">
        <TopBar
          pageTitle={PAGE_TITLES[currentPage] || 'TeleSol PayPilot'}
          activeProduct={activeProduct}
          mode={sim.mode}
          scenario={realtime.sentinel?.scenario || 'normal'}
          tinyfish={realtime.tinyfish}
          wallet={wallet}
          onToggleMode={() => {
            sim.toggleMode();
            if (sim.mode === 'live') setCurrentPage('simulation');
          }}
        />

        <main className="p-4 lg:p-6 relative z-10 space-y-5">
          {/* Real-time Sentinel Congestion Alert Banner (1-Click PayPilot Mitigation) */}
          <SentinelBridgeBanner
            zones={activeZones}
            onNavigate={setCurrentPage}
            onSelectMandateForSigning={setActiveMandateForSigning}
          />

          {renderPage()}
        </main>
      </div>

      {/* Wallet Execution Modal */}
      {activeMandateForSigning && (
        <WalletExecutionModal
          mandate={activeMandateForSigning}
          wallet={wallet}
          onClose={() => setActiveMandateForSigning(null)}
          onSettled={() => {
            // Can reload or navigate
          }}
        />
      )}
    </div>
  );
}
