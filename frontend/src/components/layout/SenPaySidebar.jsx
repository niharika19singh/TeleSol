import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, AlertCircle, Network, Sparkles, Scale,
  FileCheck2, Building2, Users2, ShieldCheck, CreditCard,
  PackageCheck, AlertOctagon, Award, FileText, History,
  KeyRound, ChevronDown, ChevronRight, ChevronLeft, Shield
} from 'lucide-react';

const NAVIGATION_GROUPS = [
  {
    title: 'OVERVIEW',
    items: [
      { id: 'command_center', label: 'Active Command Center', icon: LayoutDashboard },
      { id: 'incident_monitor', label: 'Incident Monitor', icon: AlertCircle, color: 'text-senpay-violet' },
    ],
  },
  {
    title: 'INTELLIGENCE',
    items: [
      { id: 'digital_twin', label: 'Network Digital Twin', icon: Network, color: 'text-senpay-cyan' },
      { id: 'optimizer', label: 'Intervention Optimizer', icon: Sparkles, color: 'text-senpay-cyan' },
      { id: 'counterfactual', label: 'Counterfactual', icon: Scale, color: 'text-senpay-violet' },
    ],
  },
  {
    title: 'PROCUREMENT',
    items: [
      { id: 'agreements', label: 'Service Agreements', icon: FileCheck2, color: 'text-senpay-green' },
      { id: 'providers', label: 'Provider Directory', icon: Building2, color: 'text-senpay-cyan' },
      { id: 'delegations', label: 'Agent Delegations', icon: Users2, color: 'text-senpay-amber' },
    ],
  },
  {
    title: 'PAYMENTS & TRUST',
    items: [
      { id: 'safety', label: 'Payment Safety', icon: ShieldCheck, color: 'text-senpay-cyan' },
      { id: 'operations', label: 'Payment Operations', icon: CreditCard, color: 'text-senpay-cyan' },
      { id: 'evidence', label: 'Evidence Bundles', icon: PackageCheck, color: 'text-senpay-violet' },
      { id: 'disputes', label: 'Disputes', icon: AlertOctagon, color: 'text-senpay-red' },
      { id: 'trust', label: 'Provider Trust', icon: Award, color: 'text-senpay-green' },
    ],
  },
  {
    title: 'GOVERNANCE',
    collapsible: true,
    items: [
      { id: 'policies', label: 'Mandate Policies', icon: FileText, color: 'text-senpay-text-secondary' },
      { id: 'audit', label: 'Audit Trail', icon: History, color: 'text-senpay-text-secondary' },
      { id: 'wallet', label: 'Wallet Authorization', icon: KeyRound, color: 'text-senpay-cyan' },
    ],
  },
];

export default function SenPaySidebar({
  currentPage,
  onNavigate,
  collapsed,
  onToggleCollapse,
}) {
  const { user, isAdmin } = useAuth();
  const [governanceOpen, setGovernanceOpen] = useState(true);

  const displayedGroups = [...NAVIGATION_GROUPS];
  if (isAdmin) {
    displayedGroups.push({
      title: 'ADMINISTRATION',
      items: [
        { id: 'admin', label: 'Platform Admin', icon: Shield, color: 'text-emerald-500' },
      ],
    });
  }

  return (
    <aside
      className={`
        fixed top-14 left-0 bottom-7 z-30
        bg-senpay-sidebar border-r border-senpay-border
        flex flex-col select-none
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-16' : 'w-56 lg:w-60'}
      `}
    >
      {/* ── Grouped Navigation ── */}
      <nav className="flex-1 py-3 px-2 space-y-4 overflow-y-auto">
        {displayedGroups.map((group) => {
          const isCollapsible = group.collapsible;
          const isOpen = isCollapsible ? governanceOpen : true;

          return (
            <div key={group.title} className="space-y-1">
              {/* Group Title */}
              {!collapsed && (
                <div
                  onClick={() => isCollapsible && setGovernanceOpen(!governanceOpen)}
                  className={`
                    px-2.5 py-1 text-[10px] font-mono font-bold tracking-wider text-senpay-text-muted uppercase
                    flex items-center justify-between
                    ${isCollapsible ? 'cursor-pointer hover:text-senpay-text-primary' : ''}
                  `}
                >
                  <span>{group.title}</span>
                  {isCollapsible && (
                    <span>
                      {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </span>
                  )}
                </div>
              )}

              {/* Items */}
              {isOpen && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = currentPage === item.id;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        title={collapsed ? item.label : undefined}
                        className={`
                          w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg
                          text-xs font-medium transition-all duration-150
                          ${isActive
                            ? 'bg-senpay-card text-senpay-text-primary border-l-2 border-senpay-cyan shadow-sm font-semibold'
                            : 'text-senpay-text-secondary hover:text-senpay-text-primary hover:bg-senpay-panel/50 border-l-2 border-transparent'
                          }
                          ${collapsed ? 'justify-center px-0' : ''}
                        `}
                      >
                        {/* Active dot or Icon */}
                        {isActive ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-senpay-cyan flex-shrink-0" />
                        ) : null}

                        <Icon
                          size={15}
                          className={`flex-shrink-0 ${
                            isActive ? 'text-senpay-cyan' : item.color || 'text-senpay-text-secondary'
                          }`}
                        />

                        {!collapsed && (
                          <span className="truncate text-left">{item.label}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Active Identity Badge ── */}
      {!collapsed && user && (
        <div className="px-3 py-2 mx-2 mb-2 rounded bg-senpay-panel/40 border border-senpay-border/60 text-[10px] font-mono">
          <div className="text-senpay-text-muted truncate">{user.org_name || user.workspace_id || 'TeleSol Global'}</div>
          <div className="text-senpay-cyan font-bold truncate flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{user.role || 'NOC_OPERATOR'}</span>
          </div>
        </div>
      )}

      {/* ── Collapse Toggle Footer ── */}
      <div className="p-2 border-t border-senpay-border/60">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg bg-senpay-panel/50 hover:bg-senpay-panel text-senpay-text-muted hover:text-senpay-text-primary text-xs transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : (
            <>
              <ChevronLeft size={14} />
              <span className="text-[11px] font-mono">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
