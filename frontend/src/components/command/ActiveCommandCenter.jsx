// ═════════════════════════════════════════════════════════════════
// SENPAY — Active Network Operations Command Center (NOC)
// Professional Telecom Network Operations & Autonomous Procurement Interface
// Grounded in Network Topology, Financial Settlement, and Scientific Instrumentation
// ═════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  MoreVertical,
  CheckCircle2,
  Circle,
  Radio,
  Shield,
  ArrowRight,
  Zap,
  RefreshCw,
  Layers,
  Check,
  Cpu,
  Database,
  Activity,
  X,
  Sliders,
  BarChart3,
  ChevronRight,
  Clock,
  TrendingUp,
  Server,
  FileCheck2,
  Lock,
  ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine
} from 'recharts';
import NetworkTopologyCanvas from './NetworkTopologyCanvas';
import { fetchModelInfo, fetchDatasetCatalog, runModelInference } from '../../data/api';

// ── Realistic CRS Sparkline Trend with Threshold Annotation ──
const CRS_TREND_DATA = [
  { time: '18:30', crs: 42, threshold: 65 },
  { time: '18:35', crs: 48, threshold: 65 },
  { time: '18:40', crs: 56, threshold: 65 },
  { time: '18:45', crs: 64, threshold: 65 },
  { time: '18:50', crs: 74, threshold: 65 },
  { time: '18:55', crs: 78, threshold: 65 },
];

// ── Real 8-Stage Operational Workflow Definition ──
const WORKFLOW_STAGES = [
  {
    id: 'detect',
    label: 'DETECT',
    status: 'COMPLETED',
    timestamp: '18:41:10 UTC',
    summary: 'Virtual Sentinel probe detected CRS surge (78.0) exceeding 65.0 SLA threshold.',
    actor: 'Sentinel Daemon (UCC 5G Feed)'
  },
  {
    id: 'analyze',
    label: 'ANALYZE',
    status: 'COMPLETED',
    timestamp: '18:41:15 UTC',
    summary: 'Packet loss (14.2%) and RTT latency (142ms) localized to Gate C VIP corridor.',
    actor: 'ML Inference (RF-GB Model)'
  },
  {
    id: 'simulate',
    label: 'SIMULATE',
    status: 'COMPLETED',
    timestamp: '18:41:22 UTC',
    summary: 'Digital twin projected unmitigated CRS reaching 88.0 within 12 minutes.',
    actor: 'Digital Twin Engine'
  },
  {
    id: 'select',
    label: 'SELECT',
    status: 'COMPLETED',
    timestamp: '18:41:28 UTC',
    summary: 'Optimizer ranked 4 candidates; SkyLink Dynamic 5G Slicing selected (-50.8 CRS).',
    actor: 'Intervention Optimizer'
  },
  {
    id: 'authorize',
    label: 'AUTHORIZE',
    status: 'ACTIVE',
    timestamp: 'Pending Operator Signature',
    summary: 'Escrow mandate reserved (12.50 HSK). Awaiting authorized wallet execution.',
    actor: 'Delegation del_sentinel_001'
  },
  {
    id: 'procure',
    label: 'PROCURE',
    status: 'PENDING',
    timestamp: 'Queued',
    summary: 'HSP Gateway v2.3.0 will dispatch 5G dynamic slice provisioning on network 133.',
    actor: 'HSP Payment Adapter'
  },
  {
    id: 'verify',
    label: 'VERIFY',
    status: 'PENDING',
    timestamp: 'Queued',
    summary: 'Post-mitigation telemetry will measure CRS < 35.0 to validate SLA fulfillment.',
    actor: 'Counterfactual Evaluator'
  },
  {
    id: 'settle',
    label: 'SETTLE',
    status: 'PENDING',
    timestamp: 'Queued',
    summary: 'Cryptographic settlement receipt issued upon verified outcome proof.',
    actor: 'HashKey Testnet 133'
  }
];

// ── Multi-Vendor Intervention Comparison Dataset ──
const PROVIDER_COMPARISON_DATA = [
  {
    id: 'prov_skylink_5g',
    name: 'SkyLink Dynamic 5G Slicing',
    category: 'TELECOM_BANDWIDTH',
    availability: '99.9% Active',
    impact: '-50.8 CRS (-73%)',
    throughput: '+20 Gbps',
    cost: '12.50 HSK',
    decision: 'RECOMMENDED',
    decisionBadge: 'bg-[#35C7D9]/15 text-[#35C7D9] border-[#35C7D9]/40',
    isRecommended: true
  },
  {
    id: 'prov_edge_compute',
    name: 'Edge Compute Mesh Container',
    category: 'EDGE_COMPUTE',
    availability: '99.5% Active',
    impact: '-39.4 CRS (-50%)',
    throughput: '+8 Gbps',
    cost: '18.00 HSK',
    decision: 'ELIGIBLE',
    decisionBadge: 'bg-[#293746]/40 text-[#9AAABA] border-[#293746]',
    isRecommended: false
  },
  {
    id: 'prov_mmwave_radar',
    name: 'Spatial mmWave Radar Stream',
    category: 'SENSOR_DATA',
    availability: '98.9% Active',
    impact: '-24.8 CRS (-32%)',
    throughput: '+2 Gbps',
    cost: '8.00 HSK',
    decision: 'STANDBY',
    decisionBadge: 'bg-[#293746]/40 text-[#718297] border-[#293746]',
    isRecommended: false
  },
  {
    id: 'prov_transit_ai',
    name: 'Transit Feeder Dispersal AI',
    category: 'ROUTING_AI',
    availability: '97.8% Active',
    impact: '-37.2 CRS (-48%)',
    throughput: 'N/A (Routing)',
    cost: '22.00 HSK',
    decision: 'STANDBY',
    decisionBadge: 'bg-[#293746]/40 text-[#718297] border-[#293746]',
    isRecommended: false
  }
];

export default function ActiveCommandCenter({
  onNavigate,
  onSelectMandateForSigning,
  wallet,
}) {
  const [selectedTopologyNode, setSelectedTopologyNode] = useState('SEC-VIP-C1');
  const [selectedWorkflowStage, setSelectedWorkflowStage] = useState('authorize');

  // ML Intelligence & Provenance state
  const [mlModalOpen, setMlModalOpen] = useState(false);
  const [modelInfo, setModelInfo] = useState(null);
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [testRsrp, setTestRsrp] = useState(-105.0);
  const [testRsrq, setTestRsrq] = useState(-14.5);
  const [testSnr, setTestSnr] = useState(2.0);
  const [testDlBitrate, setTestDlBitrate] = useState(8500);
  const [testCqi, setTestCqi] = useState(8);
  const [predResult, setPredResult] = useState(null);
  const [predLoading, setPredLoading] = useState(false);

  useEffect(() => {
    async function loadMlData() {
      try {
        const [mInfo, dInfo] = await Promise.all([
          fetchModelInfo(),
          fetchDatasetCatalog()
        ]);
        if (mInfo) setModelInfo(mInfo);
        if (dInfo) setDatasetInfo(dInfo);
      } catch (err) {
        console.warn('[ML] Failed to load ML info:', err);
      }
    }
    loadMlData();
  }, []);

  const handleRunInference = async (e) => {
    if (e) e.preventDefault();
    setPredLoading(true);
    try {
      const res = await runModelInference({
        rsrp: Number(testRsrp),
        rsrq: Number(testRsrq),
        snr: Number(testSnr),
        cqi: Number(testCqi),
        dl_bitrate: Number(testDlBitrate),
      });
      setPredResult(res);
    } catch (err) {
      console.warn('[ML] Inference failed:', err);
    } finally {
      setPredLoading(false);
    }
  };

  const handleAuthorizeFunds = () => {
    if (onSelectMandateForSigning) {
      onSelectMandateForSigning({
        mandate_id: 'man_opt_west_8812',
        agreement_id: 'agr_seed_001',
        amount: 12.5,
        asset: 'HSK',
        network_id: 133,
        recipient_address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        purpose: 'Gate C VIP Corridor Congestion Mitigation (SkyLink 5G Slice)',
      });
    } else {
      onNavigate('operations');
    }
  };

  const activeStageObj = WORKFLOW_STAGES.find((s) => s.id === selectedWorkflowStage) || WORKFLOW_STAGES[4];

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-8 text-[#E6EDF3]">
      {/* ── 1. Concise Operational Incident Banner ── */}
      <div className="rounded-lg bg-[#111A23] border border-[#E8AD43]/50 p-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-[#E8AD43]/15 border border-[#E8AD43]/40 flex items-center justify-center text-[#E8AD43] flex-shrink-0">
            <AlertTriangle size={15} />
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-mono font-bold text-[#E8AD43] tracking-wider uppercase">
              INCIDENT #INC-2026-8812
            </span>
            <span className="text-[#718297]">&bull;</span>
            <span className="font-semibold text-[#E6EDF3]">
              Gate C — VIP Corridor Congestion Spike
            </span>
            <span className="text-[#718297]">&bull;</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#E45B64]/15 border border-[#E45B64]/40 text-[#E45B64] font-bold">
              CRITICAL (CRS 78.0)
            </span>
            <span className="text-[11px] font-mono text-[#9AAABA] hidden sm:inline">
              Loss: 14.2% &bull; RTT: 142ms
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMlModalOpen(true)}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#15212C] hover:bg-[#1A2937] text-[#39B980] border border-[#39B980]/40 text-[11px] font-mono font-bold transition"
            title="Inspect trained ML model metrics and run live inference"
          >
            <Cpu size={12} />
            <span>ML Model: 98.7% Acc (UCC 5G)</span>
          </button>
          <button
            onClick={() => onNavigate('incident_monitor')}
            className="px-2.5 py-1 rounded bg-[#15212C] hover:bg-[#1A2937] text-[#E8AD43] border border-[#E8AD43]/30 text-xs font-mono font-bold transition"
          >
            Inspect Telemetry
          </button>
        </div>
      </div>

      {/* ── 2. Primary Operations Row: Network Digital Twin (7 Cols) & Workflow/CRS (5 Cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ── Network Digital Twin (Left 7 Cols) ── */}
        <div className="lg:col-span-7 senpay-card p-3.5 flex flex-col justify-between overflow-hidden relative min-h-[440px]">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-[#293746]">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-[#35C7D9]" />
              <span className="text-xs font-mono font-bold text-[#E6EDF3] tracking-wider uppercase">
                NETWORK DIGITAL TWIN &bull; TOPOLOGY
              </span>
            </div>
            <div className="text-[11px] font-mono text-[#718297]">
              Transport Model: UCC 5G Commercial Trace
            </div>
          </div>

          {/* Embedded Precise Schematic Canvas */}
          <div className="flex-1 w-full my-2 min-h-[350px]">
            <NetworkTopologyCanvas
              selectedNodeId={selectedTopologyNode}
              onSelectNode={(nodeId) => setSelectedTopologyNode(nodeId)}
              showMitigation={true}
            />
          </div>
        </div>

        {/* ── Right Column: Operational Workflow & Congestion Risk Score (5 Cols) ── */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* ── OPERATIONAL WORKFLOW (Renamed from Playful Timeline) ── */}
          <div className="senpay-card p-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#293746] mb-3">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-[#E8AD43]" />
                <span className="text-xs font-mono font-bold text-[#E6EDF3] tracking-wider uppercase">
                  OPERATIONAL WORKFLOW
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E8AD43]/15 text-[#E8AD43] border border-[#E8AD43]/30 font-bold">
                STAGE 5: AUTHORIZE
              </span>
            </div>

            {/* Structured Horizontal Step Sequence */}
            <div className="relative pt-1 pb-2">
              {/* Connecting Background Line */}
              <div className="absolute top-4 left-3 right-3 h-0.5 bg-[#293746]" />

              {/* Step Circles */}
              <div className="relative flex justify-between items-center text-center">
                {WORKFLOW_STAGES.map((s, idx) => {
                  const isCompleted = s.status === 'COMPLETED';
                  const isActive = s.status === 'ACTIVE';
                  const isSelected = selectedWorkflowStage === s.id;

                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedWorkflowStage(s.id)}
                      className="group flex flex-col items-center focus:outline-none"
                      title={`${s.label}: ${s.status}`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-all z-10 ${
                          isCompleted
                            ? 'bg-[#111A23] border border-[#39B980] text-[#39B980]'
                            : isActive
                            ? 'bg-[#E8AD43] text-[#0B1117] ring-4 ring-[#E8AD43]/20 font-black'
                            : 'bg-[#111A23] border border-[#293746] text-[#718297]'
                        } ${isSelected ? 'ring-2 ring-[#35C7D9]' : ''}`}
                      >
                        {isCompleted ? <Check size={11} strokeWidth={3} /> : idx + 1}
                      </div>
                      <span
                        className={`text-[8.5px] font-mono mt-1.5 transition-colors ${
                          isActive
                            ? 'text-[#E8AD43] font-bold'
                            : isCompleted
                            ? 'text-[#39B980]'
                            : 'text-[#718297]'
                        }`}
                      >
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Selected Stage Technical Summary */}
            {activeStageObj && (
              <div className="mt-3 p-2.5 rounded bg-[#0B1117] border border-[#293746] text-xs font-mono">
                <div className="flex items-center justify-between pb-1 mb-1 border-b border-[#293746]/60">
                  <span className="font-bold text-[#E6EDF3] text-[11px]">
                    STAGE: {activeStageObj.label} &bull; {activeStageObj.status}
                  </span>
                  <span className="text-[10px] text-[#718297] flex items-center gap-1">
                    <Clock size={10} />
                    <span>{activeStageObj.timestamp}</span>
                  </span>
                </div>
                <p className="text-[11px] text-[#9AAABA] leading-relaxed">
                  {activeStageObj.summary}
                </p>
                <div className="pt-1 text-[10px] text-[#718297]">
                  Actor / Engine: <span className="text-[#35C7D9]">{activeStageObj.actor}</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Congestion Risk Score (CRS Operational Analytics Panel) ── */}
          <div className="senpay-card p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-[#293746]">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-[#E8AD43]" />
                <span className="text-xs font-mono font-bold text-[#E6EDF3] tracking-wider uppercase">
                  CONGESTION RISK SCORE (CRS)
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#718297]">
                Live &bull; Updated 12s ago
              </span>
            </div>

            {/* Numerical Score & Severity */}
            <div className="grid grid-cols-2 items-center gap-3 my-2.5">
              <div className="p-2.5 rounded bg-[#0B1117] border border-[#293746]">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-bold font-mono text-[#E6EDF3] tracking-tight">
                    78.0
                  </span>
                  <span className="text-sm font-mono text-[#718297]">/ 100</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#E45B64]/15 border border-[#E45B64]/40 text-[#E45B64]">
                    CRITICAL
                  </span>
                  <span className="text-[10px] font-mono text-[#E8AD43] font-semibold">
                    +14.0 pts / 15m
                  </span>
                </div>
              </div>

              {/* Restrained Historical Line Chart with Threshold */}
              <div className="h-20 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={CRS_TREND_DATA} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="crsLineFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E8AD43" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#E8AD43" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="time"
                      tick={{ fill: '#718297', fontSize: 9, fontFamily: 'monospace' }}
                      axisLine={{ stroke: '#293746' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 50, 100]}
                      tick={{ fill: '#718297', fontSize: 9, fontFamily: 'monospace' }}
                      axisLine={{ stroke: '#293746' }}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-[#111A23] border border-[#293746] p-1.5 rounded text-[10px] font-mono text-[#E6EDF3]">
                              <div>Time: {payload[0].payload.time}</div>
                              <div className="text-[#E8AD43] font-bold">CRS: {payload[0].value}</div>
                              <div className="text-[#E45B64]">SLA Target: &lt; 35.0</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine y={65} stroke="#E45B64" strokeDasharray="3 3" />
                    <Area
                      type="monotone"
                      dataKey="crs"
                      stroke="#E8AD43"
                      strokeWidth={1.8}
                      fillOpacity={1}
                      fill="url(#crsLineFill)"
                      dot={{ r: 2, fill: '#E8AD43' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Threshold & Source Annotation */}
            <div className="flex items-center justify-between pt-2 border-t border-[#293746]/60 text-[10px] font-mono text-[#718297]">
              <span>SLA Target: &lt; 35.0 CRS (Critical &gt; 65.0)</span>
              <button
                onClick={() => setMlModalOpen(true)}
                className="text-[#39B980] hover:underline flex items-center gap-1"
              >
                <span>ML Model Specs</span>
                <ChevronRight size={10} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Bottom Operations Grid: Incident Summary (4 Cols), Providers (5 Cols), Budget (3 Cols) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        {/* ── 1. Active Incident Summary (Col 1-4) ── */}
        <div className="lg:col-span-4 senpay-card p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#293746] mb-3">
              <span className="text-xs font-mono font-bold text-[#E6EDF3] tracking-wider uppercase">
                ACTIVE INCIDENT SPECIFICATIONS
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E45B64]/15 text-[#E45B64] border border-[#E45B64]/30 font-bold">
                INC-2026-8812
              </span>
            </div>

            {/* Structured Definition List */}
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-[#293746]/40">
                <span className="text-[#718297]">Severity Level:</span>
                <span className="text-[#E45B64] font-bold">CRITICAL (P1 SLA Risk)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#293746]/40">
                <span className="text-[#718297]">Current Status:</span>
                <span className="text-[#E8AD43] font-bold">AWAITING AUTHORIZATION</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#293746]/40">
                <span className="text-[#718297]">Affected Sector:</span>
                <span className="text-[#E6EDF3]">Gate C — VIP Corridor</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#293746]/40">
                <span className="text-[#718297]">Network Path:</span>
                <span className="text-[#9AAABA]">GW-CORE-01 &rarr; BS-WEST &rarr; SEC-C1</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#293746]/40">
                <span className="text-[#718297]">Detection Time:</span>
                <span className="text-[#E6EDF3]">18:41:10 UTC (14m elapsed)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#293746]/40">
                <span className="text-[#718297]">Active Telemetry:</span>
                <span className="text-[#E8AD43]">Loss: 14.2% &bull; RTT: 142ms</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#718297]">Recommended Action:</span>
                <span className="text-[#35C7D9] font-bold">SkyLink 5G Slice (12.50 HSK)</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#293746] flex gap-2">
            <button
              onClick={handleAuthorizeFunds}
              className="flex-1 py-2 px-3 rounded bg-[#35C7D9] hover:bg-[#2EB8CA] text-[#0B1117] font-mono font-bold text-xs tracking-wider uppercase transition text-center"
            >
              Authorize 12.50 HSK
            </button>
            <button
              onClick={() => onNavigate('incident_monitor')}
              className="py-2 px-3 rounded bg-[#15212C] hover:bg-[#1A2937] text-[#9AAABA] hover:text-[#E6EDF3] border border-[#293746] font-mono text-xs transition"
            >
              View Feed
            </button>
          </div>
        </div>

        {/* ── 2. Professional Provider Comparison Table (Col 5-9) ── */}
        <div className="lg:col-span-5 senpay-card p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#293746] mb-2.5">
              <span className="text-xs font-mono font-bold text-[#E6EDF3] tracking-wider uppercase">
                INTERVENTION PROVIDER COMPARISON
              </span>
              <span className="text-[10px] font-mono text-[#718297]">
                Ranked by Multi-Criteria Impact &amp; Cost
              </span>
            </div>

            {/* Decision Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-[10px] text-[#718297] uppercase border-b border-[#293746]">
                    <th className="pb-1.5 font-normal">Provider &bull; Service</th>
                    <th className="pb-1.5 font-normal">Availability</th>
                    <th className="pb-1.5 font-normal">Impact</th>
                    <th className="pb-1.5 font-normal">Est. Cost</th>
                    <th className="pb-1.5 font-normal text-right">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#293746]/40">
                  {PROVIDER_COMPARISON_DATA.map((prov) => (
                    <tr
                      key={prov.id}
                      className={`transition-colors ${
                        prov.isRecommended ? 'bg-[#15212C]/60 border-l-2 border-l-[#35C7D9]' : 'hover:bg-[#15212C]/30'
                      }`}
                    >
                      <td className="py-2.5 pl-1.5">
                        <div className="font-bold text-[#E6EDF3]">{prov.name}</div>
                        <div className="text-[9.5px] text-[#718297]">{prov.category}</div>
                      </td>
                      <td className="py-2.5 text-[#9AAABA]">
                        {prov.availability}
                      </td>
                      <td className="py-2.5">
                        <span className={`font-bold ${prov.isRecommended ? 'text-[#39B980]' : 'text-[#9AAABA]'}`}>
                          {prov.impact}
                        </span>
                      </td>
                      <td className="py-2.5 text-[#E6EDF3] font-mono font-semibold">
                        {prov.cost}
                      </td>
                      <td className="py-2.5 text-right pr-1.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${prov.decisionBadge}`}>
                          {prov.decision}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-2 border-t border-[#293746] text-[10px] font-mono text-[#718297] flex justify-between items-center">
            <span>Optimization Engine: Cost vs. SLA Tradeoff Matrix</span>
            <span className="text-[#35C7D9]">1 Candidate Recommended</span>
          </div>
        </div>

        {/* ── 3. Budget & Financial Allocation Tracker (Col 10-12) ── */}
        <div className="lg:col-span-3 senpay-card p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#293746] mb-3">
              <span className="text-xs font-mono font-bold text-[#E6EDF3] tracking-wider uppercase">
                BUDGET ALLOCATION
              </span>
              <span className="text-[10px] font-mono text-[#718297]">
                del_sentinel_001
              </span>
            </div>

            {/* Financial Numerical Metrics */}
            <div className="space-y-2 text-xs font-mono mb-3">
              <div className="flex justify-between py-1 border-b border-[#293746]/40">
                <span className="text-[#718297]">Total Delegated:</span>
                <span className="text-[#E6EDF3] font-bold">100.00 HSK</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#293746]/40">
                <span className="text-[#718297]">Reserved / Escrow:</span>
                <span className="text-[#E8AD43] font-bold">12.50 HSK</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#293746]/40">
                <span className="text-[#718297]">Available Balance:</span>
                <span className="text-[#39B980] font-bold">87.50 HSK</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#718297]">Settled to Date:</span>
                <span className="text-[#9AAABA]">0.00 HSK</span>
              </div>
            </div>

            {/* Disciplined Horizontal Allocation Stacked Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[10px] font-mono text-[#718297]">
                <span>12.5% Reserved (12.50 HSK)</span>
                <span>87.5% Available (87.50 HSK)</span>
              </div>
              <div className="h-2.5 w-full rounded bg-[#0B1117] border border-[#293746] overflow-hidden flex">
                <div
                  className="h-full bg-[#E8AD43]"
                  style={{ width: '12.5%' }}
                  title="Reserved for SkyLink 5G Slice: 12.50 HSK"
                />
                <div
                  className="h-full bg-[#15212C]"
                  style={{ width: '87.5%' }}
                  title="Available Unallocated Budget: 87.50 HSK"
                />
              </div>
            </div>

            {/* Policy Bound Check */}
            <div className="mt-3 p-2 rounded bg-[#0B1117] border border-[#293746] text-[10px] font-mono text-[#718297]">
              <div>Policy: <span className="text-[#E6EDF3]">pol_telecom_standard_01</span></div>
              <div className="text-[#39B980] mt-0.5">&bull; PASSED: Amount within 25.0 HSK/tx limit</div>
            </div>
          </div>

          {/* Review Authorization Action */}
          <div className="pt-3 border-t border-[#293746]">
            <button
              onClick={handleAuthorizeFunds}
              className="w-full py-2 px-3 rounded bg-[#35C7D9] hover:bg-[#2EB8CA] text-[#0B1117] font-mono font-bold text-xs tracking-wider uppercase transition flex items-center justify-center gap-1.5"
            >
              <span>Review Authorization</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── ML Intelligence & Dataset Provenance Modal (Preserved & Styled) ── */}
      {mlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-[#111A23] border border-[#293746] rounded-lg shadow-2xl overflow-hidden my-8 text-[#E6EDF3]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#293746] bg-[#0B1117]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-[#39B980]/15 border border-[#39B980]/30 flex items-center justify-center text-[#39B980]">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#E6EDF3] text-sm flex items-center gap-2">
                    SENPAY ML Architecture &amp; Data Provenance
                    <span className="text-[10px] font-mono bg-[#39B980]/15 text-[#39B980] border border-[#39B980]/30 px-2 py-0.5 rounded">
                      ACTIVE MODEL
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#718297] font-mono">
                    Model: SENPAY-5G-CRS-v1.0-RF-GB &bull; 96,028 Real Commercial 5G Traces
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMlModalOpen(false)}
                className="w-7 h-7 rounded bg-[#15212C] hover:bg-[#1A2937] flex items-center justify-center text-[#718297] hover:text-[#E6EDF3] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto font-mono">
              {/* Top Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-[#0B1117] rounded border border-[#293746]">
                  <span className="text-[10px] text-[#718297] block uppercase">3-Class Accuracy</span>
                  <span className="text-xl font-bold text-[#39B980]">98.7%</span>
                  <span className="text-[10px] text-[#718297] block">F1 Macro: 97.6%</span>
                </div>
                <div className="p-3 bg-[#0B1117] rounded border border-[#293746]">
                  <span className="text-[10px] text-[#718297] block uppercase">Continuous CRS MAE</span>
                  <span className="text-xl font-bold text-[#35C7D9]">0.27</span>
                  <span className="text-[10px] text-[#718297] block">R&sup2; Score: 0.999</span>
                </div>
                <div className="p-3 bg-[#0B1117] rounded border border-[#293746]">
                  <span className="text-[10px] text-[#718297] block uppercase">Dataset Size</span>
                  <span className="text-xl font-bold text-[#E6EDF3]">96,028</span>
                  <span className="text-[10px] text-[#718297] block">Accepted Clean Rows</span>
                </div>
                <div className="p-3 bg-[#0B1117] rounded border border-[#293746]">
                  <span className="text-[10px] text-[#718297] block uppercase">Top Risk Factor</span>
                  <span className="text-xl font-bold text-[#E8AD43]">RSRQ</span>
                  <span className="text-[10px] text-[#718297] block">35.7% Importance</span>
                </div>
              </div>

              {/* Grid: Provenance & Live Simulator */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Column 1: Provenance & Architecture */}
                <div className="space-y-4">
                  <div className="p-3.5 bg-[#0B1117] rounded border border-[#293746] space-y-2">
                    <h4 className="text-xs font-bold text-[#9AAABA] uppercase tracking-wider flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-[#35C7D9]" />
                      Public Dataset Provenance
                    </h4>
                    <p className="text-xs text-[#9AAABA] leading-relaxed">
                      Trained on client-side cellular KPIs collected from a major commercial 5G production network via G-NetTrack Pro.
                    </p>
                    <div className="space-y-1 text-xs pt-1 text-[#E6EDF3]">
                      <div><span className="text-[#718297]">Source:</span> University College Cork (UCC) MISL</div>
                      <div><span className="text-[#718297]">License:</span> GNU GPL-3.0 (Commercial Trace Benchmark)</div>
                      <div><span className="text-[#718297]">Normal / Congested / Critical:</span> 29K / 61.6K / 5.4K</div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#0B1117] rounded border border-[#293746] space-y-2">
                    <h4 className="text-xs font-bold text-[#9AAABA] uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-[#E8AD43]" />
                      Feature Importance Breakdown
                    </h4>
                    <div className="space-y-2 pt-1">
                      <div>
                        <div className="flex justify-between text-[11px] mb-0.5">
                          <span className="text-[#9AAABA]">RSRQ (Signal Quality)</span>
                          <span className="text-[#E8AD43]">35.7%</span>
                        </div>
                        <div className="w-full bg-[#15212C] rounded-full h-1.5">
                          <div className="bg-[#E8AD43] h-1.5 rounded-full" style={{ width: '35.7%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] mb-0.5">
                          <span className="text-[#9AAABA]">SNR (Signal-to-Noise Ratio)</span>
                          <span className="text-[#35C7D9]">32.6%</span>
                        </div>
                        <div className="w-full bg-[#15212C] rounded-full h-1.5">
                          <div className="bg-[#35C7D9] h-1.5 rounded-full" style={{ width: '32.6%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] mb-0.5">
                          <span className="text-[#9AAABA]">DL Bitrate (Throughput)</span>
                          <span className="text-[#39B980]">9.4%</span>
                        </div>
                        <div className="w-full bg-[#15212C] rounded-full h-1.5">
                          <div className="bg-[#39B980] h-1.5 rounded-full" style={{ width: '9.4%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] mb-0.5">
                          <span className="text-[#9AAABA]">RSRP (Signal Power)</span>
                          <span className="text-[#718297]">8.1%</span>
                        </div>
                        <div className="w-full bg-[#15212C] rounded-full h-1.5">
                          <div className="bg-[#718297] h-1.5 rounded-full" style={{ width: '8.1%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Interactive Live Inference Simulator */}
                <div className="p-3.5 bg-[#0B1117] rounded border border-[#293746] space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#E6EDF3] uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#39B980]" />
                      Live Telemetry Inference
                    </h4>
                    <span className="text-[10px] text-[#39B980] bg-[#39B980]/15 px-2 py-0.5 rounded border border-[#39B980]/30">
                      POST /api/ml/predict
                    </span>
                  </div>

                  <form onSubmit={handleRunInference} className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[#718297] text-[10px] mb-1">RSRP (dBm)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={testRsrp}
                          onChange={(e) => setTestRsrp(e.target.value)}
                          className="w-full px-2 py-1 bg-[#15212C] border border-[#293746] rounded text-xs text-[#E6EDF3]"
                        />
                      </div>
                      <div>
                        <label className="block text-[#718297] text-[10px] mb-1">RSRQ (dB)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={testRsrq}
                          onChange={(e) => setTestRsrq(e.target.value)}
                          className="w-full px-2 py-1 bg-[#15212C] border border-[#293746] rounded text-xs text-[#E6EDF3]"
                        />
                      </div>
                      <div>
                        <label className="block text-[#718297] text-[10px] mb-1">SNR (dB)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={testSnr}
                          onChange={(e) => setTestSnr(e.target.value)}
                          className="w-full px-2 py-1 bg-[#15212C] border border-[#293746] rounded text-xs text-[#E6EDF3]"
                        />
                      </div>
                      <div>
                        <label className="block text-[#718297] text-[10px] mb-1">DL Bitrate (kbps)</label>
                        <input
                          type="number"
                          step="500"
                          value={testDlBitrate}
                          onChange={(e) => setTestDlBitrate(e.target.value)}
                          className="w-full px-2 py-1 bg-[#15212C] border border-[#293746] rounded text-xs text-[#E6EDF3]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={predLoading}
                      className="w-full py-1.5 bg-[#39B980] hover:bg-[#32A572] text-[#0B1117] font-bold text-xs rounded transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {predLoading ? (
                        <div className="w-3.5 h-3.5 border-2 border-[#0B1117] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          <span>Run Inference</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Prediction Output */}
                  {predResult && (
                    <div className="p-2.5 bg-[#15212C] rounded border border-[#293746] space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#718297]">Predicted CRS:</span>
                        <span className={`text-sm font-bold ${
                          predResult.predicted_crs >= 75 ? 'text-[#E45B64]' :
                          predResult.predicted_crs >= 50 ? 'text-[#E8AD43]' : 'text-[#39B980]'
                        }`}>
                          {predResult.predicted_crs} / 100
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#718297]">Severity Class:</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#0B1117] text-[#E6EDF3]">
                          {predResult.congestion_severity}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#718297]">Confidence:</span>
                        <span className="text-[#35C7D9]">{(predResult.confidence_score * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-[#293746] bg-[#0B1117] flex items-center justify-between text-xs font-mono text-[#718297]">
              <span>Pipeline: <code className="text-[#9AAABA]">python3 -m app.ml.train</code></span>
              <button
                onClick={() => setMlModalOpen(false)}
                className="px-3 py-1 bg-[#15212C] hover:bg-[#1A2937] text-[#E6EDF3] rounded border border-[#293746] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
