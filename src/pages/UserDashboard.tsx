import React from 'react';
import { motion } from 'motion/react';
import { Clock, MapPin, Star, ChevronRight, Wallet, History, Settings, Bell, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const UserDashboard: React.FC = () => {
  const { user } = useAuth();

  const activeBookings = [
    {
      id: 'B1024',
      service: 'AC Deep Cleaning',
      status: 'In Progress',
      pro: 'Rahul Sharma',
      time: 'Today, 2:00 PM',
      step: 2,
    }
  ];

  return (
    <div className="pt-28 pb-20 px-6 max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-8 text-center bg-brand-600 border-none shadow-brand-500/20">
            <div className="relative inline-block mb-4">
              <img src={user?.avatar} alt={user?.name} className="w-24 h-24 rounded-full border-4 border-white/20 mx-auto" />
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-4 border-brand-600 rounded-full"></div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">{user?.name}</h3>
            <p className="text-white/70 text-sm mb-6">{user?.email}</p>
            <div className="bg-white/10 rounded-2xl p-4 flex justify-between items-center">
              <div className="text-left">
                <p className="text-xs text-white/60 uppercase font-bold tracking-wider">Wallet</p>
                <p className="text-lg font-bold text-white">₹{user?.walletBalance}</p>
              </div>
              <Button size="sm" className="bg-white text-brand-600 hover:bg-white/90 shadow-none px-3">Add</Button>
            </div>
          </Card>

          <div className="space-y-2">
            {[
              { icon: <Clock size={20} />, label: 'Active Bookings', active: true },
              { icon: <History size={20} />, label: 'Service History' },
              { icon: <MapPin size={20} />, label: 'Saved Addresses' },
              { icon: <Star size={20} />, label: 'My Professionals' },
              { icon: <Settings size={20} />, label: 'Settings' },
            ].map((item, i) => (
              <button
                key={i}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${
                  item.active 
                    ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-bold' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-display font-bold dark:text-white mb-2">Welcome back, {user?.name.split(' ')[0]}!</h1>
              <p className="text-slate-500 dark:text-slate-400">You have 1 active service today.</p>
            </div>
            <Button variant="outline" className="hidden md:flex">Book New Service</Button>
          </div>

          {/* Active Booking Tracking */}
          {activeBookings.map((booking) => (
            <Card key={booking.id} className="p-0 overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Booking ID: {booking.id}</p>
                    <h4 className="text-xl font-bold dark:text-white">{booking.service}</h4>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase">
                    {booking.status}
                  </span>
                  <p className="text-sm text-slate-500 mt-1">{booking.time}</p>
                </div>
              </div>

              <div className="p-8">
                <div className="flex justify-between mb-12 relative">
                  {/* Progress Line */}
                  <div className="absolute top-5 left-0 w-full h-1 bg-slate-200 dark:bg-slate-700 -z-10">
                    <div className="h-full bg-brand-500 transition-all duration-1000" style={{ width: '50%' }}></div>
                  </div>

                  {[
                    { label: 'Confirmed', completed: true },
                    { label: 'On the Way', completed: true },
                    { label: 'In Progress', active: true },
                    { label: 'Completed', completed: false },
                  ].map((step, i) => (
                    <div key={i} className="flex flex-col items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${
                        step.completed ? 'bg-brand-500 border-brand-100 dark:border-brand-900 text-white' : 
                        step.active ? 'bg-white dark:bg-slate-900 border-brand-500 text-brand-500' : 
                        'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-300'
                      }`}>
                        {step.completed ? <ShieldCheck size={18} /> : (i + 1)}
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-tight ${
                        step.completed || step.active ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                      }`}>{step.label}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-50 dark:bg-slate-800/30 p-6 rounded-3xl">
                  <div className="flex items-center gap-4">
                    <img src="https://picsum.photos/seed/rahul/200/200" alt="Pro" className="w-14 h-14 rounded-2xl object-cover" />
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase">Your Professional</p>
                      <h5 className="font-bold dark:text-white text-lg">{booking.pro}</h5>
                      <div className="flex items-center gap-1 text-yellow-500 text-sm">
                        <Star size={14} fill="currentColor" /> 4.9 (450 jobs)
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <Button variant="outline" className="flex-1 md:flex-none">Message</Button>
                    <Button className="flex-1 md:flex-none">Call Technician</Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 flex items-center gap-4 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center">
                <Wallet size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Refer & Earn</p>
                <p className="text-xs text-slate-500">Get ₹200 for each friend</p>
              </div>
            </Card>
            <Card className="p-6 flex items-center gap-4 bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
              <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center">
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">Servify Plus</p>
                <p className="text-xs text-slate-500">Save 15% on all bookings</p>
              </div>
            </Card>
            <Card className="p-6 flex items-center gap-4 bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/30">
              <div className="w-12 h-12 rounded-2xl bg-purple-500 text-white flex items-center justify-center">
                <Bell size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-purple-600 dark:text-purple-400">Help Center</p>
                <p className="text-xs text-slate-500">24/7 Support available</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
