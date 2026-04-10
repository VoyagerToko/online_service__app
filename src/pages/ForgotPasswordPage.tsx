import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { authApi } from '../api/client';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsSubmitting(true);

    try {
      await authApi.forgotPassword(email);
      setMessage('If your email is registered, a password reset link has been sent.');
    } catch (err: any) {
      setError(err?.message || 'Unable to process request right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-28 pb-20 px-6 max-w-xl mx-auto">
      <Card className="p-8 md:p-10">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600 mb-6">
          <ArrowLeft size={16} /> Back to Login
        </Link>

        <h1 className="text-3xl font-display font-bold dark:text-white mb-2">Forgot Password</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">Enter your account email and we will send a password reset link.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
            />
          </div>

          {message && <p className="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-4 py-3">{message}</p>}
          {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">{error}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>
      </Card>
    </div>
  );
};
