import React, { useEffect, useMemo, useState } from 'react';
import { Users, ShieldCheck, AlertTriangle, TrendingUp, Search, Filter, MoreVertical, CheckCircle, XCircle, Ban, ShieldOff, ShieldPlus, Trash2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { adminApi, professionalsApi, usersApi, type AdminAccount, type AnalyticsSummary, type KycDocument, type Professional } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

type ProStatusFilter = 'all' | 'active' | 'on-job' | 'inactive';
type AccountRoleFilter = 'all' | 'user' | 'professional' | 'admin';

const EMPTY_ANALYTICS: AnalyticsSummary = {
  total_users: 0,
  total_professionals: 0,
  total_bookings: 0,
  completed_bookings: 0,
  cancelled_bookings: 0,
  cancellation_rate: 0,
  total_revenue: 0,
  open_disputes: 0,
  pending_kyc: 0,
};

function timeAgo(iso: string): string {
  const stamp = new Date(iso).getTime();
  if (!Number.isFinite(stamp)) return 'just now';
  const diffMs = Date.now() - stamp;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProStatusFilter>('all');
  const [accountSearch, setAccountSearch] = useState('');
  const [accountRoleFilter, setAccountRoleFilter] = useState<AccountRoleFilter>('all');
  const [analytics, setAnalytics] = useState<AnalyticsSummary>(EMPTY_ANALYTICS);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [pendingKYC, setPendingKYC] = useState<KycDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [accountActionLoading, setAccountActionLoading] = useState<string | null>(null);
  const [isDeletingOwnAccount, setIsDeletingOwnAccount] = useState(false);

  useEffect(() => {
    Promise.all([
      adminApi.analytics(),
      professionalsApi.list(),
      adminApi.listKyc('pending'),
      adminApi.listUsers({ limit: 200 }),
    ])
      .then(([analyticsData, pros, kyc, allAccounts]) => {
        setAnalytics(analyticsData);
        setProfessionals(pros);
        setPendingKYC(kyc);
        setAccounts(allAccounts);
      })
      .catch((err: Error) => {
        setError(err.message || 'Unable to load admin data');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const recentPros = useMemo(() => {
    return professionals
      .map((pro) => {
        const status = pro.is_suspended ? 'Inactive' : pro.is_available ? 'Active' : 'On Job';
        return {
          id: pro.id,
          name: pro.name ?? `Pro ${pro.id.slice(0, 6)}`,
          service: pro.specialty,
          status,
          rating: pro.avg_rating.toFixed(1),
        };
      })
      .sort((a, b) => Number(b.rating) - Number(a.rating));
  }, [professionals]);

  const stats = [
    { label: 'Total Users', value: analytics.total_users.toLocaleString(), change: `${analytics.total_bookings.toLocaleString()} bookings`, icon: <Users /> },
    { label: 'Active Pros', value: professionals.filter((p) => p.is_available && !p.is_suspended).length.toLocaleString(), change: `${analytics.total_professionals.toLocaleString()} total`, icon: <ShieldCheck /> },
    { label: 'Open Disputes', value: analytics.open_disputes.toLocaleString(), change: `${analytics.pending_kyc.toLocaleString()} KYC pending`, icon: <AlertTriangle /> },
    { label: 'Monthly Revenue', value: `₹${analytics.total_revenue.toLocaleString()}`, change: `${analytics.cancellation_rate.toFixed(2)}% cancellation`, icon: <TrendingUp /> },
  ];

  const filteredPros = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return recentPros.filter((pro) => {
      const matchesSearch =
        !normalizedSearch ||
        pro.name.toLowerCase().includes(normalizedSearch) ||
        pro.service.toLowerCase().includes(normalizedSearch);

      const matchesFilter =
        statusFilter === 'all' ||
        (statusFilter === 'active' && pro.status === 'Active') ||
        (statusFilter === 'on-job' && pro.status === 'On Job') ||
        (statusFilter === 'inactive' && pro.status === 'Inactive');

      return matchesSearch && matchesFilter;
    });
  }, [searchTerm, statusFilter, recentPros]);

  const filteredAccounts = useMemo(() => {
    const normalizedSearch = accountSearch.trim().toLowerCase();

    return accounts.filter((account) => {
      if (!account.is_active) return false;

      const matchesSearch =
        !normalizedSearch ||
        account.name.toLowerCase().includes(normalizedSearch) ||
        account.email.toLowerCase().includes(normalizedSearch);

      const matchesRole = accountRoleFilter === 'all' || account.role === accountRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [accounts, accountSearch, accountRoleFilter]);

  const proById = useMemo(() => {
    const map = new Map<string, Professional>();
    professionals.forEach((pro) => map.set(pro.id, pro));
    return map;
  }, [professionals]);

  const refreshAccounts = async () => {
    const allAccounts = await adminApi.listUsers({ limit: 200 });
    setAccounts(allAccounts);
  };

  const runAccountAction = async (loadingKey: string, action: () => Promise<unknown>) => {
    setError('');
    setAccountActionLoading(loadingKey);
    try {
      await action();
      await refreshAccounts();
    } catch (err: any) {
      setError(err?.message || 'Failed to perform account action');
    } finally {
      setAccountActionLoading(null);
    }
  };

  const handleDeleteMyAccount = async () => {
    const confirmed = window.confirm('This will permanently deactivate your admin account. Continue?');
    if (!confirmed) return;

    setError('');
    setIsDeletingOwnAccount(true);
    try {
      await usersApi.deleteMe();
      logout();
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Failed to delete account');
    } finally {
      setIsDeletingOwnAccount(false);
    }
  };

  const cycleStatusFilter = () => {
    const order: ProStatusFilter[] = ['all', 'active', 'on-job', 'inactive'];
    const index = order.indexOf(statusFilter);
    setStatusFilter(order[(index + 1) % order.length]);
  };

  const exportReport = () => {
    const rows = [
      ['Metric', 'Value', 'Change'],
      ...stats.map((stat) => [stat.label, stat.value, stat.change]),
      [],
      ['Pending KYC ID', 'Professional', 'Service'],
      ...pendingKYC.map((item) => {
        const pro = proById.get(item.pro_id);
        return [item.id, pro?.name ?? item.pro_id, pro?.specialty ?? 'Unknown'];
      }),
    ];

    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `servify-admin-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleKycDecision = async (id: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await adminApi.approveKyc(id);
      } else {
        await adminApi.rejectKyc(id);
      }
      setPendingKYC((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="pt-32 pb-24 px-8 max-w-7xl mx-auto">
      <div className="rounded-2xl border border-brand-200/30 bg-brand-50/60 p-6 flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Admin Panel</h1>
          <p className="text-slate-500">Platform overview and management</p>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button onClick={exportReport}>Generate Report</Button>
          <Button variant="danger" onClick={handleDeleteMyAccount} disabled={isDeletingOwnAccount}>
            {isDeletingOwnAccount ? 'Deleting...' : 'Delete My Account'}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((stat, i) => (
          <Card key={i} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                {stat.icon}
              </div>
              <span className={`text-xs font-bold ${stat.change.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>
                {stat.change}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-bold">{stat.value}</p>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Loading analytics...</div>
      ) : (
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Management Area */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="p-6 border-b border-brand-200/30 flex justify-between items-center">
              <h3 className="font-bold">Recent Professionals</h3>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-xl bg-slate-50 border-none text-sm outline-none w-40"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={cycleStatusFilter}>
                  <Filter size={16} />
                  <span className="ml-1 capitalize">{statusFilter}</span>
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Professional</th>
                    <th className="px-6 py-4">Service</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Rating</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-200/30">
                  {filteredPros.map((pro, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                          <span className="font-medium">{pro.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{pro.service}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          pro.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 
                          pro.status === 'On Job' ? 'bg-blue-100 text-blue-600' : 
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {pro.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold">{pro.rating}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          className="text-slate-400 hover:text-slate-600"
                          onClick={() => setSearchTerm(pro.name)}
                          title="Filter by this professional"
                        >
                          <MoreVertical size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredPros.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-sm">No professionals match your current search/filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="p-6 border-b border-brand-200/30 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <h3 className="font-bold">Account Management</h3>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search accounts..."
                    value={accountSearch}
                    onChange={(e) => setAccountSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-xl bg-slate-50 border-none text-sm outline-none w-56"
                  />
                </div>
                <select
                  value={accountRoleFilter}
                  onChange={(e) => setAccountRoleFilter(e.target.value as AccountRoleFilter)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border-none text-sm outline-none"
                >
                  <option value="all">All Roles</option>
                  <option value="user">Users</option>
                  <option value="professional">Professionals</option>
                  <option value="admin">Admins</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-200/30">
                  {filteredAccounts.map((account) => {
                    const isSelf = account.id === user?.id;
                    const blockKey = `block-${account.id}`;
                    const suspendKey = `suspend-${account.id}`;
                    const deleteKey = `delete-${account.id}`;

                    return (
                      <tr key={account.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium">{account.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{account.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                            account.role === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : account.role === 'professional'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}>
                            {account.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                              !account.is_active
                                ? 'bg-slate-200 text-slate-700'
                                : account.is_blocked
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {!account.is_active ? 'Deleted' : account.is_blocked ? 'Blocked' : 'Active'}
                            </span>
                            {account.role === 'professional' && account.is_suspended && (
                              <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-700">
                                Suspended
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isSelf || !account.is_active || accountActionLoading === blockKey}
                              className={account.is_blocked ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50' : 'border-red-200 text-red-600 hover:bg-red-50'}
                              onClick={() => runAccountAction(blockKey, () => account.is_blocked ? adminApi.unblockUser(account.id) : adminApi.blockUser(account.id))}
                            >
                              {accountActionLoading === blockKey ? '...' : account.is_blocked ? <><ShieldPlus size={14} className="mr-1" /> Unban</> : <><Ban size={14} className="mr-1" /> Ban</>}
                            </Button>

                            {account.role === 'professional' && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isSelf || !account.is_active || accountActionLoading === suspendKey}
                                className={account.is_suspended ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50' : 'border-amber-200 text-amber-700 hover:bg-amber-50'}
                                onClick={() => runAccountAction(suspendKey, () => account.is_suspended ? adminApi.reinstateUser(account.id) : adminApi.suspendUser(account.id))}
                              >
                                {accountActionLoading === suspendKey ? '...' : account.is_suspended ? <><ShieldCheck size={14} className="mr-1" /> Reinstate</> : <><ShieldOff size={14} className="mr-1" /> Suspend</>}
                              </Button>
                            )}

                            <Button
                              variant="danger"
                              size="sm"
                              disabled={isSelf || accountActionLoading === deleteKey}
                              onClick={() => {
                                const confirmed = window.confirm(`Delete account for ${account.email}?`);
                                if (!confirmed) return;
                                runAccountAction(deleteKey, () => adminApi.deleteUser(account.id));
                              }}
                            >
                              {accountActionLoading === deleteKey ? '...' : <><Trash2 size={14} className="mr-1" /> Delete</>}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredAccounts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-sm">No accounts match your current filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* KYC Queue */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">KYC Approval Queue</h2>
            <span className="text-xs font-bold text-slate-500">{pendingKYC.length} Pending</span>
          </div>

          {pendingKYC.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold">{proById.get(item.pro_id)?.name ?? `Pro ${item.pro_id.slice(0, 6)}`}</h4>
                  <p className="text-xs text-slate-500">{proById.get(item.pro_id)?.specialty ?? 'Unknown Service'} • {timeAgo(item.created_at)}</p>
                </div>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-bold">{item.id}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-red-200 text-red-500 hover:bg-red-50"
                  onClick={() => handleKycDecision(item.id, 'reject')}
                >
                  <XCircle size={16} className="mr-1" /> Reject
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                  onClick={() => handleKycDecision(item.id, 'approve')}
                >
                  <CheckCircle size={16} className="mr-1" /> Approve
                </Button>
              </div>
            </Card>
          ))}

          {pendingKYC.length === 0 && (
            <Card className="p-6 text-center text-slate-400">No pending KYC items.</Card>
          )}

          <Card className="p-6 bg-brand-600 text-white border-none shadow-brand-500/20">
            <h4 className="font-bold mb-2">Platform Health</h4>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-3xl font-bold">99.9%</p>
                <p className="text-xs text-white/70">Uptime this month</p>
              </div>
              <TrendingUp size={40} className="opacity-20" />
            </div>
          </Card>
        </div>
      </div>
      )}
    </div>
  );
};
