import { useState, useEffect } from 'react';
import {
  Search, Globe, ShieldAlert, CheckCircle2, ArrowRight,
  ExternalLink, Sparkles, Filter, Tag, Radio, ShieldCheck
} from 'lucide-react';
import { discoverServices, fetchProviders } from '../../data/paypilotApi';
import GlassCard from '../shared/GlassCard';
import ProviderTrustModal from './ProviderTrustModal';

const CATEGORIES = [
  { id: 'ALL', label: 'All Services' },
  { id: 'TELECOM_BANDWIDTH', label: 'Telecom Bandwidth' },
  { id: 'SENSOR_DATA', label: 'IoT & Radar Telemetry' },
  { id: 'EDGE_COMPUTE', label: 'Edge Compute' },
  { id: 'ROUTING_AI', label: 'Routing & Transit AI' },
];

export default function DiscoveryPage({ onSelectProviderForPayment }) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [providers, setProviders] = useState([]);
  const [externalLeads, setExternalLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tinyfishConfigured, setTinyfishConfigured] = useState(false);
  const [inspectingTrustProviderId, setInspectingTrustProviderId] = useState(null);

  const performSearch = async (searchTerm = '') => {
    setLoading(true);
    try {
      if (searchTerm.trim().length >= 2) {
        const res = await discoverServices(searchTerm);
        setProviders(res.providers || []);
        setExternalLeads(res.external_leads || []);
        setTinyfishConfigured(Boolean(res.tinyfish_configured));
      } else {
        const cat = selectedCategory === 'ALL' ? null : selectedCategory;
        const res = await fetchProviders(cat);
        setProviders(res.providers || []);
        setExternalLeads([]);
      }
    } catch (err) {
      console.error('Discovery error:', err);
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
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-display text-crowd-text-primary flex items-center gap-2">
            <Search size={22} className="text-crowd-cyan" />
            Service & Provider Discovery
          </h1>
          <p className="text-xs text-crowd-text-secondary mt-1">
            Discover verified autonomous service providers, telecom slices, and real-time sensory data feeds on HSK Chain.
          </p>
        </div>

        {/* TinyFish Agent Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-crowd-cyan/10 border border-crowd-cyan/30 text-xs font-mono text-crowd-cyan">
          <Globe size={14} className={tinyfishConfigured ? 'animate-pulse' : ''} />
          <span>TinyFish Web Agent: {tinyfishConfigured ? 'Live (X-API-Key Active)' : 'Demo Mode Active'}</span>
        </div>
      </div>

      {/* ── Search Bar & Category Filter ── */}
      <div className="space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-crowd-text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search providers by service (e.g. 5G bandwidth, radar feed, compute, transit AI)..."
              className="w-full bg-crowd-card border border-crowd-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-crowd-text-primary placeholder:text-crowd-text-muted focus:outline-none focus:border-crowd-cyan focus:ring-1 focus:ring-crowd-cyan font-sans transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-crowd-cyan hover:bg-crowd-cyan/90 text-crowd-bg font-bold text-sm transition-all shadow-[0_0_15px_rgba(0,212,255,0.2)]"
          >
            {loading ? 'Searching...' : 'Discover'}
          </button>
        </form>

        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-crowd-cyan/20 text-crowd-cyan border border-crowd-cyan/40 font-bold'
                  : 'bg-white/[0.03] text-crowd-text-secondary hover:text-crowd-text-primary border border-transparent'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Provider Cards Grid ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-crowd-text-muted">
          <span>Available Providers ({providers.length})</span>
          <span>Dual-Mode: HSK Chain 133</span>
        </div>

        {providers.length === 0 ? (
          <GlassCard className="p-12 text-center text-crowd-text-muted text-xs">
            No service providers found for the current search criteria.
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map((p) => (
              <GlassCard key={p.id} className="p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-crowd-text-primary font-display">
                          {p.name}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-crowd-cyan/15 text-crowd-cyan font-bold border border-crowd-cyan/30">
                          {p.category}
                        </span>
                      </div>
                      <span className="text-xs text-crowd-text-muted font-mono block mt-0.5">
                        ID: {p.id}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-bold font-mono text-crowd-cyan">
                        {p.unit_price} {p.asset}
                      </div>
                      <div className="text-[10px] font-mono text-crowd-text-muted">
                        /{p.pricing_model?.toLowerCase().replace('per_', '')}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-crowd-text-secondary leading-relaxed">
                    {p.description}
                  </p>

                  <div className="pt-2 border-t border-crowd-border/60 text-[10px] font-mono text-crowd-text-muted space-y-1">
                    <div className="truncate">
                      Recipient Address: <span className="text-crowd-text-primary">{p.payment_address}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Network: HSK Chain ({p.network_id})</span>
                      <span>Source: {p.source_type}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setInspectingTrustProviderId(p.id)}
                      className="text-[11px] font-mono text-crowd-text-muted hover:text-crowd-cyan inline-flex items-center gap-1"
                    >
                      <ShieldCheck size={13} className="text-crowd-cyan" />
                      <span>Trust Signals</span>
                    </button>
                    {p.source_url && (
                      <a
                        href={p.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-crowd-text-muted hover:text-crowd-cyan inline-flex items-center gap-1 font-mono"
                      >
                        <ExternalLink size={11} />
                        <span>Docs</span>
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => onSelectProviderForPayment(p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-crowd-cyan text-crowd-bg text-xs font-bold hover:bg-crowd-cyan/90 transition-all shadow-[0_0_10px_rgba(0,212,255,0.2)]"
                  >
                    <span>Initiate Agreement</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* ── External TinyFish Leads (if any) ── */}
      {externalLeads.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-crowd-border">
          <h2 className="text-sm font-semibold font-display text-crowd-text-primary flex items-center gap-2">
            <Globe size={16} className="text-crowd-cyan" />
            External Discovery Leads (TinyFish Web Agent)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {externalLeads.map((lead, idx) => (
              <GlassCard key={idx} className="p-3 text-xs space-y-1.5 border-dashed border-crowd-border">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-crowd-text-primary truncate">{lead.title}</span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-crowd-warning/20 text-crowd-warning">
                    UNVERIFIED LEAD
                  </span>
                </div>
                <p className="text-crowd-text-secondary text-[11px] line-clamp-2">{lead.snippet}</p>
                {lead.url && (
                  <a
                    href={lead.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-crowd-cyan text-[10px] font-mono hover:underline inline-flex items-center gap-1"
                  >
                    {lead.url} <ExternalLink size={10} />
                  </a>
                )}
              </GlassCard>
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
