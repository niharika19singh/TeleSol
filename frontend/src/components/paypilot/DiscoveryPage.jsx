// ═══════════════════════════════════════════════════════
// SENPAY — Service & Provider Discovery Console
// Autonomous Telecom Slices, Transport Capacity & Sensory Feeds
// ═══════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import {
  Search, Globe, ShieldAlert, CheckCircle2, ArrowRight,
  ExternalLink, Sparkles, Filter, Tag, Radio, ShieldCheck, Zap
} from 'lucide-react';
import { discoverServices, fetchProviders } from '../../data/paypilotApi';
import ProviderTrustModal from './ProviderTrustModal';

const CATEGORIES = [
  { id: 'ALL', label: 'All Services' },
  { id: 'TELECOM_BANDWIDTH', label: 'Telecom Bandwidth' },
  { id: 'SENSOR_DATA', label: 'IoT & Radar Telemetry' },
  { id: 'EDGE_COMPUTE', label: 'Edge Compute' },
  { id: 'ROUTING_AI', label: 'Routing & Transit AI' },
];

const CANONICAL_PROVIDERS = [
  {
    id: 'prov_skylink_5g_slice',
    name: 'SkyLink Telecom 5G Slicing',
    category: 'TELECOM_BANDWIDTH',
    unit_price: 12.50,
    asset: 'HSK',
    pricing_model: 'PER_HOUR',
    description: 'Guaranteed 500 Mbps ultra-reliable low latency slice (<20ms RTT) for congested cellular sectors and high-priority traffic redirection.',
    payment_address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    network_id: 133,
    source_type: 'ON_CHAIN_REGISTRY',
    source_url: 'https://explorer.hashkey.com/address/0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    trust_score: 98,
  },
  {
    id: 'prov_apex_optical',
    name: 'Apex Optical Transit',
    category: 'TELECOM_BANDWIDTH',
    unit_price: 18.00,
    asset: 'HSK',
    pricing_model: 'PER_HOUR',
    description: 'Dedicated 10Gbps optical dark fiber interconnect for high-volume backhaul relief and zero-packet-loss fiber bypassing.',
    payment_address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    network_id: 133,
    source_type: 'ON_CHAIN_REGISTRY',
    source_url: 'https://explorer.hashkey.com/address/0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    trust_score: 95,
  },
  {
    id: 'prov_metrowave_cbrs',
    name: 'MetroWave Micro-POP',
    category: 'TELECOM_BANDWIDTH',
    unit_price: 9.50,
    asset: 'HSK',
    pricing_model: 'PER_HOUR',
    description: 'Autonomous Sub-6GHz CBRS micro-point of presence providing auxiliary downlink throughput and localized capacity offloading.',
    payment_address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    network_id: 133,
    source_type: 'ON_CHAIN_REGISTRY',
    source_url: 'https://explorer.hashkey.com/address/0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    trust_score: 91,
  },
  {
    id: 'prov_sentinel_edge_ai',
    name: 'Sentinel Autonomous Traffic Broker',
    category: 'ROUTING_AI',
    unit_price: 6.00,
    asset: 'HSK',
    pricing_model: 'PER_HOUR',
    description: 'Predictive BGP optimization engine dynamically rerouting transit flows around packet-loss hotspots.',
    payment_address: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4df',
    network_id: 133,
    source_type: 'ON_CHAIN_REGISTRY',
    source_url: 'https://explorer.hashkey.com/address/0x9965507D1a55bcC2695C58ba16FB37d819B0A4df',
    trust_score: 94,
  }
];

export default function DiscoveryPage({ onSelectProviderForPayment }) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [providers, setProviders] = useState(CANONICAL_PROVIDERS);
  const [externalLeads, setExternalLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tinyfishConfigured, setTinyfishConfigured] = useState(false);
  const [inspectingTrustProviderId, setInspectingTrustProviderId] = useState(null);

  const performSearch = async (searchTerm = '') => {
    setLoading(true);
    try {
      if (searchTerm.trim().length >= 2) {
        const res = await discoverServices(searchTerm);
        if (res && res.providers && res.providers.length > 0) {
          setProviders(res.providers);
        } else {
          // Filter canonical providers locally by query
          const q = searchTerm.toLowerCase();
          setProviders(CANONICAL_PROVIDERS.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
          ));
        }
        setExternalLeads(res?.external_leads || []);
        setTinyfishConfigured(Boolean(res?.tinyfish_configured));
      } else {
        const cat = selectedCategory === 'ALL' ? null : selectedCategory;
        const res = await fetchProviders(cat);
        if (res && res.providers && res.providers.length > 0) {
          setProviders(res.providers);
        } else {
          // Fall back to canonical providers filtered by category
          if (selectedCategory === 'ALL') {
            setProviders(CANONICAL_PROVIDERS);
          } else {
            setProviders(CANONICAL_PROVIDERS.filter(p => p.category === selectedCategory));
          }
        }
        setExternalLeads([]);
      }
    } catch (err) {
      console.warn('Discovery API error, using canonical registry:', err);
      if (selectedCategory === 'ALL') {
        setProviders(CANONICAL_PROVIDERS);
      } else {
        setProviders(CANONICAL_PROVIDERS.filter(p => p.category === selectedCategory));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performSearch();
  }, [selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    performSearch(query);
  };

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* ── Flight-Strip Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-senpay-border">
        <div>
          <h1 className="text-base font-bold text-senpay-text-primary uppercase font-mono tracking-wide flex items-center gap-2">
            <Search size={16} className="text-senpay-cyan" />
            <span>Autonomous Service & Provider Discovery</span>
          </h1>
          <p className="text-xs text-senpay-text-muted mt-0.5">
            Discover verified autonomous service providers, 5G telecom slices, and edge capacity on HashKey Chain (Chain ID 133).
          </p>
        </div>

        {/* TinyFish Agent Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-senpay-panel border border-senpay-border text-xs font-mono text-senpay-cyan self-start md:self-auto">
          <Globe size={13} className={tinyfishConfigured ? 'animate-pulse text-emerald-400' : 'text-senpay-cyan'} />
          <span>Web Agent: {tinyfishConfigured ? 'Live (Key Active)' : 'HSP Demo Mode'}</span>
        </div>
      </div>

      {/* ── Search Bar & Category Filter ── */}
      <div className="space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-senpay-text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search providers by capability (e.g. 5G slice, dark fiber, CBRS, transit AI)..."
              className="w-full bg-senpay-card border border-senpay-border rounded-xl pl-10 pr-4 py-2 text-xs font-mono text-senpay-text-primary placeholder:text-senpay-text-muted focus:outline-none focus:border-senpay-cyan transition"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-senpay-cyan hover:opacity-90 text-slate-950 font-bold text-xs font-mono transition shadow-sm"
          >
            {loading ? 'Searching...' : 'Discover'}
          </button>
        </form>

        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 font-mono text-xs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-lg text-xs transition whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-senpay-cyan/15 text-senpay-cyan border border-senpay-cyan/40 font-bold'
                  : 'bg-senpay-panel text-senpay-text-muted hover:text-senpay-text-primary border border-senpay-border'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Provider Cards Grid ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-senpay-text-muted">
          <span>Verified Catalog ({providers.length})</span>
          <span>Dual-Mode Settlement: HSK Chain 133</span>
        </div>

        {providers.length === 0 ? (
          <div className="p-12 rounded-xl bg-senpay-card border border-senpay-border text-center text-senpay-text-muted text-xs font-mono">
            No service providers found for the current search criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {providers.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl bg-senpay-card border border-senpay-border hover:border-senpay-cyan/60 hover-elevate transition-all flex flex-col justify-between space-y-3 font-mono"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-senpay-text-primary">
                          {p.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-senpay-cyan/15 text-senpay-cyan font-bold border border-senpay-cyan/30">
                          {p.category}
                        </span>
                      </div>
                      <span className="text-[10px] text-senpay-text-muted block mt-0.5">
                        ID: {p.id}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-senpay-cyan">
                        {p.unit_price} {p.asset}
                      </div>
                      <div className="text-[10px] text-senpay-text-muted">
                        /{p.pricing_model?.toLowerCase().replace('per_', '')}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-senpay-text-secondary leading-relaxed font-sans">
                    {p.description}
                  </p>

                  <div className="pt-2 border-t border-senpay-border/60 text-[10px] text-senpay-text-muted space-y-1">
                    <div className="truncate">
                      Recipient: <span className="text-senpay-text-primary">{p.payment_address}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Network: HSK Chain ({p.network_id || 133})</span>
                      <span className="text-emerald-400 font-bold">Trust Score: {p.trust_score || 95}%</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-senpay-border/40">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setInspectingTrustProviderId(p.id)}
                      className="text-[11px] text-senpay-text-muted hover:text-senpay-cyan inline-flex items-center gap-1"
                    >
                      <ShieldCheck size={12} className="text-senpay-cyan" />
                      <span>Trust Signals</span>
                    </button>
                    {p.source_url && (
                      <a
                        href={p.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-senpay-text-muted hover:text-senpay-cyan inline-flex items-center gap-1"
                      >
                        <ExternalLink size={10} />
                        <span>Docs</span>
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => onSelectProviderForPayment(p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-senpay-cyan text-slate-950 text-xs font-bold hover:opacity-90 transition shadow-sm"
                  >
                    <span>Initiate Agreement</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── External TinyFish Leads (if any) ── */}
      {externalLeads.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-senpay-border">
          <h2 className="text-xs font-bold uppercase font-mono text-senpay-text-primary flex items-center gap-2">
            <Globe size={14} className="text-senpay-cyan" />
            <span>External Discovery Leads (TinyFish Web Agent)</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {externalLeads.map((lead, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-senpay-panel border border-senpay-border text-xs font-mono space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-senpay-text-primary truncate">{lead.title}</span>
                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-senpay-amber/20 text-senpay-amber border border-senpay-amber/30">
                    UNVERIFIED LEAD
                  </span>
                </div>
                <p className="text-senpay-text-secondary text-[11px] line-clamp-2 font-sans">{lead.snippet}</p>
                {lead.url && (
                  <a
                    href={lead.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-senpay-cyan text-[10px] hover:underline inline-flex items-center gap-1"
                  >
                    {lead.url} <ExternalLink size={10} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Trust Profile Modal ── */}
      {inspectingTrustProviderId && (
        <ProviderTrustModal
          providerId={inspectingTrustProviderId}
          onClose={() => setInspectingTrustProviderId(null)}
          onSelectForPayment={(trustData) => {
            const match = providers.find(p => p.id === trustData.provider_id);
            if (match) onSelectProviderForPayment(match);
          }}
        />
      )}
    </div>
  );
}
