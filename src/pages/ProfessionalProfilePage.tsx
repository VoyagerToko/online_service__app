import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, MapPin, ShieldCheck, Star, Phone, Mail, MessageCircle, Globe, IndianRupee } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { professionalsApi, reviewsApi, type Professional, type Review } from '../api/client';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';

export const ProfessionalProfilePage: React.FC = () => {
  const { proId } = useParams<{ proId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [professional, setProfessional] = useState<Professional | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!proId) return;

    Promise.all([
      professionalsApi.get(proId),
      reviewsApi.getForProfessional(proId),
    ])
      .then(([pro, proReviews]) => {
        setProfessional(pro);
        setReviews(proReviews);
      })
      .catch(() => {
        setProfessional(null);
        setReviews([]);
      })
      .finally(() => setIsLoading(false));
  }, [proId]);

  if (isLoading) {
    return <div className="pt-32 pb-24 px-8 text-center text-slate-400">Loading professional profile...</div>;
  }

  if (!professional) {
    return <div className="pt-32 pb-24 px-8 text-center text-slate-400">Professional not found.</div>;
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
        <Card className="p-8 lg:col-span-4 h-fit lg:sticky lg:top-32">
          <div className="text-center">
            {professional.avatar_url ? (
              <img
                src={professional.avatar_url}
                alt={professional.name ?? professional.specialty}
                className="mx-auto w-28 h-28 rounded-full object-cover border-4 border-brand-100 mb-5"
              />
            ) : (
              <div className="mx-auto w-28 h-28 rounded-full bg-brand-100 border-4 border-brand-50 text-brand-600 text-3xl font-bold flex items-center justify-center mb-5">
                {(professional.name ?? professional.specialty).charAt(0).toUpperCase()}
              </div>
            )}

            <h1 className="text-3xl font-bold tracking-tight">{professional.name ?? 'Professional'}</h1>
            <p className="text-brand-500 font-semibold">{professional.specialty}</p>

            <div className="mt-4 flex items-center justify-center gap-2 text-yellow-500">
              <Star size={16} fill="currentColor" />
              <span className="font-bold">{professional.avg_rating.toFixed(1)}</span>
              <span className="text-slate-500 text-sm">({professional.total_jobs}+ jobs)</span>
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold">
              {professional.is_kyc_verified && (
                <span className="inline-flex items-center gap-1 text-brand-600 bg-brand-50 px-3 py-1 rounded-full">
                  <ShieldCheck size={12} /> Verified
                </span>
              )}
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${professional.is_available ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>
                {professional.is_available ? 'Available' : 'Busy'}
              </span>
            </div>

            <div className="mt-6 space-y-2 text-sm text-slate-500">
              <p className="flex items-center justify-center gap-2">
                <MapPin size={14} /> Service-ready professional
              </p>
              <p>{professional.experience_years} years experience</p>
              <p className="flex items-center justify-center gap-1 text-brand-600 font-semibold">
                <IndianRupee size={14} /> Starting at ₹{professional.starting_price ?? 0}
              </p>
            </div>

            <Button
              className="w-full mt-7"
              onClick={() => navigate(`/book/${professional.id}`)}
              disabled={!professional.is_available}
            >
              {professional.is_available ? 'Book This Professional' : 'Currently Unavailable'}
            </Button>
            {user?.role === 'user' && (
              <Button
                variant="outline"
                className="w-full mt-3"
                onClick={() => navigate(`/messages?professionalId=${professional.id}`)}
              >
                Message Professional
              </Button>
            )}
          </div>
        </Card>

        <div className="lg:col-span-8 space-y-8">
          <Card className="p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-500 mb-3">The Philosophy</p>
            <h2 className="text-3xl font-bold tracking-tight mb-4">Curating outcomes through precision and craft.</h2>
            <p className="text-slate-600 leading-relaxed">
              {professional.bio?.trim() || 'This professional has not added a bio yet, but is verified and available through Servify.'}
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-5">Contact Details</h2>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {professional.public_phone && (
                <p className="inline-flex items-center gap-2 text-slate-700 bg-brand-50 px-3 py-2 rounded-lg">
                  <Phone size={14} className="text-brand-600" /> {professional.public_phone}
                </p>
              )}
              {professional.public_email && (
                <p className="inline-flex items-center gap-2 text-slate-700 bg-brand-50 px-3 py-2 rounded-lg">
                  <Mail size={14} className="text-brand-600" /> {professional.public_email}
                </p>
              )}
              {professional.whatsapp_number && (
                <p className="inline-flex items-center gap-2 text-slate-700 bg-brand-50 px-3 py-2 rounded-lg">
                  <MessageCircle size={14} className="text-brand-600" /> {professional.whatsapp_number}
                </p>
              )}
              {professional.website_url && (
                <a
                  href={professional.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-brand-600 bg-brand-50 px-3 py-2 rounded-lg hover:underline"
                >
                  <Globe size={14} /> Visit Website
                </a>
              )}
            </div>
            {professional.contact_address && (
              <p className="mt-4 text-sm text-slate-600 bg-slate-50 rounded-lg px-4 py-3">
                {professional.contact_address}
              </p>
            )}
            {!professional.public_phone && !professional.public_email && !professional.whatsapp_number && !professional.website_url && !professional.contact_address && (
              <p className="text-slate-500 text-sm">This professional has not shared public contact information yet.</p>
            )}
          </Card>

          {!!professional.photo_urls?.length && (
            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-5">Work Photos</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {professional.photo_urls.map((url, index) => (
                  <img
                    key={`${url}-${index}`}
                    src={url}
                    alt={`Work sample ${index + 1}`}
                    className="w-full h-36 object-cover rounded-xl border border-brand-200/30"
                    referrerPolicy="no-referrer"
                  />
                ))}
              </div>
            </Card>
          )}

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-5">Recent Reviews</h2>
            {reviews.length === 0 ? (
              <p className="text-slate-500 text-sm">No reviews yet for this professional.</p>
            ) : (
              <div className="space-y-4">
                {reviews.slice(0, 8).map((review) => (
                  <div
                    key={review.id}
                    className="rounded-xl border border-brand-200/30 bg-brand-50/30 p-5"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">Verified Booking</span>
                      <span className="inline-flex items-center gap-1 text-yellow-500 text-sm font-bold">
                        <Star size={14} fill="currentColor" /> {review.rating.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      {review.comment?.trim() || 'Great service and clear communication.'}
                    </p>
                    <p className="mt-2 text-xs text-emerald-600 font-semibold inline-flex items-center gap-1">
                      <CheckCircle2 size={13} /> Verified Review
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
