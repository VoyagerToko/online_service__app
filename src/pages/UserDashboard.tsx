import React, { useEffect, useState } from 'react';
import { Clock, MapPin, Star, ChevronRight, Wallet, History, Settings, Bell, ShieldCheck, FileText, Calendar, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { bookingsApi, reviewsApi, usersApi, type Booking } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

type ReviewDraft = {
  rating: number;
  comment: string;
};

type ReviewFeedback = {
  type: 'success' | 'error';
  message: string;
};

export const UserDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedPanel, setSelectedPanel] = useState<'active' | 'history' | 'addresses' | 'pros' | 'settings'>('active');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [openReviewBookingId, setOpenReviewBookingId] = useState<string | null>(null);
  const [reviewDraftByBooking, setReviewDraftByBooking] = useState<Record<string, ReviewDraft>>({});
  const [reviewFeedbackByBooking, setReviewFeedbackByBooking] = useState<Record<string, ReviewFeedback>>({});
  const [submittingReviewFor, setSubmittingReviewFor] = useState<string | null>(null);

  const loadBookings = React.useCallback(async () => {
    try {
      const data = await bookingsApi.list();
      setBookings(data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const activeBookings = bookings.filter((b) => !['completed', 'cancelled', 'rated', 'refunded'].includes(b.status));
  const historyBookings = bookings.filter((b) => ['completed', 'cancelled', 'rated', 'refunded'].includes(b.status));

  const sidebarItems = [
    { key: 'active', icon: <Clock size={20} />, label: 'Active Bookings' },
    { key: 'history', icon: <History size={20} />, label: 'Service History' },
    { key: 'addresses', icon: <MapPin size={20} />, label: 'Saved Addresses' },
    { key: 'pros', icon: <Star size={20} />, label: 'My Professionals' },
    { key: 'settings', icon: <Settings size={20} />, label: 'Settings' },
  ] as const;

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm('This will permanently deactivate your account. Do you want to continue?');
    if (!confirmed) return;

    setSettingsMessage(null);
    setIsDeletingAccount(true);
    try {
      await usersApi.deleteMe();
      logout();
      navigate('/');
    } catch (error: any) {
      setSettingsMessage(error?.message || 'Failed to delete account. Please try again.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const clearReviewFeedback = (bookingId: string) => {
    setReviewFeedbackByBooking((prev) => {
      if (!prev[bookingId]) return prev;
      const next = { ...prev };
      delete next[bookingId];
      return next;
    });
  };

  const updateReviewRating = (bookingId: string, rating: number) => {
    setReviewDraftByBooking((prev) => {
      const existing = prev[bookingId] ?? { rating: 0, comment: '' };
      return {
        ...prev,
        [bookingId]: {
          ...existing,
          rating,
        },
      };
    });
    clearReviewFeedback(bookingId);
  };

  const updateReviewComment = (bookingId: string, comment: string) => {
    setReviewDraftByBooking((prev) => {
      const existing = prev[bookingId] ?? { rating: 0, comment: '' };
      return {
        ...prev,
        [bookingId]: {
          ...existing,
          comment,
        },
      };
    });
    clearReviewFeedback(bookingId);
  };

  const openReviewForm = (bookingId: string) => {
    setOpenReviewBookingId(bookingId);
    setReviewDraftByBooking((prev) => {
      if (prev[bookingId]) return prev;
      return {
        ...prev,
        [bookingId]: {
          rating: 0,
          comment: '',
        },
      };
    });
    clearReviewFeedback(bookingId);
  };

  const submitReview = async (booking: Booking) => {
    const draft = reviewDraftByBooking[booking.id] ?? { rating: 0, comment: '' };
    if (draft.rating < 1 || draft.rating > 5) {
      setReviewFeedbackByBooking((prev) => ({
        ...prev,
        [booking.id]: {
          type: 'error',
          message: 'Please select a rating before submitting your review.',
        },
      }));
      return;
    }

    setSubmittingReviewFor(booking.id);
    clearReviewFeedback(booking.id);

    try {
      await reviewsApi.create(booking.id, draft.rating, draft.comment.trim() || undefined);
      setReviewFeedbackByBooking((prev) => ({
        ...prev,
        [booking.id]: {
          type: 'success',
          message: 'Thank you. Your review was submitted.',
        },
      }));
      setOpenReviewBookingId(null);
      await loadBookings();
    } catch (error: any) {
      setReviewFeedbackByBooking((prev) => ({
        ...prev,
        [booking.id]: {
          type: 'error',
          message: error?.message || 'Failed to submit review. Please try again.',
        },
      }));
    } finally {
      setSubmittingReviewFor(null);
    }
  };

  return (
    <div className="pt-32 pb-24 px-8 max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-8 text-center bg-white">
            <div className="relative inline-block mb-4">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-24 h-24 rounded-full border-4 border-brand-100 mx-auto" />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-brand-100 mx-auto bg-brand-500/10 flex items-center justify-center text-brand-500 text-3xl font-bold">
                  {user?.name?.charAt(0) ?? '?'}
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-4 border-white rounded-full"></div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-1">{user?.name}</h3>
            <p className="text-slate-500 text-sm mb-6">{user?.email}</p>
            <div className="bg-brand-50 rounded-xl p-4 flex justify-between items-center">
              <div className="text-left">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Wallet</p>
                <p className="text-lg font-bold text-slate-900">₹{user?.wallet_balance ?? 0}</p>
              </div>
              <Button size="sm" className="px-3" onClick={() => navigate('/services')}>Add</Button>
            </div>
          </Card>

          <div className="space-y-2">
            {sidebarItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setSelectedPanel(item.key)}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${
                  selectedPanel === item.key
                    ? 'bg-brand-50 text-brand-600 font-bold' 
                    : 'text-slate-600 hover:bg-slate-100'
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
          <div className="rounded-2xl border border-brand-200/30 bg-brand-50/60 p-6 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome back, {user?.name.split(' ')[0]}!</h1>
              <p className="text-slate-500">
                {selectedPanel === 'active' && `You have ${activeBookings.length} active service${activeBookings.length !== 1 ? 's' : ''} today.`}
                {selectedPanel === 'history' && `You have ${historyBookings.length} booking${historyBookings.length !== 1 ? 's' : ''} in history.`}
                {selectedPanel === 'addresses' && 'Manage and update your service addresses.'}
                {selectedPanel === 'pros' && 'Review your preferred professionals and ratings.'}
                {selectedPanel === 'settings' && 'Control notifications, profile, and account settings.'}
              </p>
            </div>
            <Button variant="outline" className="hidden md:flex items-center gap-2" onClick={() => navigate('/professionals')}>
              <Plus size={16} /> Book New Service
            </Button>
          </div>

          {/* Active Booking Tracking */}
          {selectedPanel === 'active' && activeBookings.length === 0 ? (
            <Card className="p-10 text-center text-slate-400">
              <p className="text-lg font-semibold mb-2">No active bookings</p>
              <p className="text-sm">Book a service to get started!</p>
            </Card>
          ) : selectedPanel === 'active' ? activeBookings.map((booking) => (
            <Card key={booking.id} className="p-0 overflow-hidden">
              <div className="bg-slate-50 p-6 border-b border-brand-200/30 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-600">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Booking #{booking.id.slice(0, 8)}</p>
                    <h4 className="text-xl font-bold">{booking.description ? booking.description.slice(0, 40) + (booking.description.length > 40 ? '...' : '') : 'Service Booking'}</h4>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    booking.status === 'requested' ? 'bg-yellow-100 text-yellow-600' :
                    booking.status === 'accepted' ? 'bg-blue-100 text-blue-600' :
                    booking.status === 'in_progress' ? 'bg-brand-100 text-brand-600' :
                    booking.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                    booking.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {booking.status.replace('_', ' ')}
                  </span>
                  <p className="text-sm text-slate-500 mt-1">{booking.scheduled_date} &bull; {booking.time_slot}</p>
                </div>
              </div>

              <div className="p-8">
                {/* Status-aware info */}
                <div className="flex flex-wrap gap-4 mb-6 text-sm text-slate-600">
                  {booking.address && (
                    <span className="flex items-center gap-1.5"><MapPin size={15} className="text-brand-500" /> {booking.address}</span>
                  )}
                  {booking.description && (
                    <span className="flex items-center gap-1.5"><FileText size={15} className="text-brand-500" /> {booking.description.slice(0, 60)}{booking.description.length > 60 ? '...' : ''}</span>
                  )}
                </div>

                {(() => {
                  const STATUS_STEPS = ['requested', 'accepted', 'in_progress', 'completed'];
                  const LABELS = ['Requested', 'Accepted', 'In Progress', 'Completed'];
                  const currentIdx = STATUS_STEPS.indexOf(booking.status);
                  const progressPct = currentIdx >= 0 ? Math.round((currentIdx / (STATUS_STEPS.length - 1)) * 100) : 0;
                  return (
                    <div className="flex justify-between mb-12 relative">
                      <div className="absolute top-5 left-0 w-full h-1 bg-slate-200 -z-10">
                        <div className="h-full bg-brand-500 transition-all duration-1000" style={{ width: `${progressPct}%` }}></div>
                      </div>
                      {LABELS.map((label, i) => {
                        const done = i < currentIdx || (i === currentIdx && booking.status === 'completed');
                        const active = i === currentIdx && booking.status !== 'completed';
                        return (
                          <div key={i} className="flex flex-col items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${
                              done ? 'bg-brand-500 border-brand-100 text-white' :
                              active ? 'bg-white border-brand-500 text-brand-500' :
                              'bg-white border-slate-200 text-slate-300'
                            }`}>
                              {done ? <ShieldCheck size={18} /> : (i + 1)}
                            </div>
                            <span className={`text-xs font-bold uppercase tracking-tight ${
                              done || active ? 'text-slate-900' : 'text-slate-400'
                            }`}>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white/80 p-6 rounded-3xl border border-brand-200/30">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-600 text-xl font-bold">
                      {booking.pro_id ? booking.pro_id.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase">Assigned Professional</p>
                      <h5 className="font-bold text-lg">{booking.pro_id ? `Pro #${booking.pro_id.slice(0,8)}` : 'Pending Assignment'}</h5>
                    </div>
                  </div>
                  {booking.pro_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/messages?professionalId=${booking.pro_id}&bookingId=${booking.id}`)}
                    >
                      Message Professional
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )) : null}

          {selectedPanel === 'history' && (
            <div className="space-y-4">
              {historyBookings.length === 0 ? (
                <Card className="p-10 text-center text-slate-400">
                  <p className="text-lg font-semibold mb-2">No history yet</p>
                  <p className="text-sm">Completed and cancelled bookings will appear here.</p>
                </Card>
              ) : (
                historyBookings.map((booking) => (
                  <Card key={booking.id} className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Booking #{booking.id.slice(0, 8)}</p>
                        <h4 className="text-lg font-bold">{booking.description || 'Service Booking'}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {booking.pro_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/messages?professionalId=${booking.pro_id}&bookingId=${booking.id}`)}
                          >
                            Message
                          </Button>
                        )}
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-600 uppercase">
                          {booking.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {booking.status === 'completed' && (
                      <div className="mt-4 border-t border-brand-200/30 pt-4 space-y-4">
                        {openReviewBookingId === booking.id ? (
                          <>
                            <div>
                              <p className="text-sm font-semibold text-slate-700">Rate your experience</p>
                              <div className="mt-2 flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((rating) => {
                                  const selectedRating = reviewDraftByBooking[booking.id]?.rating ?? 0;
                                  const active = selectedRating >= rating;
                                  return (
                                    <button
                                      key={rating}
                                      type="button"
                                      onClick={() => updateReviewRating(booking.id, rating)}
                                      className={`rounded-md p-1 transition-colors ${active ? 'text-yellow-500' : 'text-slate-300 hover:text-yellow-400'}`}
                                      aria-label={`Rate ${rating} star${rating > 1 ? 's' : ''}`}
                                    >
                                      <Star size={20} fill={active ? 'currentColor' : 'none'} />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Comment (Optional)</label>
                              <textarea
                                rows={3}
                                value={reviewDraftByBooking[booking.id]?.comment ?? ''}
                                onChange={(e) => updateReviewComment(booking.id, e.target.value)}
                                placeholder="Share what went well, response time, quality, and professionalism."
                                className="w-full rounded-xl border border-brand-200/40 bg-brand-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/20"
                              />
                            </div>

                            {reviewFeedbackByBooking[booking.id] && (
                              <p
                                className={`text-sm font-medium rounded-xl px-4 py-3 ${
                                  reviewFeedbackByBooking[booking.id].type === 'success'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-red-50 text-red-500'
                                }`}
                              >
                                {reviewFeedbackByBooking[booking.id].message}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-3">
                              <Button
                                size="sm"
                                isLoading={submittingReviewFor === booking.id}
                                onClick={() => void submitReview(booking)}
                              >
                                Submit Review
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setOpenReviewBookingId(null)}
                                disabled={submittingReviewFor === booking.id}
                              >
                                Cancel
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3">
                            <Button size="sm" variant="outline" onClick={() => openReviewForm(booking.id)}>
                              Leave Review
                            </Button>
                            {reviewFeedbackByBooking[booking.id] && (
                              <p
                                className={`text-sm font-medium ${
                                  reviewFeedbackByBooking[booking.id].type === 'success' ? 'text-emerald-600' : 'text-red-500'
                                }`}
                              >
                                {reviewFeedbackByBooking[booking.id].message}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {booking.status === 'rated' && (
                      <div className="mt-4 border-t border-brand-200/30 pt-4 flex items-center gap-2 text-sm font-semibold text-emerald-600">
                        <Star size={14} fill="currentColor" /> Review submitted
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          )}

          {selectedPanel === 'addresses' && (
            <Card className="p-8 text-slate-600">
              <h3 className="text-xl font-bold mb-2">Saved Addresses</h3>
              <p className="mb-4">Address management is available in the upcoming profile module.</p>
              <Button onClick={() => navigate('/services')}>Book With Current Address</Button>
            </Card>
          )}

          {selectedPanel === 'pros' && (
            <Card className="p-8 text-slate-600">
              <h3 className="text-xl font-bold mb-2">My Professionals</h3>
              <p className="mb-4">You can shortlist and revisit preferred professionals from this section.</p>
              <Button onClick={() => navigate('/professionals')}>Browse Professionals</Button>
            </Card>
          )}

          {selectedPanel === 'settings' && (
            <Card className="p-8 text-slate-600">
              <h3 className="text-xl font-bold mb-2">Account Settings</h3>
              <p className="mb-4">Manage your account access and security preferences.</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => window.location.href = 'mailto:support@servify.com'}>Contact Support</Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                >
                  {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
                </Button>
              </div>
              {settingsMessage && <p className="mt-4 text-sm text-red-500">{settingsMessage}</p>}
            </Card>
          )}

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            <Card onClick={() => navigate('/professionals')} className="p-6 flex items-center gap-4 bg-brand-50 border-brand-100 cursor-pointer hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center">
                <Plus size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-brand-600">Book a Professional</p>
                <p className="text-xs text-slate-500">Find verified experts near you</p>
              </div>
            </Card>
            <Card className="p-6 flex items-center gap-4 bg-blue-50 border-blue-100">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center">
                <Wallet size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-600">Refer & Earn</p>
                <p className="text-xs text-slate-500">Get ₹200 for each friend</p>
              </div>
            </Card>
            <Card className="p-6 flex items-center gap-4 bg-blue-50 border-blue-100">
              <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center">
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-600">Servify Plus</p>
                <p className="text-xs text-slate-500">Save 15% on all bookings</p>
              </div>
            </Card>
            <Card className="p-6 flex items-center gap-4 bg-amber-50 border-amber-100">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center">
                <Bell size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-600">Help Center</p>
                <p className="text-xs text-slate-500">24/7 Support available</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
