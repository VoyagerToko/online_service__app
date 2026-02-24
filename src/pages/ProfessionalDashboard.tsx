import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Users, Briefcase, Star, DollarSign, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const ProfessionalDashboard: React.FC = () => {
  const { user } = useAuth();

  const stats = [
    { label: 'Total Earnings', value: '₹45,200', icon: <DollarSign />, color: 'bg-emerald-500' },
    { label: 'Jobs Completed', value: '124', icon: <CheckCircle />, color: 'bg-blue-500' },
    { label: 'Avg Rating', value: '4.9', icon: <Star />, color: 'bg-yellow-500' },
    { label: 'Pending Jobs', value: '3', icon: <Clock />, color: 'bg-brand-500' },
  ];

  const recentRequests = [
    { id: 'R-9021', service: 'AC Repair', customer: 'Amit Singh', location: 'Sector 45, Gurgaon', price: '₹599', time: 'Today, 4:00 PM' },
    { id: 'R-9022', service: 'Fan Installation', customer: 'Priya Verma', location: 'DLF Phase 3', price: '₹299', time: 'Tomorrow, 10:00 AM' },
  ];

  return (
    <div className="pt-28 pb-20 px-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-display font-bold dark:text-white mb-2">Pro Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage your earnings and service requests</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">Manage Availability</Button>
          <Button>Withdraw Funds</Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((stat, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl ${stat.color} text-white flex items-center justify-center shadow-lg shadow-current/20`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold dark:text-white">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Requests */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold dark:text-white">New Service Requests</h2>
            <span className="text-brand-600 text-sm font-bold cursor-pointer">View All</span>
          </div>

          {recentRequests.map((req) => (
            <Card key={req.id} className="p-6">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-brand-600">
                    <Briefcase size={28} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-lg font-bold dark:text-white">{req.service}</h4>
                      <span className="text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-600 px-2 py-0.5 rounded-full font-bold">{req.id}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{req.customer} • {req.location}</p>
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-tight">
                      <span className="flex items-center gap-1"><Clock size={14} /> {req.time}</span>
                      <span className="flex items-center gap-1 text-emerald-600"><DollarSign size={14} /> {req.price}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 md:flex-col justify-center">
                  <Button variant="outline" className="flex-1 md:flex-none">Reject</Button>
                  <Button className="flex-1 md:flex-none">Accept Job</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Performance & Calendar */}
        <div className="space-y-8">
          <Card className="p-8">
            <h3 className="text-lg font-bold dark:text-white mb-6">Performance Rating</h3>
            <div className="text-center mb-8">
              <p className="text-5xl font-bold dark:text-white mb-2">4.9</p>
              <div className="flex justify-center gap-1 text-yellow-500 mb-2">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={20} fill="currentColor" />)}
              </div>
              <p className="text-sm text-slate-500">Top 5% of professionals in Gurgaon</p>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Punctuality', value: 98 },
                { label: 'Communication', value: 95 },
                { label: 'Quality of Work', value: 100 },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs font-bold uppercase mb-1">
                    <span className="text-slate-500">{item.label}</span>
                    <span className="text-brand-600">{item.value}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500" style={{ width: `${item.value}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-8 bg-slate-50 dark:bg-slate-800/30 border-none">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-brand-500" />
              <h4 className="font-bold dark:text-white">Pro Tip</h4>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Accepting jobs within 5 minutes increases your visibility by 20%. Keep your app notifications on!
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
