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
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
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
      const created = await bookingsApi.create({ pro_id: proId, description, address, scheduled_date: date, time_slot: timeSlot });
      setCreatedBookingId(created.id);
      setBooked(true);
    } catch (err: any) {
      setError(err.message || 'Booking failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="pt-32 pb-24 px-8 text-center text-slate-400">Loading professional...</div>;
  if (!pro) return <div className="pt-32 pb-24 px-8 text-center text-slate-400">Professional not found.</div>;

  if (booked) {
    return (
      <div className="pt-32 pb-24 px-8 max-w-lg mx-auto text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500 mx-auto">
            <CheckCircle2 size={52} />
          </div>
          <h2 className="text-3xl font-bold">Request Sent!</h2>
          <p className="text-slate-500 max-w-sm mx-auto">
            Your booking request has been sent to the <strong className="text-slate-700">{pro.specialty}</strong>.
            Check your dashboard for updates.
          </p>
          <div className="space-y-3">
            <Button size="lg" className="w-full" onClick={() => navigate('/dashboard')}>Go to My Dashboard</Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => {
                const params = new URLSearchParams({ professionalId: pro.id });
                if (createdBookingId) params.set('bookingId', createdBookingId);
                navigate(`/messages?${params.toString()}`);
              }}
            >
              Message Professional
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 px-8 max-w-7xl mx-auto">
      <button
        onClick={() => navigate('/professionals')}
        className="flex items-center gap-2 text-slate-500 hover:text-brand-500 mb-10 transition-colors text-sm font-semibold"
      >
        <ArrowLeft size={16} /> Back to Professionals
      </button>

      <div className="grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-4">
          <Card className="p-8 sticky top-32 text-center">
            <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-3xl font-bold mx-auto mb-4">
              {pro.specialty.charAt(0)}
            </div>
            {pro.is_kyc_verified && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-full mb-3">
                <ShieldCheck size={12} /> Verified
              </span>
            )}
            <h3 className="font-bold text-lg mb-1">{pro.specialty}</h3>
            <p className="text-sm text-brand-600 font-semibold mb-1">Starting at ₹{pro.starting_price ?? 0}</p>
            <div className="flex items-center justify-center gap-1 text-yellow-500 text-sm mb-3">
              <Star size={14} fill="currentColor" />
              <span className="font-bold">{pro.avg_rating.toFixed(1)}</span>
              <span className="text-slate-400 font-normal">  {pro.total_jobs} jobs</span>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full inline-block ${pro.is_available ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>
              {pro.is_available ? ' Available Now' : ' Currently Busy'}
            </span>
            {pro.bio && <p className="text-xs text-slate-500 mt-4 leading-relaxed">{pro.bio}</p>}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4"
              onClick={() => navigate(`/messages?professionalId=${pro.id}`)}
            >
              Ask Before Booking
            </Button>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-500 mb-2">Step 01</p>
            <h1 className="text-4xl font-bold tracking-tight mb-3">Select Date & Time</h1>
            <p className="text-slate-500 text-base">Describe your problem and pick a slot. The professional will confirm promptly.</p>
          </div>

          <Card className="p-8 space-y-6">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <FileText size={14} /> Describe the work needed *
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="E.g. My ceiling fan stopped working, needs to be checked and repaired or replaced..."
                className="w-full px-4 py-3 rounded-xl bg-brand-50 border border-brand-200/30 focus:ring-2 focus:ring-brand-500/20 outline-none text-sm resize-none"
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
                className="w-full px-4 py-3 rounded-xl bg-brand-50 border border-brand-200/30 focus:ring-2 focus:ring-brand-500/20 outline-none text-sm"
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
                className="w-full px-4 py-3 rounded-xl bg-brand-50 border border-brand-200/30 focus:ring-2 focus:ring-brand-500/20 outline-none text-sm"
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
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${timeSlot === slot ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-brand-200/40 text-slate-600 hover:border-brand-300'}`}
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
            <p className="text-sm text-red-500 font-medium bg-red-50 px-4 py-3 rounded-xl">{error}</p>
          )}
          <Button size="lg" className="w-full py-4" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Sending Request...' : 'Send Booking Request'}
          </Button>
        </div>
      </div>
    </div>
  );
};
