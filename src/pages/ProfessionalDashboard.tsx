import React, { useEffect, useState } from 'react';
import { Star, Briefcase, CheckCircle, Clock, MapPin, FileText, Calendar, ToggleLeft, ToggleRight, XCircle, IndianRupee, Phone, Mail, MessageCircle, Globe, ImagePlus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { bookingsApi, professionalsApi, usersApi, type Booking, type Professional } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

const STATUS_COLORS: Record<string, string> = {
  requested:   'bg-yellow-100 text-yellow-700',
  accepted:    'bg-blue-100 text-blue-700',
  in_progress: 'bg-brand-100 text-brand-700',
  completed:   'bg-emerald-100 text-emerald-700',
  cancelled:   'bg-red-100 text-red-700',
  rated:       'bg-purple-100 text-purple-700',
};

interface BookingCardProps {
  booking: Booking;
  actionLoading: string | null;
  onAccept?: () => void;
  onReject?: () => void;
  onStart?: () => void;
  onComplete?: () => void;
  onMessage?: () => void;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, actionLoading, onAccept, onReject, onStart, onComplete, onMessage }) => {
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
              <p className="text-sm text-slate-700 leading-snug">{booking.description}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-4 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5"><MapPin size={13} />{booking.address}</span>
            <span className="flex items-center gap-1.5"><Calendar size={13} />{String(booking.scheduled_date)}</span>
            <span className="flex items-center gap-1.5"><Clock size={13} />{booking.time_slot}</span>
          </div>
        </div>
        <div className="flex gap-2 items-start shrink-0 flex-wrap">
          {onMessage && (
            <Button variant="ghost" onClick={onMessage} className="text-sm px-4 py-2">
              <MessageCircle size={15} className="mr-1" /> Message
            </Button>
          )}
          {booking.status === 'requested' && (
            <>
              <Button variant="outline" onClick={onReject} disabled={isActing} className="text-red-500 border-red-200 hover:bg-red-50 text-sm px-4 py-2">
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [proProfile, setProProfile] = useState<Professional | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isTogglingAvail, setIsTogglingAvail] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [deletingPhotoUrl, setDeletingPhotoUrl] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [profileForm, setProfileForm] = useState({
    specialty: '',
    bio: '',
    experience_years: '0',
    starting_price: '0',
    public_phone: '',
    public_email: '',
    whatsapp_number: '',
    website_url: '',
    contact_address: '',
  });

  const syncFormFromProfile = (profile: Professional) => {
    setProfileForm({
      specialty: profile.specialty ?? '',
      bio: profile.bio ?? '',
      experience_years: String(profile.experience_years ?? 0),
      starting_price: String(profile.starting_price ?? 0),
      public_phone: profile.public_phone ?? '',
      public_email: profile.public_email ?? '',
      whatsapp_number: profile.whatsapp_number ?? '',
      website_url: profile.website_url ?? '',
      contact_address: profile.contact_address ?? '',
    });
  };

  useEffect(() => {
    bookingsApi.list().then(setBookings).catch(console.error);
    professionalsApi.list()
      .then(pros => {
        const mine = pros.find(p => p.user_id === user?.id);
        if (mine) {
          setProProfile(mine);
          setIsAvailable(mine.is_available);
          syncFormFromProfile(mine);
        }
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

  const saveProfile = async () => {
    setProfileMessage(null);
    setIsSavingProfile(true);
    try {
      const normalizedSpecialty = profileForm.specialty.trim() || proProfile?.specialty || 'General';
      const updated = await professionalsApi.updateMe({
        specialty: normalizedSpecialty,
        bio: profileForm.bio,
        experience_years: Number(profileForm.experience_years) || 0,
        starting_price: Number(profileForm.starting_price) || 0,
        public_phone: profileForm.public_phone,
        public_email: profileForm.public_email,
        whatsapp_number: profileForm.whatsapp_number,
        website_url: profileForm.website_url,
        contact_address: profileForm.contact_address,
      });
      setProProfile(updated);
      setIsAvailable(updated.is_available);
      syncFormFromProfile(updated);
      setProfileMessage('Profile updated successfully.');
    } catch (error: any) {
      setProfileMessage(error?.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const uploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProfileMessage(null);
    setIsUploadingPhoto(true);
    try {
      const updated = await professionalsApi.uploadPhoto(file);
      setProProfile(updated);
      syncFormFromProfile(updated);
      setProfileMessage('Photo uploaded successfully.');
    } catch (error: any) {
      setProfileMessage(error?.message || 'Failed to upload photo.');
    } finally {
      setIsUploadingPhoto(false);
      event.target.value = '';
    }
  };

  const removePhoto = async (photoUrl: string) => {
    setProfileMessage(null);
    setDeletingPhotoUrl(photoUrl);
    try {
      const updated = await professionalsApi.removePhoto(photoUrl);
      setProProfile(updated);
      syncFormFromProfile(updated);
      setProfileMessage('Photo removed successfully.');
    } catch (error: any) {
      setProfileMessage(error?.message || 'Failed to remove photo.');
    } finally {
      setDeletingPhotoUrl(null);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm('This will permanently deactivate your account. Do you want to continue?');
    if (!confirmed) return;

    setProfileMessage(null);
    setIsDeletingAccount(true);
    try {
      await usersApi.deleteMe();
      logout();
      navigate('/');
    } catch (error: any) {
      setProfileMessage(error?.message || 'Failed to delete account.');
    } finally {
      setIsDeletingAccount(false);
    }
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
    <div className="pt-32 pb-24 px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl border border-brand-200/30 bg-brand-50/60 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Professional Dashboard</h1>
          <p className="text-slate-500">
            {user?.name} &middot;{' '}
            <span className="text-brand-600 font-semibold">{proProfile?.specialty ?? '—'}</span>
          </p>
        </div>
        <button
          onClick={toggleAvailability}
          disabled={isTogglingAvail}
          className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 font-bold transition-all text-sm ${
            isAvailable
              ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
              : 'border-slate-300 bg-slate-50 text-slate-500'
          }`}
        >
          {isAvailable ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
          {isTogglingAvail ? 'Updating...' : isAvailable ? 'Available for Work' : 'Not Available'}
        </button>
      </div>

      <Card className="p-6 mb-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold">Public Profile Setup</h2>
            <p className="text-sm text-slate-500">Customers will see these details on your profile and booking pages.</p>
          </div>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-200 text-sm font-semibold text-brand-600 cursor-pointer hover:bg-brand-50 transition-colors">
            <ImagePlus size={16} />
            {isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}
            <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} disabled={isUploadingPhoto} />
          </label>
        </div>

        {!!proProfile?.photo_urls?.length && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {proProfile.photo_urls.map((url, idx) => (
              <div key={`${url}-${idx}`} className="relative group">
                <img
                  src={url}
                  alt={`Profile ${idx + 1}`}
                  className="w-full h-24 object-cover rounded-lg border border-brand-200/30"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  disabled={deletingPhotoUrl === url}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/95 border border-red-200 text-red-600 hover:bg-red-50 transition-colors inline-flex items-center justify-center disabled:opacity-60"
                  title="Remove photo"
                >
                  {deletingPhotoUrl === url ? '...' : <Trash2 size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Specialty</label>
            <input
              className="mt-1 w-full rounded-lg border border-brand-200/40 px-3 py-2 text-sm"
              value={profileForm.specialty}
              onChange={(e) => setProfileForm(prev => ({ ...prev, specialty: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Experience (Years)</label>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-lg border border-brand-200/40 px-3 py-2 text-sm"
              value={profileForm.experience_years}
              onChange={(e) => setProfileForm(prev => ({ ...prev, experience_years: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Bio</label>
            <textarea
              rows={4}
              className="mt-1 w-full rounded-lg border border-brand-200/40 px-3 py-2 text-sm"
              value={profileForm.bio}
              onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell customers about your expertise, certifications, and approach."
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <IndianRupee size={12} /> Starting Price
            </label>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-lg border border-brand-200/40 px-3 py-2 text-sm"
              value={profileForm.starting_price}
              onChange={(e) => setProfileForm(prev => ({ ...prev, starting_price: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Phone size={12} /> Public Phone
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-brand-200/40 px-3 py-2 text-sm"
              value={profileForm.public_phone}
              onChange={(e) => setProfileForm(prev => ({ ...prev, public_phone: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Mail size={12} /> Public Email
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-brand-200/40 px-3 py-2 text-sm"
              value={profileForm.public_email}
              onChange={(e) => setProfileForm(prev => ({ ...prev, public_email: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <MessageCircle size={12} /> WhatsApp
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-brand-200/40 px-3 py-2 text-sm"
              value={profileForm.whatsapp_number}
              onChange={(e) => setProfileForm(prev => ({ ...prev, whatsapp_number: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Globe size={12} /> Website
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-brand-200/40 px-3 py-2 text-sm"
              value={profileForm.website_url}
              onChange={(e) => setProfileForm(prev => ({ ...prev, website_url: e.target.value }))}
              placeholder="https://"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Contact Address</label>
            <input
              className="mt-1 w-full rounded-lg border border-brand-200/40 px-3 py-2 text-sm"
              value={profileForm.contact_address}
              onChange={(e) => setProfileForm(prev => ({ ...prev, contact_address: e.target.value }))}
            />
          </div>
        </div>

        {profileMessage && <p className="mt-4 text-sm text-brand-600 font-medium">{profileMessage}</p>}

        <div className="mt-5 flex flex-wrap justify-between gap-3">
          <Button variant="danger" onClick={handleDeleteAccount} disabled={isDeletingAccount}>
            {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
          </Button>
          <Button onClick={saveProfile} disabled={isSavingProfile}>
            {isSavingProfile ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((s, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl ${s.color} text-white flex items-center justify-center shadow-lg`}>{s.icon}</div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="space-y-12">
        {/* Pending Requests */}
        <section>
          <h2 className="text-xl font-bold mb-5 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center text-xs font-bold">{pending.length}</span>
            New Requests
          </h2>
          {pending.length === 0
            ? <Card className="p-8 text-center text-slate-400">No new booking requests yet.</Card>
            : <div className="space-y-4">{pending.map(b => (
                <BookingCard
                  key={b.id} booking={b} actionLoading={actionLoading}
                  onAccept={() => doAction(b.id, b.id, () => bookingsApi.accept(b.id))}
                  onReject={() => doAction(b.id, `${b.id}_r`, () => bookingsApi.reject(b.id))}
                  onMessage={() => navigate(`/messages?bookingId=${b.id}&userId=${b.user_id}`)}
                />
              ))}</div>
          }
        </section>

        {/* Active Jobs */}
        <section>
          <h2 className="text-xl font-bold mb-5 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{active.length}</span>
            Active Jobs
          </h2>
          {active.length === 0
            ? <Card className="p-8 text-center text-slate-400">No active jobs right now.</Card>
            : <div className="space-y-4">{active.map(b => (
                <BookingCard
                  key={b.id} booking={b} actionLoading={actionLoading}
                  onStart={() => doAction(b.id, `${b.id}_s`, () => bookingsApi.markInProgress(b.id))}
                  onComplete={() => doAction(b.id, `${b.id}_c`, () => bookingsApi.markComplete(b.id))}
                  onMessage={() => navigate(`/messages?bookingId=${b.id}&userId=${b.user_id}`)}
                />
              ))}</div>
          }
        </section>

        {/* Job History */}
        {history.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-5">Job History</h2>
            <div className="space-y-4">{history.map(b => (
              <BookingCard
                key={b.id}
                booking={b}
                actionLoading={actionLoading}
                onMessage={() => navigate(`/messages?bookingId=${b.id}&userId=${b.user_id}`)}
              />
            ))}</div>
          </section>
        )}
      </div>
    </div>
  );
};
