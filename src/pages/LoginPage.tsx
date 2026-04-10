import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, User, Phone, ArrowRight, Chrome } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  requiredRole?: 'user' | 'professional' | 'admin';
}

export const LoginPage: React.FC<LoginPageProps> = ({ requiredRole }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const loggedInUser = await login(email, password);

      if (requiredRole && loggedInUser.role !== requiredRole) {
        logout();
        setError(`This login is only for ${requiredRole} accounts.`);
        return;
      }

      navigate(requiredRole === 'admin' ? '/admin/analytics' : '/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="hero-grid absolute inset-x-6 top-10 h-[72%] rounded-[2.5rem] opacity-40" />
        <div className="absolute top-16 right-4 h-64 w-64 rounded-full bg-brand-300/25 blur-3xl" />
        <div className="absolute bottom-8 left-2 h-64 w-64 rounded-full bg-accent-500/18 blur-3xl" />
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="mesh-panel rounded-[2.2rem] p-8 md:p-10 shadow-2xl border border-white/70 dark:border-slate-800/70">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-display font-bold dark:text-white mb-2">Welcome Back</h1>
            <p className="text-slate-500 dark:text-slate-400">
              {requiredRole === 'admin'
                ? 'Admin login portal for account and platform controls.'
                : 'Log in to manage bookings and live service tracking.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/95 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
                <Link to="/forgot-password" className="text-xs text-brand-600 font-bold hover:underline">Forgot?</Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/95 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 font-medium bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-2xl">{error}</p>
            )}

            <Button type="submit" disabled={isLoading} className="w-full py-4 text-lg">
              {isLoading ? 'Signing in...' : <> Sign In <ArrowRight size={20} className="ml-2" /></>}
            </Button>
          </form>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="relative z-10 rounded-full bg-white px-4 text-slate-500 font-bold tracking-widest dark:bg-slate-900">
                Or continue with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl py-3 border-slate-200 dark:border-slate-700"
              onClick={() => window.open('https://accounts.google.com', '_blank', 'noopener,noreferrer')}
            >
              <Chrome size={20} className="mr-2" /> Google
            </Button>
          </div>

          <p className="text-center mt-10 text-slate-500 dark:text-slate-400">
            Don't have an account? <Link to="/signup" className="text-brand-600 font-bold hover:underline">Sign up</Link>
          </p>
          {!requiredRole && (
            <p className="text-center mt-3 text-xs text-slate-500 dark:text-slate-400">
              Admin access: <Link to="/admin/login" className="text-brand-600 font-bold hover:underline">Admin login</Link>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};
