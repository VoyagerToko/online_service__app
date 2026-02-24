import React from 'react';
import { motion } from 'motion/react';
import { Users, ShieldCheck, AlertTriangle, TrendingUp, Search, Filter, MoreVertical, CheckCircle, XCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const AdminDashboard: React.FC = () => {
  const stats = [
    { label: 'Total Users', value: '12,450', change: '+12%', icon: <Users /> },
    { label: 'Active Pros', value: '850', change: '+5%', icon: <ShieldCheck /> },
    { label: 'Open Disputes', value: '14', change: '-2%', icon: <AlertTriangle /> },
    { label: 'Monthly Revenue', value: '₹12.4L', change: '+18%', icon: <TrendingUp /> },
  ];

  const pendingKYC = [
    { id: 'K-101', name: 'Suresh Kumar', service: 'Plumbing', submitted: '2h ago' },
    { id: 'K-102', name: 'Vikram Singh', service: 'Electrician', submitted: '5h ago' },
    { id: 'K-103', name: 'Anita Rao', service: 'Cleaning', submitted: '1d ago' },
  ];

  return (
    <div className="pt-28 pb-20 px-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-display font-bold dark:text-white mb-2">Admin Panel</h1>
          <p className="text-slate-500 dark:text-slate-400">Platform overview and management</p>
        </div>
        <Button>Generate Report</Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((stat, i) => (
          <Card key={i} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 flex items-center justify-center">
                {stat.icon}
              </div>
              <span className={`text-xs font-bold ${stat.change.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>
                {stat.change}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-bold dark:text-white">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Management Area */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold dark:text-white">Recent Professionals</h3>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" placeholder="Search..." className="pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm outline-none w-40" />
                </div>
                <Button variant="outline" size="sm"><Filter size={16} /></Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Professional</th>
                    <th className="px-6 py-4">Service</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Rating</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {[
                    { name: 'Rahul Sharma', service: 'Electrician', status: 'Active', rating: '4.9' },
                    { name: 'Amit Kumar', service: 'Plumbing', status: 'On Job', rating: '4.7' },
                    { name: 'Priya Verma', service: 'Cleaning', status: 'Inactive', rating: '4.8' },
                  ].map((pro, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                          <span className="font-medium dark:text-white">{pro.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{pro.service}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          pro.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 
                          pro.status === 'On Job' ? 'bg-blue-100 text-blue-600' : 
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {pro.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold dark:text-white">{pro.rating}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* KYC Queue */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold dark:text-white">KYC Approval Queue</h2>
            <span className="text-xs font-bold text-slate-500">{pendingKYC.length} Pending</span>
          </div>

          {pendingKYC.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold dark:text-white">{item.name}</h4>
                  <p className="text-xs text-slate-500">{item.service} • {item.submitted}</p>
                </div>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold">{item.id}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 border-red-200 text-red-500 hover:bg-red-50"><XCircle size={16} className="mr-1" /> Reject</Button>
                <Button size="sm" className="flex-1 bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"><CheckCircle size={16} className="mr-1" /> Approve</Button>
              </div>
            </Card>
          ))}

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
    </div>
  );
};
