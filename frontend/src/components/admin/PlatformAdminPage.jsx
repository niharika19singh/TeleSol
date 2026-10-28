import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  fetchAdminOverview,
  fetchAdminUsers,
  updateUserRole,
  updateUserStatus,
  fetchAdminWorkspaces,
  createAdminWorkspace,
  fetchAdminSecurityEvents,
  fetchAdminIntegrations,
  fetchAdminSettings,
} from '../../data/api';
import {
  Shield,
  Users,
  Building,
  Key,
  Activity,
  Layers,
  Settings,
  Search,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Sun,
  Moon,
  Lock,
  Radio,
  FileText,
  UserCheck,
  UserX,
  ExternalLink,
  ChevronRight,
  Sliders,
} from 'lucide-react';
import UnauthorizedPage from '../auth/UnauthorizedPage';

export default function PlatformAdminPage({ onNavigateConsole }) {
  const { user, isAdmin, token, logout } = useAuth();
  const { isLight, toggleTheme } = useTheme();

  // If user is not admin, guard immediately
  if (!isAdmin) {
    return (
      <UnauthorizedPage
        onNavigateDashboard={onNavigateConsole}
        onNavigateLogin={() => (window.location.hash = '#login')}
      />
    );
  }

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'workspaces' | 'security' | 'integrations' | 'settings'

  // Data states
  const [overview, setOverview] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [workspacesList, setWorkspacesList] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [settings, setSettings] = useState(null);

  // Filter & Search states
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');

  // UI status
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [bannerMsg, setBannerMsg] = useState('');
  const [bannerType, setBannerType] = useState('success');

  // New Workspace Modal
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');

  useEffect(() => {
    loadTabContent();
  }, [activeTab, token]);

  const showBanner = (msg, type = 'success') => {
    setBannerMsg(msg);
    setBannerType(type);
    setTimeout(() => setBannerMsg(''), 4000);
  };

  const loadTabContent = async () => {
    if (!token) return;
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const data = await fetchAdminOverview(token);
        setOverview(data);
      } else if (activeTab === 'users') {
        const data = await fetchAdminUsers(token, { search: userSearch, role: roleFilter });
        setUsersList(data.users || []);
      } else if (activeTab === 'workspaces') {
        const data = await fetchAdminWorkspaces(token);
        setWorkspacesList(data.workspaces || []);
      } else if (activeTab === 'security') {
        const data = await fetchAdminSecurityEvents(token, { event_type: eventFilter });
        setSecurityEvents(data.events || []);
      } else if (activeTab === 'integrations') {
        const data = await fetchAdminIntegrations(token);
        setIntegrations(data.integrations || []);
      } else if (activeTab === 'settings') {
        const data = await fetchAdminSettings(token);
        setSettings(data.settings || null);
      }
    } catch (err) {
      showBanner(err.message || 'Failed to load administration data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    setActionLoading(true);
    try {
      await updateUserRole(targetUserId, newRole, token);
      showBanner(`Role updated to ${newRole}`);
      loadTabContent();
    } catch (err) {
      showBanner(err.message || 'Role change failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusToggle = async (targetUserId, currentStatus) => {
    setActionLoading(true);
    try {
      await updateUserStatus(targetUserId, !currentStatus, token);
      showBanner(`User ${!currentStatus ? 'activated' : 'suspended'}`);
      loadTabContent();
    } catch (err) {
      showBanner(err.message || 'Status update failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    setActionLoading(true);
    try {
      await createAdminWorkspace({ name: newWsName.trim(), description: newWsDesc.trim() }, token);
      showBanner(`Workspace '${newWsName}' provisioned`);
      setShowWorkspaceModal(false);
      setNewWsName('');
      setNewWsDesc('');
      loadTabContent();
    } catch (err) {
      showBanner(err.message || 'Workspace creation failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-200 font-sans ${
        isLight ? 'bg-white text-zinc-950' : 'bg-black text-zinc-100'
      }`}
    >
      {/* Platform Admin Top Header */}
      <header
        className={`w-full px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b ${
          isLight ? 'border-zinc-200 bg-white' : 'border-zinc-900 bg-zinc-950'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-base font-bold tracking-wider uppercase">
                SENPAY // PLATFORM ADMINISTRATION
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                GOVERNANCE
              </span>
            </div>
            <span className={`text-xs block ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Multi-Tenant Workspace & Security Policy Management
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs ${
              isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-700' : 'bg-zinc-900 border-zinc-800 text-zinc-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{user?.email}</span>
            <span className="opacity-40">|</span>
            <span className="text-emerald-500 font-bold">{user?.role}</span>
          </div>

          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className={`p-2 rounded-lg border transition-colors ${
              isLight
                ? 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                : 'border-zinc-800 text-zinc-300 hover:bg-zinc-900'
            }`}
          >
            {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          <button
            onClick={onNavigateConsole}
            className="py-1.5 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>Operations Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Admin Tab Navigation */}
      <nav
        className={`px-6 border-b flex items-center gap-1 overflow-x-auto ${
          isLight ? 'border-zinc-200 bg-zinc-50/50' : 'border-zinc-900 bg-zinc-950/50'
        }`}
      >
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'users', label: 'Users & Roles', icon: Users },
          { id: 'workspaces', label: 'Workspaces', icon: Building },
          { id: 'security', label: 'Security Audit Log', icon: Lock },
          { id: 'integrations', label: 'Telecom & Chain Integrations', icon: Radio },
          { id: 'settings', label: 'Governance Policies', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-mono font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-emerald-500 text-emerald-500'
                  : isLight
                  ? 'border-transparent text-zinc-600 hover:text-zinc-950 hover:border-zinc-300'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Global Status Banner */}
      {bannerMsg && (
        <div
          className={`mx-6 mt-4 p-3 rounded-lg border text-xs flex items-center justify-between ${
            bannerType === 'error'
              ? 'bg-red-500/10 border-red-500/20 text-red-500'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerType === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            <span>{bannerMsg}</span>
          </div>
        </div>
      )}

      {/* Tab Body */}
      <main className="p-6 max-w-7xl mx-auto">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-xs opacity-60">Querying platform database...</span>
          </div>
        ) : (
          <>
            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && overview && (
              <div className="space-y-6">
                {/* Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div
                    className={`p-5 rounded-xl border ${
                      isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-900'
                    }`}
                  >
                    <span className="text-[11px] font-mono opacity-60 block mb-1">TOTAL ACCOUNTS</span>
                    <div className="text-3xl font-mono font-bold">{overview.metrics?.total_users || 0}</div>
                    <span className="text-xs text-emerald-500 mt-2 block font-mono">
                      {overview.metrics?.active_users || 0} Active &bull; {overview.metrics?.verified_users || 0} Verified
                    </span>
                  </div>

                  <div
                    className={`p-5 rounded-xl border ${
                      isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-900'
                    }`}
                  >
                    <span className="text-[11px] font-mono opacity-60 block mb-1">TENANT WORKSPACES</span>
                    <div className="text-3xl font-mono font-bold">{overview.metrics?.total_workspaces || 0}</div>
                    <span className="text-xs opacity-70 mt-2 block font-mono">Multi-Tenant Isolation Active</span>
                  </div>

                  <div
                    className={`p-5 rounded-xl border ${
                      isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-900'
                    }`}
                  >
                    <span className="text-[11px] font-mono opacity-60 block mb-1">CHAINED SECURITY AUDITS</span>
                    <div className="text-3xl font-mono font-bold">{overview.metrics?.total_security_events || 0}</div>
                    <span className="text-xs text-emerald-500 mt-2 block font-mono">SHA-256 Chained Log Active</span>
                  </div>

                  <div
                    className={`p-5 rounded-xl border ${
                      isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-900'
                    }`}
                  >
                    <span className="text-[11px] font-mono opacity-60 block mb-1">PROCUREMENT AGREEMENTS</span>
                    <div className="text-3xl font-mono font-bold">{overview.metrics?.total_agreements || 0}</div>
                    <span className="text-xs opacity-70 mt-2 block font-mono">Outcome-Driven Slices Bound</span>
                  </div>
                </div>

                {/* Role Distribution & Architecture Status */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div
                    className={`p-6 rounded-xl border ${
                      isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-900'
                    }`}
                  >
                    <h2 className="font-mono text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-500" /> Operational Role Distribution
                    </h2>
                    <div className="space-y-3 font-mono text-xs">
                      {Object.entries(overview.metrics?.role_distribution || {}).map(([r, count]) => (
                        <div
                          key={r}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            isLight ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-zinc-800'
                          }`}
                        >
                          <span className="font-bold">{r}</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">
                            {count} accounts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    className={`p-6 rounded-xl border ${
                      isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-900'
                    }`}
                  >
                    <h2 className="font-mono text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-500" /> Recent Cryptographic Security Events
                    </h2>
                    <div className="space-y-2 font-mono text-xs">
                      {overview.recent_security_events?.map((ev) => (
                        <div
                          key={ev.id}
                          className={`p-3 rounded-lg border flex items-center justify-between ${
                            isLight ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-zinc-800'
                          }`}
                        >
                          <div>
                            <span className="font-bold block text-emerald-500">{ev.event_type}</span>
                            <span className="text-[11px] opacity-60">
                              {ev.actor_email} &bull; {ev.action}
                            </span>
                          </div>
                          <span className="text-[10px] opacity-40">
                            {new Date(ev.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. USERS & ROLES TAB */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 max-w-md">
                    <div className="relative flex-1">
                      <Search
                        className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                          isLight ? 'text-zinc-400' : 'text-zinc-500'
                        }`}
                      />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Search by name, email, or username..."
                        className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors ${
                          isLight ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-800'
                        }`}
                      />
                    </div>
                    <button
                      onClick={loadTabContent}
                      className="px-3 py-2 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-mono hover:opacity-90 transition-opacity"
                    >
                      Filter
                    </button>
                  </div>

                  <span className="font-mono text-xs opacity-60">
                    Total: {usersList.length} Accounts Listed
                  </span>
                </div>

                {/* Users Table */}
                <div
                  className={`rounded-xl border overflow-x-auto ${
                    isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-900'
                  }`}
                >
                  <table className="w-full text-left text-xs font-mono">
                    <thead
                      className={`border-b text-[11px] uppercase ${
                        isLight ? 'bg-zinc-100 text-zinc-600 border-zinc-200' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      <tr>
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Workspace</th>
                        <th className="py-3 px-4">Role Clearance</th>
                        <th className="py-3 px-4">Email Verified</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-900">
                      {usersList.map((u) => (
                        <tr
                          key={u.id}
                          className={`hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50 transition-colors ${
                            !u.is_active ? 'opacity-50' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <span className="font-bold block text-sm">{u.full_name || u.username}</span>
                            <span className="opacity-60 text-[11px]">{u.email}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium">{u.workspace_name || u.org_name || 'TeleSol Default'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={u.role}
                              disabled={actionLoading || u.id === user.id}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className={`px-2 py-1 text-xs rounded border focus:outline-none ${
                                isLight ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-700'
                              }`}
                            >
                              <option value="PLATFORM_ADMIN">PLATFORM_ADMIN</option>
                              <option value="WORKSPACE_OWNER">WORKSPACE_OWNER</option>
                              <option value="NOC_OPERATOR">NOC_OPERATOR</option>
                              <option value="FINANCE">FINANCE</option>
                              <option value="ANALYST">ANALYST</option>
                              <option value="SERVICE_PROVIDER">SERVICE_PROVIDER</option>
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            {u.email_verified ? (
                              <span className="inline-flex items-center gap-1 text-emerald-500 font-bold">
                                <CheckCircle className="w-3.5 h-3.5" /> Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-500 font-medium">
                                <AlertCircle className="w-3.5 h-3.5" /> Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {u.is_active ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                                SUSPENDED
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {u.id !== user.id && (
                              <button
                                onClick={() => handleStatusToggle(u.id, u.is_active)}
                                disabled={actionLoading}
                                className={`px-2.5 py-1 rounded text-xs transition-colors border ${
                                  u.is_active
                                    ? 'border-red-500/30 text-red-500 hover:bg-red-500/10'
                                    : 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10'
                                }`}
                              >
                                {u.is_active ? 'Suspend' : 'Activate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. WORKSPACES TAB */}
            {activeTab === 'workspaces' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs opacity-60">
                    Active Multi-Tenant Isolation: {workspacesList.length} Workspaces
                  </span>
                  <button
                    onClick={() => setShowWorkspaceModal(true)}
                    className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>Create Workspace</span>
                  </button>
                </div>

                <div
                  className={`rounded-xl border overflow-x-auto ${
                    isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-900'
                  }`}
                >
                  <table className="w-full text-left text-xs font-mono">
                    <thead
                      className={`border-b text-[11px] uppercase ${
                        isLight ? 'bg-zinc-100 text-zinc-600 border-zinc-200' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      <tr>
                        <th className="py-3 px-4">Workspace</th>
                        <th className="py-3 px-4">Slug Identifier</th>
                        <th className="py-3 px-4">Owner Contact</th>
                        <th className="py-3 px-4">Members</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-900">
                      {workspacesList.map((ws) => (
                        <tr key={ws.id} className="hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50">
                          <td className="py-3 px-4">
                            <span className="font-bold block text-sm">{ws.name}</span>
                            <span className="opacity-60 text-[11px]">{ws.description || 'Enterprise Workspace'}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-emerald-500">{ws.slug}</td>
                          <td className="py-3 px-4">
                            <span className="block">{ws.owner_name || 'System Admin'}</span>
                            <span className="opacity-60 text-[11px]">{ws.owner_email || 'admin@telesol.io'}</span>
                          </td>
                          <td className="py-3 px-4 font-bold">{ws.member_count || 1} members</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              ACTIVE
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. SECURITY AUDIT LOG TAB */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs opacity-60">
                    Cryptographic Tamper-Evident SHA-256 Audit Trail
                  </span>
                  <button
                    onClick={loadTabContent}
                    className="p-1.5 rounded-lg border text-xs font-mono flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </button>
                </div>

                <div
                  className={`rounded-xl border overflow-x-auto ${
                    isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-900'
                  }`}
                >
                  <table className="w-full text-left text-xs font-mono">
                    <thead
                      className={`border-b text-[11px] uppercase ${
                        isLight ? 'bg-zinc-100 text-zinc-600 border-zinc-200' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      <tr>
                        <th className="py-3 px-4">Event Type</th>
                        <th className="py-3 px-4">Actor</th>
                        <th className="py-3 px-4">Outcome</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Cryptographic Hash Chaining</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-900">
                      {securityEvents.map((ev) => (
                        <tr key={ev.id} className="hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50">
                          <td className="py-3 px-4">
                            <span className="font-bold block text-emerald-500">{ev.event_type}</span>
                            <span className="opacity-60 text-[10px]">{ev.id}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span>{ev.actor_email || ev.actor_id || 'System'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                ev.outcome === 'SUCCESS'
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-500 border border-red-500/20'
                              }`}
                            >
                              {ev.outcome}
                            </span>
                          </td>
                          <td className="py-3 px-4 opacity-70">
                            {new Date(ev.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-mono text-[10px]">
                            <div className="flex flex-col gap-0.5">
                              <span className="opacity-50">PREV: {ev.prev_hash ? ev.prev_hash.slice(0, 16) + '...' : '0000000000000000...'}</span>
                              <span className="text-emerald-500 font-bold">HASH: {ev.hash?.slice(0, 20)}...</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. INTEGRATIONS TAB */}
            {activeTab === 'integrations' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {integrations.map((integ) => (
                  <div
                    key={integ.id}
                    className={`p-5 rounded-xl border flex flex-col justify-between ${
                      isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-mono text-sm font-bold">{integ.name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            integ.status === 'configured' || integ.status === 'active' || integ.status === 'connected'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}
                        >
                          {integ.status.toUpperCase()}
                        </span>
                      </div>
                      <p className={`text-xs mb-4 ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                        {integ.description}
                      </p>
                    </div>

                    <div
                      className={`p-3 rounded-lg border font-mono text-[11px] ${
                        isLight ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-zinc-800'
                      }`}
                    >
                      {integ.rpc_url && <div>RPC: {integ.rpc_url}</div>}
                      {integ.chain_id && <div>Chain ID: {integ.chain_id}</div>}
                      {integ.port && <div>Service Port: {integ.port}</div>}
                      {integ.provider && <div>Email Engine: {integ.provider}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 6. SETTINGS TAB */}
            {activeTab === 'settings' && settings && (
              <div
                className={`p-6 rounded-xl border max-w-2xl font-mono text-xs space-y-4 ${
                  isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-900'
                }`}
              >
                <h2 className="text-sm font-bold uppercase tracking-wider mb-2">Platform Governance Policies</h2>
                <div className="space-y-3">
                  {Object.entries(settings).map(([key, val]) => (
                    <div
                      key={key}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isLight ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-zinc-800'
                      }`}
                    >
                      <span className="font-medium">{key.replace(/_/g, ' ').toUpperCase()}</span>
                      <span className="font-bold text-emerald-500">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Workspace Creation Modal */}
      {showWorkspaceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md p-6 rounded-xl border shadow-2xl ${
              isLight ? 'bg-white border-zinc-200 text-zinc-950' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
            }`}
          >
            <h3 className="text-lg font-bold mb-1 font-mono">Provision Workspace</h3>
            <p className={`text-xs mb-4 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Creates an isolated tenant organization workspace with separate budget and member access.
            </p>

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-medium mb-1">WORKSPACE NAME</label>
                <input
                  type="text"
                  required
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  placeholder="e.g. TeleSol Munster NOC"
                  className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none ${
                    isLight ? 'bg-zinc-50 border-zinc-300' : 'bg-zinc-900 border-zinc-700'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium mb-1">DESCRIPTION</label>
                <textarea
                  value={newWsDesc}
                  onChange={(e) => setNewWsDesc(e.target.value)}
                  placeholder="Operational scope and purpose"
                  rows={3}
                  className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none ${
                    isLight ? 'bg-zinc-50 border-zinc-300' : 'bg-zinc-900 border-zinc-700'
                  }`}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowWorkspaceModal(false)}
                  className={`px-3 py-2 text-xs rounded-lg border ${
                    isLight ? 'border-zinc-300 text-zinc-700' : 'border-zinc-800 text-zinc-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-50"
                >
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
