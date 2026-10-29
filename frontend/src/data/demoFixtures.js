/**
 * SENPAY — Deterministic Demo Data Adapter & Local Fixtures
 * ═════════════════════════════════════════════════════════
 * Provides deterministic, clearly-attributed telecom & settlement fixtures
 * for the public Demo Mode when the backend is unreachable or when an endpoint
 * requires authentication. Never fabricates authentication tokens or real
 * blockchain transactions.
 */

export const DEMO_SESSION_MESSAGE =
  "You're exploring an interactive SENPAY demonstration. Some data and actions are simulated. No real financial transactions are executed.";

export const DEMO_SIMULATED_ACTION_MESSAGE =
  "Demo mode: this action is simulated. No real transaction or infrastructure change was performed.";

export const DATA_SOURCE_LABELS = {
  LIVE_BACKEND: 'Live backend data',
  CACHED: 'Cached data',
  SYNTHETIC_DEMO: 'Synthetic demo data',
  SIMULATED_RESULT: 'Simulated operation results',
  TESTNET_RESULT: 'Testnet results (HSK Chain 133)',
};

export const DEMO_AGENTS = [
  {
    id: 'agent_buyer_sentinel',
    name: 'Sentinel Autonomous Buyer Agent',
    role: 'BUYER',
    status: 'ACTIVE',
    description: 'Evaluates telecom congestion telemetry and proposes bounded mitigation mandates within delegated policy limits.',
    capabilities: ['qos_eval', 'emergency_routing', 'slice_procurement'],
    wallet_address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    spending_limit: 30.0,
    daily_limit: 150.0,
    data_source: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  },
  {
    id: 'agent_payment_coordinator',
    name: 'PayPilot Policy & Escrow Coordinator',
    role: 'PAYMENT',
    status: 'ACTIVE',
    description: 'Executes 11-rule deterministic policy validation, manages atomic budget reservations, and coordinates outcome-gated settlement.',
    capabilities: ['policy_validation', 'escrow_lock', 'rfc8785_canonicalization'],
    wallet_address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    spending_limit: 50.0,
    daily_limit: 200.0,
    data_source: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  },
  {
    id: 'agent_provider_skylink',
    name: 'SkyLink 5G Slice Provider Node',
    role: 'PROVIDER',
    status: 'ACTIVE',
    description: 'Delivers on-demand 5G dynamic radio slices and QoS priority lanes with verifiable SLA telemetry.',
    capabilities: ['5g_network_slicing', 'low_latency_backhaul'],
    wallet_address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    spending_limit: 0.0,
    daily_limit: 0.0,
    data_source: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  },
];

export const DEMO_PROVIDERS = [
  {
    id: 'prov_skylink_5g',
    name: 'SkyLink Dynamic 5G Slicing',
    category: 'TELECOM_BANDWIDTH',
    unit_price: 12.5,
    asset: 'HSK',
    pricing_model: 'PER_HOUR',
    description: 'Guaranteed 500 Mbps ultra-reliable low latency slice (<20ms RTT) for congested cellular sectors and high-priority traffic redirection.',
    payment_address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    network_id: 133,
    source_type: 'DEMO_FIXTURE_REGISTRY',
    source_url: 'https://testnet-explorer.hskchain.net/address/0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    trust_score: 98,
    data_source: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  },
  {
    id: 'prov_edge_compute',
    name: 'Edge Compute Mesh Container',
    category: 'EDGE_COMPUTE',
    unit_price: 18.0,
    asset: 'HSK',
    pricing_model: 'PER_HOUR',
    description: 'Dedicated edge packet inspection and local cache offload node for high-density sector relief.',
    payment_address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    network_id: 133,
    source_type: 'DEMO_FIXTURE_REGISTRY',
    source_url: 'https://testnet-explorer.hskchain.net/address/0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    trust_score: 95,
    data_source: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  },
  {
    id: 'prov_mmwave_radar',
    name: 'Spatial mmWave Radar Stream',
    category: 'SENSOR_DATA',
    unit_price: 8.0,
    asset: 'HSK',
    pricing_model: 'PER_CALL',
    description: 'High-frequency spatial crowd density and ingress velocity telemetry stream for predictive congestion modeling.',
    payment_address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    network_id: 133,
    source_type: 'DEMO_FIXTURE_REGISTRY',
    source_url: 'https://testnet-explorer.hskchain.net/address/0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    trust_score: 92,
    data_source: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  },
  {
    id: 'prov_transit_ai',
    name: 'Transit Feeder Dispersal AI',
    category: 'ROUTING_AI',
    unit_price: 22.0,
    asset: 'HSK',
    pricing_model: 'PER_HOUR',
    description: 'Predictive multi-sector BGP and RAN traffic steering engine for regional backhaul balancing.',
    payment_address: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4df',
    network_id: 133,
    source_type: 'DEMO_FIXTURE_REGISTRY',
    source_url: 'https://testnet-explorer.hskchain.net/address/0x9965507D1a55bcC2695C58ba16FB37d819B0A4df',
    trust_score: 94,
    data_source: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  },
];

export const DEMO_AGREEMENTS = [
  {
    id: 'agr_seed_001',
    agreement_id: 'agr_seed_001',
    task_id: 'task_opt_west_8812',
    provider_id: 'prov_skylink_5g',
    provider_name: 'SkyLink Dynamic 5G Slicing',
    requesting_agent_id: 'agent_buyer_sentinel',
    service_category: 'TELECOM_BANDWIDTH',
    service_description: 'Emergency 5G dynamic telecom slice mitigation for Gate C VIP Corridor surge',
    agreed_price: 12.5,
    asset: 'HSK',
    max_authorized_amount: 15.0,
    status: 'MANDATED',
    evaluation_status: 'OUTCOME_VERIFIED',
    settlement_eligibility: 'PERFORMANCE_SATISFIED',
    agreement_hash: '0x7a89bc33d45e612f00918342ca3321fa89012345bcde1234567890abcdef1234',
    expected_deliverables: 'Guaranteed 200 Mbps uplink QoS slice for 60 minutes with < 35.0 CRS guarantee',
    evidence_required: 'TELECOM_QOS_TELEMETRY_LOG',
    expected_completion_time: new Date(Date.now() + 3600000).toISOString(),
    data_source: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  },
  {
    id: 'agr_seed_002',
    agreement_id: 'agr_seed_002',
    task_id: 'task_edge_east_409',
    provider_id: 'prov_edge_compute',
    provider_name: 'Edge Compute Mesh Container',
    requesting_agent_id: 'agent_buyer_sentinel',
    service_category: 'EDGE_COMPUTE',
    service_description: 'Auxiliary packet buffer offload for East Concourse sector node BS-EAST-04',
    agreed_price: 18.0,
    asset: 'HSK',
    max_authorized_amount: 20.0,
    status: 'AGREED',
    evaluation_status: 'PENDING_EVALUATION',
    settlement_eligibility: 'AWAITING_OUTCOME_EVIDENCE',
    agreement_hash: '0x4b12ef98a71c309d88123456ca9901fa45678901bcde9876543210fedcba9876',
    expected_deliverables: 'Sub-25ms edge RTT and < 0.2% packet drop across 45-minute window',
    evidence_required: 'EDGE_TELEMETRY_ATTESTATION',
    expected_completion_time: new Date(Date.now() + 5400000).toISOString(),
    data_source: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  },
];

export const DEMO_MANDATES = [
  {
    id: 'man_opt_west_8812',
    mandate_id: 'man_opt_west_8812',
    payer_id: 'agent_buyer_sentinel',
    provider_id: 'prov_skylink_5g',
    recipient_address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    amount: 12.5,
    asset: 'HSK',
    network_id: 133,
    purpose: 'Gate C VIP Corridor Congestion Mitigation (SkyLink 5G Slice)',
    authorization_status: 'POLICY_APPROVED',
    execution_status: 'ESCROW_RESERVED',
    verification_status: 'DEMO_SIMULATED',
    is_demo: true,
    data_source: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  },
  {
    id: 'man_settled_001',
    mandate_id: 'man_settled_001',
    payer_id: 'agent_buyer_sentinel',
    provider_id: 'prov_mmwave_radar',
    recipient_address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    amount: 8.0,
    asset: 'HSK',
    network_id: 133,
    purpose: 'Spatial mmWave Radar Telemetry Calibration Feed',
    authorization_status: 'AUTHORIZED',
    execution_status: 'SETTLED',
    verification_status: 'DEMO_VERIFIED',
    is_demo: true,
    data_source: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  },
];

export const DEMO_POLICY = {
  id: 'policy_telecom_standard',
  name: 'Standard Telecom Autonomous Procurement Policy',
  max_amount_per_tx: 50.0,
  max_daily_budget: 200.0,
  require_manual_approval: 1,
  allowed_assets: ['HSK', 'USDT', 'USDC'],
  allowed_networks: [133, 177],
  data_source: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
};

export const DEMO_DELEGATIONS = [
  {
    id: 'del_sentinel_telecom_001',
    agent_id: 'agent_buyer_sentinel',
    delegator_address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    status: 'ACTIVE',
    max_cumulative_spend: 150.0,
    max_total_budget: 150.0,
    cumulative_spend: 8.0,
    reserved_amount: 12.5,
    remaining_cumulative_budget: 129.5,
    max_amount_per_tx: 30.0,
    daily_budget_limit: 100.0,
    service_categories: ['TELECOM_BANDWIDTH', 'EDGE_COMPUTE', 'SENSOR_DATA'],
    valid_until: new Date(Date.now() + 7 * 86400000).toISOString(),
    data_source: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  },
];

export const DEMO_EVIDENCE_BUNDLES = [
  {
    id: 'evb_demo_8812',
    task_id: 'task_opt_west_8812',
    agreement_id: 'agr_seed_001',
    mandate_id: 'man_opt_west_8812',
    status: 'SIMULATED_BUNDLE',
    transaction_hash: '0x573b9e4210a8b417c89f00112233445566778899aabbccddeeff00112233e79f',
    bundle_hash: '0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    bundle_content: {
      schema_version: 'RFC8785-v2.0',
      data_source: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
      requesting_agent_id: 'agent_buyer_sentinel',
      agreement_hash: '0x7a89bc33d45e612f00918342ca3321fa89012345bcde1234567890abcdef1234',
      mandate: {
        mandate_id: 'man_opt_west_8812',
        amount: 12.5,
        asset: 'HSK',
        authorization_status: 'POLICY_APPROVED',
      },
      telemetry_verification: {
        pre_crs: 78.0,
        post_crs: 22.0,
        sla_threshold: 35.0,
        outcome: 'SLA_RESTORED_SIMULATED',
      },
    },
    data_source: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  },
];

export const DEMO_INCIDENTS = [
  {
    id: 'inc_dispute_demo_01',
    mandate_id: 'man_opt_west_8812',
    incident_type: 'PROVIDER_TIMEOUT',
    status: 'INVESTIGATING',
    detection_reason: 'Simulated SLA verification hold: awaiting final 60-minute packet loss window confirmation before releasing escrow.',
    evidence_notes: 'Synthetic demo probe: CRS dropped from 78.0 to 22.0; holding final settlement in simulated escrow.',
    created_at: new Date(Date.now() - 900000).toISOString(),
    data_source: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  },
];

export const DEMO_AUDIT_LOGS = [
  {
    id: 101,
    event_type: 'INCIDENT_DETECTED',
    actor: 'sentinel_virtual_probe',
    action: 'CRS_THRESHOLD_BREACH',
    entity_type: 'zone',
    entity_id: 'zone-c (Gate C VIP Corridor)',
    current_hash: '0x8f2d41a09c88b71234e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7',
    previous_hash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    timestamp: new Date(Date.now() - 840000).toISOString(),
    details: JSON.stringify({ crs: 78.0, threshold: 65.0, source: 'SYNTHETIC_DEMO' }),
  },
  {
    id: 102,
    event_type: 'INTERVENTION_SELECTED',
    actor: 'intervention_optimizer',
    action: 'RANK_CANDIDATES',
    entity_type: 'agreement',
    entity_id: 'agr_seed_001',
    current_hash: '0x3c9e77b14d22a90123f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6',
    previous_hash: '0x8f2d41a09c88b71234e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7',
    timestamp: new Date(Date.now() - 780000).toISOString(),
    details: JSON.stringify({ provider: 'prov_skylink_5g', predicted_crs: 22.0, cost_hsk: 12.5 }),
  },
  {
    id: 103,
    event_type: 'POLICY_VALIDATED',
    actor: 'policy_engine_v2',
    action: 'PRE_EXECUTION_11_RULE_PASS',
    entity_type: 'mandate',
    entity_id: 'man_opt_west_8812',
    current_hash: '0x6e78012da45bc98765e4f3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2',
    previous_hash: '0x3c9e77b14d22a90123f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6',
    timestamp: new Date(Date.now() - 720000).toISOString(),
    details: JSON.stringify({ amount_hsk: 12.5, ceiling_hsk: 30.0, mode: 'DEMO_SIMULATION' }),
  },
];

export function buildDemoSafetySimulation(payload = {}) {
  const amount = Number(payload.amount ?? 12.5);
  const maxTx = Number(payload.hypothetical_overrides?.max_amount_per_tx ?? 50.0);
  const maxDaily = Number(payload.hypothetical_overrides?.max_daily_budget ?? 200.0);
  const category = payload.category || 'TELECOM_BANDWIDTH';
  const providerId = payload.provider_id || 'prov_skylink_5g';

  const isAmountOk = amount > 0 && amount <= maxTx;
  const isDailyOk = amount <= maxDaily;
  const isCategoryOk = category !== 'GAMBLING_PROHIBITED';
  const isProviderOk = providerId !== 'prov_unregistered_unknown';

  const checks = [
    { name: '1. Positive Non-Zero Amount', passed: amount > 0, details: `Requested ${amount} HSK > 0` },
    { name: '2. Per-Transaction Ceiling', passed: isAmountOk, details: `${amount} HSK <= ${maxTx} HSK limit` },
    { name: '3. Daily Cumulative Budget', passed: isDailyOk, details: `${amount} HSK within ${maxDaily} HSK daily cap` },
    { name: '4. Permitted Service Category', passed: isCategoryOk, details: `Category ${category} policy check` },
    { name: '5. Verified Provider Registry', passed: isProviderOk, details: `Provider ${providerId} registry status` },
    { name: '6. Supported Settlement Asset', passed: true, details: `Asset ${payload.asset || 'HSK'} whitelisted` },
    { name: '7. Target Chain Verification', passed: true, details: `Network ID ${payload.network_id || 133} (HashKey Testnet)` },
    { name: '8. Delegation Window Active', passed: true, details: 'Delegation del_sentinel_telecom_001 within validity window' },
    { name: '9. Atomic Escrow Reservation', passed: isAmountOk && isDailyOk, details: 'Sufficient unreserved delegation balance' },
    { name: '10. Idempotency Replay Guard', passed: true, details: 'No duplicate settled mandate hash detected' },
    { name: '11. Explicit Signature Requirement', passed: true, details: 'Halts for operator approval before settlement' },
  ];

  const allPassed = checks.every((c) => c.passed);

  return {
    status: allPassed ? 'APPROVED FOR AUTHORISATION' : 'BLOCKED',
    estimated_fee_hsk: 0.0042,
    requires_wallet_authorization: true,
    simulated_payload: {
      ...payload,
      network_id: payload.network_id || 133,
      is_demo: true,
    },
    checks,
    reasons: allPassed
      ? ['All 11 deterministic safety checks passed in simulated dry-run mode.']
      : checks.filter((c) => !c.passed).map((c) => `${c.name}: ${c.details}`),
    data_source: DATA_SOURCE_LABELS.SIMULATED_RESULT,
  };
}
