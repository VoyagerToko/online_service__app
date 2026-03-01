import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Star, ShieldCheck, Clock, MapPin, CheckCircle2, ArrowLeft, FileText, Calendar } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { professionalsApi, bookingsApi, type Professional } from '../api/client';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const TIME_SLOTS = [
  '09:00 AM - 11:00 AM',
  '11:00 AM - 01:00 PM',
  '02:00 PM - 04:00 PM',
  '04:00 PM - 06:00 PM',
  '06:00 PM - 08:00 PM',
];

export const BookingFlow: React.FC = () => {
  const { proId } = useParams<{ proId: string }>();
  const navigate = useNavigate();
  const [pro, setPro] = useState<Professional | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [booked, setBooked] = useState(false);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const minDate = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!proId) return;
    professionalsApi.get(proId)
      .then(setPro)
      .catch(() => setPro(null))
      .finally(() => setIsLoading(false));
  }, [proId]);

  const handleSubmit = async () => {
    if (!description.trim()) { setError('Please describe the work needed.'); return; }
    if (!address.trim()) { setError('Please enter the service address.'); return; }
    if (!date) { setError('Please select a preferred date.'); return; }
    if (!timeSlot) { setError('Please select a preferred time slot.'); return; }
    setError('');
    setIsSubmitting(true);
    try {
      await bookingsApi.create({ pro_id: proId, description, address, scheduled_date: date, time_slot: timeSlot });
      setBooked(true);
    } catch (err: any) {
      setError(err.message || 'Booking failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="pt-28 pb-20 px-6 text-center text-slate-400">Loading professional...</div>;
  if (!pro) return <div className="pt-28 pb-20 px-6 text-center text-slate-400">Professional not found.</div>;

  if (booked) {
    return (
      <div className="pt-28 pb-20 px-6 max-w-lg mx-auto text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500 mx-auto">
            <CheckCircle2 size={52} />
          </div>
          <h2 className="text-3xl font-bold dark:text-white">Request Sent!</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Your booking request has been sent to the <strong className="text-slate-700 dark:text-slate-200">{pro.specialty}</strong>.
            Check your dashboard for updates.
          </p>
          <Button size="lg" onClick={() => navigate('/dashboard')}>Go to My Dashboard</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20 px-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/professionals')}
        className="flex items-center gap-2 text-slate-500 hover:text-brand-600 mb-8 transition-colors text-sm font-medium"
      >
        <ArrowLeft size={16} /> Back to Professionals
      </button>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card className="p-6 sticky top-28 text-center">
            <div className="w-20 h-20 rounded-3xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 text-3xl font-bold mx-auto mb-4">
              {pro.specialty.charAt(0)}
            </div>
            {pro.is_kyc_verified && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 bg-brand-50 dark:bg-brand-900/20 px-3 py-1 rounded-full mb-3">
                <ShieldCheck size={12} /> Verified
              </span>
            )}
            <h3 className="font-bold dark:text-white text-lg mb-1">{pro.specialty}</h3>
            <div className="flex items-center justify-center gap-1 text-yellow-500 text-sm mb-3">
              <Star size={14} fill="currentColor" />
              <span className="font-bold">{pro.avg_rating.toFixed(1)}</span>
              <span className="text-slate-400 font-normal">  {pro.total_jobs} jobs</span>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full inline-block ${pro.is_available ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-500 bg-slate-100 dark:bg-slate-800'}`}>
              {pro.is_available ? ' Available Now' : ' Currently Busy'}
            </span>
            {pro.bio && <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">{pro.bio}</p>}
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div>
            <h1 className="text-2xl font-bold dark:text-white mb-1">Book a {pro.specialty}</h1>
            <p className="text-slate-500 text-sm">Describe your problem and pick a time. The professional will confirm.</p>
          </div>

          <Card className="p-6 space-y-6">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <FileText size={14} /> Describe the work needed *
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="E.g. My ceiling fan stopped working, needs to be checked and repaired or replaced..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-500 outline-none dark:text-white text-sm resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <MapPin size={14} /> Service Address *
              </label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Flat 4B, Sector 45, Gurgaon, Haryana 122003"
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-500 outline-none dark:text-white text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Calendar size={14} /> Preferred Date *
              </label>
              <input
                type="date"
                value={date}
                min={minDate}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-500 outline-none dark:text-white text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Clock size={14} /> Preferred Time *
              </label>
              <div className="grid grid-cols-1 gap-2">
                {TIME_SLOTS.map(slot => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setTimeSlot(slot)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-sm font-medium transition-all ${timeSlot === slot ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}
                  >
                    <Clock size={15} className="shrink-0" />
                    {slot}
                    {timeSlot === slot && <CheckCircle2 size={15} className="ml-auto text-brand-500" />}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {error && (
            <p className="text-sm text-red-500 font-medium bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-2xl">{error}</p>
          )}
          <Button size="lg" className="w-full py-4" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Sending Request...' : 'Send Booking Request'}
          </Button>
        </div>
      </div>
    </div>
  );
};
