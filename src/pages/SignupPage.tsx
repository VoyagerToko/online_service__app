import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, User, Phone, ArrowRight, ShieldCheck, Briefcase } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/client';

const SPECIALTIES = [
  'Electrician', 'Plumber', 'Cleaner', 'Painter',
  'Carpenter', 'AC Technician', 'Appliance Repair', 'Other',
];

export const SignupPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'professional'>('user');
  const [specialty, setSpecialty] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'professional' && !specialty) {
      setError('Please select your specialty.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await authApi.register({ name, email, phone, password, role, specialty: role === 'professional' ? specialty : undefined });
      await login(email, password);
      navigate(role === 'professional' ? '/pro-dashboard' : '/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-20 flex items-center justify-center px-6 bg-slate-50 dark:bg-slate-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl grid md:grid-cols-2 bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
      >
        <div className="gradient-bg p-12 text-white hidden md:flex flex-col justify-between">
          <div>
            <h2 className="text-4xl font-display font-bold mb-6">Join the <br />Community.</h2>
            <p className="text-white/80 leading-relaxed">
              Experience the future of home services with verified professionals and transparent pricing.
            </p>
          </div>
          <div className="space-y-6">
            {[
              'Verified Professionals',
              'Transparent Pricing',
              '24/7 Priority Support',
              'Service Warranty'
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <ShieldCheck size={14} />
                </div>
                <span className="text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-10 lg:p-12">
          <div className="mb-8">
            <h1 className="text-2xl font-display font-bold dark:text-white mb-2">Create Account</h1>
            <p className="text-slate-500 text-sm">Start booking premium services today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Role Toggle */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">I am a</label>
              <div className="grid grid-cols-2 gap-2">
                {(['user', 'professional'] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 text-sm font-bold transition-all ${
                      role === r
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {r === 'user' ? <User size={16} /> : <Briefcase size={16} />}
                    {r === 'user' ? 'Customer' : 'Professional'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Full Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white text-sm"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white text-sm"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Phone Number</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white text-sm"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            {/* Specialty — only shown for professionals */}
            {role === 'professional' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Your Specialty</label>
                <div className="relative group">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                  <select
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white text-sm appearance-none"
                  >
                    <option value="">Select your specialty...</option>
                    {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 font-medium bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-2xl">{error}</p>
            )}

            <Button type="submit" disabled={isLoading} className="w-full py-3.5 mt-4">
              {isLoading ? 'Creating account...' : <> Create Account <ArrowRight size={18} className="ml-2" /></>}
            </Button>
          </form>

          <p className="text-center mt-8 text-slate-500 text-sm">
            Already have an account? <Link to="/login" className="text-brand-600 font-bold hover:underline">Log in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
