import React, { useEffect, useState } from 'react';
import { Star, Briefcase, CheckCircle, Clock, MapPin, FileText, Calendar, ToggleLeft, ToggleRight, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { bookingsApi, professionalsApi, type Booking, type Professional } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const STATUS_COLORS: Record<string, string> = {
  requested:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  accepted:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
  completed:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  rated:       'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

interface BookingCardProps {
  booking: Booking;
  actionLoading: string | null;
  onAccept?: () => void;
  onReject?: () => void;
  onStart?: () => void;
  onComplete?: () => void;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, actionLoading, onAccept, onReject, onStart, onComplete }) => {
  const isActing = [booking.id, `${booking.id}_r`, `${booking.id}_s`, `${booking.id}_c`].includes(actionLoading ?? '');
  return (
    <Card className="p-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-mono text-slate-400">#{booking.id.slice(0, 8)}</span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide ${STATUS_COLORS[booking.status] ?? 'bg-slate-100 text-slate-600'}`}>
              {booking.status.replace('_', ' ')}
            </span>
          </div>
          {booking.description && (
            <div className="flex items-start gap-2">
              <FileText size={15} className="text-slate-400 mt-0.5 shrink-0" />
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{booking.description}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1.5"><MapPin size={13} />{booking.address}</span>
            <span className="flex items-center gap-1.5"><Calendar size={13} />{String(booking.scheduled_date)}</span>
            <span className="flex items-center gap-1.5"><Clock size={13} />{booking.time_slot}</span>
          </div>
        </div>
        <div className="flex gap-2 items-start flex-shrink-0 flex-wrap">
          {booking.status === 'requested' && (
            <>
              <Button variant="outline" onClick={onReject} disabled={isActing} className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm px-4 py-2">
                <XCircle size={15} className="mr-1" /> Reject
              </Button>
              <Button onClick={onAccept} disabled={isActing} className="text-sm px-4 py-2">
                {actionLoading === booking.id ? 'Accepting...' : <><CheckCircle size={15} className="mr-1" /> Accept</>}
              </Button>
            </>
          )}
          {booking.status === 'accepted' && (
            <Button onClick={onStart} disabled={isActing} className="text-sm px-4 py-2">
              {actionLoading === `${booking.id}_s` ? '...' : 'Start Work'}
            </Button>
          )}
          {booking.status === 'in_progress' && (
            <Button onClick={onComplete} disabled={isActing} className="bg-emerald-500 hover:bg-emerald-600 text-sm px-4 py-2">
              {actionLoading === `${booking.id}_c` ? '...' : 'Mark Complete'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export const ProfessionalDashboard: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [proProfile, setProProfile] = useState<Professional | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isTogglingAvail, setIsTogglingAvail] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    bookingsApi.list().then(setBookings).catch(console.error);
    professionalsApi.list()
      .then(pros => {
        const mine = pros.find(p => p.user_id === user?.id);
        if (mine) { setProProfile(mine); setIsAvailable(mine.is_available); }
      })
      .catch(console.error);
  }, [user?.id]);

  const toggleAvailability = async () => {
    setIsTogglingAvail(true);
    try {
      const updated = await professionalsApi.updateMe({ is_available: !isAvailable });
      setIsAvailable(updated.is_available);
      setProProfile(updated);
    } catch (e) { console.error(e); }
    finally { setIsTogglingAvail(false); }
  };

  const doAction = async (id: string, loadingKey: string, fn: () => Promise<Booking>) => {
    setActionLoading(loadingKey);
    try { const b = await fn(); setBookings(prev => prev.map(x => x.id === id ? b : x)); }
    catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  const pending  = bookings.filter(b => b.status === 'requested');
  const active   = bookings.filter(b => ['accepted', 'in_progress'].includes(b.status));
  const history  = bookings.filter(b => ['completed', 'cancelled', 'rated', 'refunded'].includes(b.status));

  const stats = [
    { label: 'Total Jobs',        value: proProfile?.total_jobs ?? 0,              icon: <CheckCircle size={20} />, color: 'bg-blue-500' },
    { label: 'Avg Rating',        value: (proProfile?.avg_rating ?? 0).toFixed(1), icon: <Star size={20} />,        color: 'bg-yellow-500' },
    { label: 'Pending Requests',  value: pending.length,                            icon: <Clock size={20} />,       color: 'bg-brand-500' },
    { label: 'Active Jobs',       value: active.length,                             icon: <Briefcase size={20} />,   color: 'bg-emerald-500' },
  ];

  return (
    <div className="pt-28 pb-20 px-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-display font-bold dark:text-white mb-1">Professional Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {user?.name} Â·{' '}
            <span className="text-brand-600 font-semibold">{proProfile?.specialty ?? 'â€”'}</span>
          </p>
        </div>
        <button
          onClick={toggleAvailability}
          disabled={isTogglingAvail}
          className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 font-bold transition-all text-sm ${
            isAvailable
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'
              : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500'
          }`}
        >
          {isAvailable ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
          {isTogglingAvail ? 'Updating...' : isAvailable ? 'Available for Work' : 'Not Available'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((s, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl ${s.color} text-white flex items-center justify-center shadow-lg`}>{s.icon}</div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl font-bold dark:text-white">{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="space-y-12">
        {/* Pending Requests */}
        <section>
          <h2 className="text-xl font-bold dark:text-white mb-5 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 flex items-center justify-center text-xs font-bold">{pending.length}</span>
            New Requests
          </h2>
          {pending.length === 0
            ? <Card className="p-8 text-center text-slate-400">No new booking requests yet.</Card>
            : <div className="space-y-4">{pending.map(b => (
                <BookingCard
                  key={b.id} booking={b} actionLoading={actionLoading}
                  onAccept={() => doAction(b.id, b.id, () => bookingsApi.accept(b.id))}
                  onReject={() => doAction(b.id, `${b.id}_r`, () => bookingsApi.reject(b.id))}
                />
              ))}</div>
          }
        </section>

        {/* Active Jobs */}
        <section>
          <h2 className="text-xl font-bold dark:text-white mb-5 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center text-xs font-bold">{active.length}</span>
            Active Jobs
          </h2>
          {active.length === 0
            ? <Card className="p-8 text-center text-slate-400">No active jobs right now.</Card>
            : <div className="space-y-4">{active.map(b => (
                <BookingCard
                  key={b.id} booking={b} actionLoading={actionLoading}
                  onStart={() => doAction(b.id, `${b.id}_s`, () => bookingsApi.markInProgress(b.id))}
                  onComplete={() => doAction(b.id, `${b.id}_c`, () => bookingsApi.markComplete(b.id))}
                />
              ))}</div>
          }
        </section>

        {/* Job History */}
        {history.length > 0 && (
          <section>
            <h2 className="text-xl font-bold dark:text-white mb-5">Job History</h2>
            <div className="space-y-4">{history.map(b => <BookingCard key={b.id} booking={b} actionLoading={actionLoading} />)}</div>
          </section>
        )}
      </div>
    </div>
  );
};
